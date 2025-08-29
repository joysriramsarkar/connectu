
"use client"

import { useState } from "react";
import Link from "next/link";
import { mockConversations, User } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Send, ArrowLeft, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<typeof mockConversations[0] | null>(null);

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
          {mockConversations.map(conv => (
            <button key={conv.id} onClick={() => setSelectedConversation(conv)} className={cn("flex items-center gap-3 w-full text-left p-4 border-b border-border hover:bg-accent/50", selectedConversation?.id === conv.id && "bg-accent")}>
              <Avatar>
                <AvatarImage src={conv.participant.avatar} alt={conv.participant.name} />
                <AvatarFallback>{conv.participant.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center">
                  <p className="font-semibold truncate">{conv.participant.name}</p>
                  <p className="text-xs text-muted-foreground">{conv.lastMessageTimestamp}</p>
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
              {selectedConversation.messages.map(msg => (
                <div key={msg.id} className={cn("flex gap-3", msg.sender.id === 'user-1' ? 'justify-end' : 'justify-start')}>
                  {msg.sender.id !== 'user-1' && 
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={msg.sender.avatar} />
                      <AvatarFallback>{msg.sender.name.substring(0,2)}</AvatarFallback>
                    </Avatar>
                  }
                   <div className={cn("max-w-xs lg:max-w-md p-3 rounded-lg", msg.sender.id === 'user-1' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                    <p>{msg.content}</p>
                    <p className={cn("text-xs opacity-70 mt-1",  msg.sender.id === 'user-1' ? 'text-right' : 'text-left')}>{msg.timestamp}</p>
                   </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border">
              <div className="relative">
                <Input placeholder="একটি বার্তা লিখুন..." className="pr-12 h-12" />
                <Button size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9">
                  <Send />
                </Button>
              </div>
            </div>
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
