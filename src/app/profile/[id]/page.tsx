
"use client";

import { useEffect, useState } from 'react';
import { notFound } from "next/navigation";
import Image from "next/image";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Post, User } from "@/lib/data";
import { mockPosts } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/post-card";
import { User as UserIcon, Calendar, Loader2 } from "lucide-react";
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

async function getUserProfile(userId: string): Promise<User | null> {
  const userDocRef = doc(db, "users", userId);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    return userDoc.data() as User;
  }
  return null;
}

export default function ProfilePage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const userProfile = await getUserProfile(params.id);
      if (userProfile) {
        setUser(userProfile);
      }
      setLoading(false);
    };

    fetchUser();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    notFound();
  }

  const userPosts = mockPosts.filter(p => p.author.id === user.id);

  return (
    <div>
      <div className="relative h-48 md:h-64 w-full">
        <Image src={user.coverPhoto} alt={`${user.name} এর কভার ফটো`} fill className="object-cover" />
      </div>
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-start">
          <div className="relative -mt-20 md:-mt-24">
            <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
          </div>
          {currentUser?.uid === user.id ? (
            <Button variant="outline">প্রোফাইল সম্পাদনা করুন</Button>
          ) : (
            <Button>অনুসরণ করুন</Button>
          )}
        </div>
        
        <div className="mt-4">
          <h1 className="text-2xl md:text-3xl font-bold">{user.name}</h1>
          <p className="text-muted-foreground">@{user.handle}</p>
        </div>

        <p className="mt-4 text-base">{user.bio}</p>

        <div className="flex items-center gap-4 mt-4 text-muted-foreground">
            <div className="flex items-center gap-1">
                <UserIcon className="w-4 h-4" />
                <span><span className="font-bold text-foreground">{user.following.toLocaleString('bn-BD')}</span> অনুসরণ করছেন</span>
            </div>
             <div className="flex items-center gap-1">
                <UserIcon className="w-4 h-4" />
                <span><span className="font-bold text-foreground">{user.followers.toLocaleString('bn-BD')}</span> অনুসরণকারী</span>
            </div>
        </div>
      </div>
      
      <div className="border-t border-border">
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-transparent border-b rounded-none px-4 md:px-6">
            <TabsTrigger value="posts">পোস্টসমূহ</TabsTrigger>
            <TabsTrigger value="replies">উত্তর</TabsTrigger>
            <TabsTrigger value="likes">লাইকস</TabsTrigger>
          </TabsList>
          <TabsContent value="posts" className="p-4 md:p-6 space-y-4">
             {userPosts.length > 0 ? (
                userPosts.map(post => <PostCard key={post.id} post={post} />)
             ) : (
                <div className="text-center py-16 text-muted-foreground">
                    <p>এখনও কোনো পোস্ট নেই</p>
                </div>
             )}
          </TabsContent>
           <TabsContent value="replies" className="p-4 md:p-6">
                <div className="text-center py-16 text-muted-foreground">
                    <p>এখনও কোনো উত্তর নেই</p>
                </div>
           </TabsContent>
           <TabsContent value="likes" className="p-4 md:p-6">
                <div className="text-center py-16 text-muted-foreground">
                    <p>এখনও কোনো লাইক নেই</p>
                </div>
           </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
