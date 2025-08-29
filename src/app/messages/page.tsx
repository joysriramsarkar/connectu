
"use client"

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { User, Conversation, Message } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Send, ArrowLeft, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { db, auth } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
  doc,
  getDoc
} from "firebase/firestore";
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';

async function getUserProfile(userId: string): Promise<User | null> {
  if (!userId) return null;
  const userDocRef = doc(db, "users", userId);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() } as User;
  }
  return null;
}

export default function MessagesPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    const q = query(collection(db, "conversations"), where("participants", "array-contains", currentUser.uid));
    
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const convs: Conversation[] = [];
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        const otherParticipantId = data.participants.find((p: string) => p !== currentUser.uid);
        const participant = await getUserProfile(otherParticipantId);
        if(participant){
          convs.push({
            id: doc.id,
            participant,
            ...data
          } as Conversation);
        }
      }
      setConversations(convs.sort((a,b) => b.lastMessageTimestamp?.toMillis() - a.lastMessageTimestamp?.toMillis()));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (selectedConversation) {
      setMsgLoading(true);
      const q = query(collection(db, "conversations", selectedConversation.id, "messages"), orderBy("timestamp", "asc"));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const msgs: Message[] = [];
        querySnapshot.forEach((doc) => {
          msgs.push({id: doc.id, ...doc.data()} as Message);
        });
        setMessages(msgs);
        setMsgLoading(false);
      });
      return () => unsubscribe();
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !selectedConversation || sending) return;

    setSending(true);
    const content = newMessage;
    setNewMessage("");

    await addDoc(collection(db, "conversations", selectedConversation.id, "messages"), {
        senderId: currentUser.uid,
        content: content,
        timestamp: serverTimestamp()
    });
    setSending(false);
  };
  
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp?.toDate) return '';
    return format(timestamp.toDate(), 'p', { locale: bn });
  }
  
  const formatConvTimestamp = (timestamp: any) => {
     if (!timestamp?.toDate) return '';
     return format(timestamp.toDate(), 'P', { locale: bn });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 h-screen max-h-screen">
      <div className={cn("border-r border-border flex flex-col", selectedConversation && "hidden md:flex")}>
        <div className="p-4 border-b border-border">
          <h1 className="text-2xl font-bold">বার্তা</h1>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="অনুসন্ধান করুন" className="pl-10" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div> :
          conversations.map(conv => (
            <button key={conv.id} onClick={() => setSelectedConversation(conv)} className={cn("flex items-center gap-3 w-full text-left p-4 border-b border-border hover:bg-accent/50", selectedConversation?.id === conv.id && "bg-accent")}>
              <Avatar>
                <AvatarImage src={conv.participant.avatar} alt={conv.participant.name} />
                <AvatarFallback>{conv.participant.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center">
                  <p className="font-semibold truncate">{conv.participant.name}</p>
                  <p className="text-xs text-muted-foreground">{formatConvTimestamp(conv.lastMessageTimestamp)}</p>
                </div>
                <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={cn("md:col-span-2 xl:col-span-3 flex flex-col h-screen", !selectedConversation && "hidden md:flex")}>
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-border flex items-center gap-4">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConversation(null)}>
                <ArrowLeft />
              </Button>
              <Link href={`/profile/${selectedConversation.participant.id}`}>
                <Avatar>
                  <AvatarImage src={selectedConversation.participant.avatar} alt={selectedConversation.participant.name} />
                  <AvatarFallback>{selectedConversation.participant.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
              </Link>
              <div>
                <p className="font-bold">{selectedConversation.participant.name}</p>
                <p className="text-sm text-muted-foreground">@{selectedConversation.participant.handle}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
             {msgLoading ? <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div> :
              messages.map(msg => (
                <div key={msg.id} className={cn("flex gap-3", msg.senderId === currentUser?.uid ? 'justify-end' : 'justify-start')}>
                  {msg.senderId !== currentUser?.uid && 
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={selectedConversation.participant.avatar} />
                      <AvatarFallback>{selectedConversation.participant.name.substring(0,2)}</AvatarFallback>
                    </Avatar>
                  }
                   <div className={cn("max-w-xs lg:max-w-md p-3 rounded-lg", msg.senderId === currentUser?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                    <p>{msg.content}</p>
                    <p className={cn("text-xs opacity-70 mt-1",  msg.senderId === currentUser?.uid ? 'text-right' : 'text-left')}>{formatTimestamp(msg.timestamp)}</p>
                   </div>
                </div>
              ))}
               <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
              <div className="relative">
                <Input placeholder="একটি বার্তা লিখুন..." className="pr-12 h-12" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} disabled={sending} />
                <Button size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9" type="submit" disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send />}
                </Button>
              </div>
            </form>
          </>
        ) : (
           <div className="flex-col items-center justify-center h-full text-center hidden md:flex">
             <MessageSquare className="w-24 h-24 text-muted-foreground/50"/>
             <h2 className="text-2xl font-bold mt-4">আপনার বার্তা</h2>
             <p className="text-muted-foreground">একটি কথোপকথন নির্বাচন করে কথা বলা শুরু করুন।</p>
           </div>
        )}
      </div>
    </div>
  );
}
