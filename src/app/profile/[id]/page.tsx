
"use client";

import { useEffect, useState, useCallback } from 'react';
import { notFound } from "next/navigation";
import Image from "next/image";
import { doc, getDoc, collection, query, where, getDocs, orderBy, writeBatch, increment, onSnapshot, DocumentData, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Post, User } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/post-card";
import { User as UserIcon, Loader2 } from "lucide-react";
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';

async function getUserProfile(userId: string): Promise<User | null> {
  if(!userId) return null;
  const userDocRef = doc(db, "users", userId);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() } as User;
  }
  return null;
}

export default function ProfilePage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    const userId = params.id;
    if (!userId) return;
    setLoading(true);
    const unsub = onSnapshot(doc(db, "users", userId), (doc) => {
        if(doc.exists()){
            setUser({ id: doc.id, ...doc.data() } as User);
        } else {
            setUser(null);
        }
        setLoading(false);
    });
    return () => unsub();
  }, [params.id]);


  const fetchPosts = useCallback(async () => {
    const userId = params.id;
    if(!user || !userId) return;
    setPostsLoading(true);
    const postsQuery = query(
      collection(db, "posts"), 
      where("authorId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(postsQuery);
    const postsData = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
            const postData = doc.data();
            // Since we are on the author's profile page, we can use the user state
            return { id: doc.id, ...postData, author: user } as Post;
        })
    );
    setPosts(postsData);
    setPostsLoading(false);
  }, [params.id, user]);

  useEffect(() => {
    if(user) {
        fetchPosts();
    }
  }, [user, fetchPosts]);

  useEffect(() => {
    if (!currentUser || !user) return;
    setFollowLoading(true);
    const followDocRef = doc(db, "follows", `${currentUser.uid}_${user.id}`);
    const unsubscribe = onSnapshot(followDocRef, (doc) => {
        setIsFollowing(doc.exists());
        setFollowLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser, user]);

  const handleFollowToggle = async () => {
    if (!currentUser || !user || followLoading) return;
    setFollowLoading(true);

    const currentUserRef = doc(db, "users", currentUser.uid);
    const targetUserRef = doc(db, "users", user.id);
    const followDocRef = doc(db, "follows", `${currentUser.uid}_${user.id}`);
    
    try {
        const batch = writeBatch(db);
        if (isFollowing) {
            batch.delete(followDocRef);
            batch.update(currentUserRef, { following: increment(-1) });
            batch.update(targetUserRef, { followers: increment(-1) });
        } else {
            batch.set(followDocRef, {
                followerId: currentUser.uid,
                followingId: user.id,
                createdAt: new Date(),
            });
            batch.update(currentUserRef, { following: increment(1) });
            batch.update(targetUserRef, { followers: increment(1) });
        }
        await batch.commit();
    } catch (error) {
        console.error("Error toggling follow:", error);
    } finally {
        setFollowLoading(false);
    }
  };

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
            currentUser && <Button onClick={handleFollowToggle} disabled={followLoading}>
              {followLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isFollowing ? 'অনুসরণ করছেন' : 'অনুসরণ করুন'}
            </Button>
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
                <span><span className="font-bold text-foreground">{user.following?.toLocaleString('bn-BD') || 0}</span> অনুসরণ করছেন</span>
            </div>
             <div className="flex items-center gap-1">
                <UserIcon className="w-4 h-4" />
                <span><span className="font-bold text-foreground">{user.followers?.toLocaleString('bn-BD') || 0}</span> অনুসরণকারী</span>
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
             {postsLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
             ) : posts.length > 0 ? (
                posts.map(post => <PostCard key={post.id} post={post} />)
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
