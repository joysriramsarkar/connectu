"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Conversation, Message } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Send, ArrowLeft, MessageSquare, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { useI18n } from "@/context/i18n";
import { useAuth } from "@/context/auth";
import { useToast } from "@/hooks/use-toast";

function MessagesContent() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { firebaseUser, idToken, loading: authLoading } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Read URL query params (e.g. ?userId=... from Profile message button)
  const targetUserId = searchParams.get("userId");
  const targetName = searchParams.get("name");
  const targetHandle = searchParams.get("handle");
  const targetAvatar = searchParams.get("avatar");

  // 1. Fetch conversations from PostgreSQL
  const fetchConversations = useCallback(async () => {
    if (!idToken) return;
    try {
      const res = await fetch("/api/v1/conversations", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser) {
      router.push("/login");
      return;
    }
    fetchConversations();
  }, [authLoading, firebaseUser, router, fetchConversations]);

  // 2. Instant 0ms Chat Opening via targetUserId URL param
  useEffect(() => {
    if (!firebaseUser || !targetUserId) return;

    const deterministicConvId = [firebaseUser.uid, targetUserId].sort((a, b) => a.localeCompare(b)).join("_");

    // Immediately open conversation in UI (0ms delay!)
    const instantConv: Conversation = {
      id: deterministicConvId,
      lastMessage: "",
      lastMessageTimestamp: new Date().toISOString(),
      participant: {
        id: targetUserId,
        name: targetName ? decodeURIComponent(targetName) : "ব্যবহারকারী",
        handle: targetHandle ? decodeURIComponent(targetHandle) : "user",
        avatar: targetAvatar ? decodeURIComponent(targetAvatar) : "",
        coverPhoto: "",
        bio: "",
        followers: 0,
        following: 0,
      },
    };

    setSelectedConversation(instantConv);

    // Sync in background to guarantee DB records
    if (idToken) {
      fetch("/api/v1/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ recipientId: targetUserId }),
      }).catch((err) => console.error("Background conv sync:", err));
    }

    // Auto-focus input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [firebaseUser, targetUserId, targetName, targetHandle, targetAvatar, idToken]);

  // 3. Fetch messages for selected conversation
  const fetchMessages = useCallback(async (convId: string, isInitial = false) => {
    if (!idToken) return;
    if (isInitial) setMsgLoading(true);
    try {
      const res = await fetch(`/api/v1/conversations/${convId}/messages`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      if (isInitial) setMsgLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id, true);
      // Auto-refresh messages every 3.5 seconds
      const interval = setInterval(() => {
        fetchMessages(selectedConversation.id, false);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [selectedConversation, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 4. Send message with instant optimistic UI & non-blocking input
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || !firebaseUser || !selectedConversation || !idToken) return;

    // 1. Immediately clear input & keep focus
    setNewMessage("");
    inputRef.current?.focus();

    // 2. Instant optimistic UI message in the chat
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      conversationId: selectedConversation.id,
      senderId: firebaseUser.uid,
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    // 3. Immediately update conversation snippet in sidebar
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === selectedConversation.id);
      if (exists) {
        return prev.map((c) =>
          c.id === selectedConversation.id
            ? { ...c, lastMessage: content, lastMessageTimestamp: optimisticMsg.timestamp }
            : c
        );
      } else {
        return [
          {
            ...selectedConversation,
            lastMessage: content,
            lastMessageTimestamp: optimisticMsg.timestamp,
          },
          ...prev,
        ];
      }
    });

    // 4. Dispatch to server in background
    try {
      const res = await fetch(`/api/v1/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to send message");
      }

      const sentMsg = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === tempId ? sentMsg : m)));
    } catch (error: any) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast({
        variant: "destructive",
        title: t("error_title") || "ত্রুটি",
        description: error?.message || "মেসেজ পাঠানো সম্ভব হয়নি।",
      });
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return format(date, 'p', { locale: locale === 'bn' ? bn : enUS });
  };

  const formatConvTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return formatDistanceToNow(date, { addSuffix: true, locale: locale === 'bn' ? bn : enUS });
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      conv.participant?.name?.toLowerCase().includes(term) ||
      conv.participant?.handle?.toLowerCase().includes(term)
    );
  });

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">বার্তা লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen max-h-screen overflow-hidden">
      {/* Ambient background glow orbs */}
      <div className="fixed -top-32 -left-32 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-float-orb" />
      <div className="fixed -bottom-32 -right-32 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none animate-float-orb" style={{ animationDelay: '3s' }} />

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 h-full">
        {/* Conversations Sidebar */}
        <div className={cn(
          "glass-card border-r border-white/10 flex flex-col h-full bg-background/50 backdrop-blur-2xl",
          selectedConversation && "hidden md:flex"
        )}>
          <div className="p-4 border-b border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span>{t('messages') || "বার্তা"}</span>
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold border border-primary/20">
                লাইভ চ্যাট
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('search_placeholder') || "কথোপকথন খুঁজুন..."}
                className="pl-9 h-9 rounded-full bg-white/5 border-white/10 text-xs focus-visible:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {loading ? (
              <div className="flex flex-col justify-center items-center h-48 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">লোড হচ্ছে...</p>
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const isSelected = selectedConversation?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={cn(
                      "flex items-center gap-3 w-full text-left p-3.5 transition-all duration-200 group relative",
                      isSelected
                        ? "bg-primary/15 border-l-2 border-primary"
                        : "hover:bg-white/5"
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-11 w-11 ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all">
                        <AvatarImage src={conv.participant?.avatar} alt={conv.participant?.name} />
                        <AvatarFallback className="font-semibold bg-primary/15 text-primary text-xs">
                          {conv.participant?.name?.substring(0, 2).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                    </div>
                    <div className="flex-1 overflow-hidden min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <p className="font-semibold text-sm truncate text-foreground/95">
                          {conv.participant?.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex-shrink-0">
                          {formatConvTimestamp(conv.lastMessageTimestamp)}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {conv.lastMessage || "নতুন বার্তা পাঠান..."}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-16 text-muted-foreground p-6 space-y-2">
                <MessageSquare className="h-8 w-8 mx-auto opacity-30" />
                <p className="text-xs">কোনো বার্তা পাওয়া যায়নি</p>
              </div>
            )}
          </div>
        </div>

        {/* Message Chat Area */}
        <div className={cn(
          "md:col-span-2 xl:col-span-3 flex flex-col h-screen max-h-screen bg-background/30 backdrop-blur-xl",
          !selectedConversation && "hidden md:flex"
        )}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between bg-black/20 backdrop-blur-2xl">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-8 w-8 rounded-full hover:bg-white/10"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Link href={`/profile/${selectedConversation.participant.id}`} className="relative group">
                    <Avatar className="h-10 w-10 ring-2 ring-primary/30 group-hover:ring-primary/60 transition-all">
                      <AvatarImage src={selectedConversation.participant.avatar} alt={selectedConversation.participant.name} />
                      <AvatarFallback className="font-semibold bg-primary/15 text-primary text-xs">
                        {selectedConversation.participant.name?.substring(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                  </Link>
                  <div>
                    <Link
                      href={`/profile/${selectedConversation.participant.id}`}
                      className="font-bold text-sm sm:text-base hover:text-primary transition-colors inline-block"
                    >
                      {selectedConversation.participant.name}
                    </Link>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>@{selectedConversation.participant.handle}</span>
                      <span>·</span>
                      <span className="text-emerald-500 font-medium">সক্রিয়</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-muted-foreground">
                  <span className="text-[11px] hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    <span>এন্ড-টু-এন্ড সুরক্ষিত</span>
                  </span>
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
                {msgLoading ? (
                  <div className="flex flex-col justify-center items-center h-full gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">বার্তা লোড হচ্ছে...</p>
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((msg, idx) => {
                    const isMine = msg.senderId === firebaseUser?.uid;
                    return (
                      <div
                        key={msg.id || idx}
                        className={cn("flex gap-2.5 animate-slide-up-spring", isMine ? "justify-end" : "justify-start")}
                      >
                        {!isMine && (
                          <Avatar className="w-7 h-7 flex-shrink-0 mt-1 ring-1 ring-white/10">
                            <AvatarImage src={selectedConversation.participant.avatar} />
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {selectedConversation.participant.name?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={cn(
                          "max-w-xs sm:max-w-md p-3.5 rounded-2xl shadow-sm space-y-1 transition-all",
                          isMine
                            ? "bg-gradient-to-r from-primary to-accent text-white rounded-br-xs shadow-primary/20"
                            : "glass-card border border-white/10 text-foreground rounded-bl-xs bg-white/5"
                        )}>
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.content}</p>
                          <p className={cn("text-[9px] opacity-70", isMine ? "text-right text-white/80" : "text-left text-muted-foreground")}>
                            {formatTimestamp(msg.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center space-y-3 text-muted-foreground">
                    <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <p className="font-semibold text-foreground text-sm">কথোপকথন শুরু করতে প্রস্তুত!</p>
                    <p className="text-xs max-w-xs">
                      {selectedConversation.participant.name}-কে আপনার প্রথম বার্তাটি পাঠিয়ে যুক্ত থাকুন।
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-white/10 bg-black/20 backdrop-blur-2xl">
                <div className="relative flex items-center gap-2 max-w-4xl mx-auto">
                  <Input
                    ref={inputRef}
                    placeholder={t('type_a_message') || "একটি বার্তা লিখুন..."}
                    className="pr-12 h-11 rounded-full bg-white/5 border-white/10 focus-visible:ring-primary text-sm placeholder:text-muted-foreground/60 shadow-inner"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <Button
                    size="icon"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-95 shadow-md shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                    type="submit"
                    disabled={!newMessage.trim()}
                  >
                    <Send className="h-4 w-4 text-white" />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-col items-center justify-center h-full text-center hidden md:flex p-6 space-y-4">
              <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-lg shadow-primary/10">
                <MessageSquare className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-foreground">{t('your_messages') || "আপনার বার্তাগুলো"}</h2>
                <p className="text-xs text-muted-foreground max-w-sm">
                  {t('select_conversation_to_chat') || "কথোপকথন শুরু করতে তালিকা থেকে একটি নির্বাচন করুন অথবা কারো প্রোফাইলে গিয়ে মেসেজ পাঠান।"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">বার্তা পেজ লোড হচ্ছে...</p>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
