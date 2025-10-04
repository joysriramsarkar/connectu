
"use client";

import { useEffect, useState, useCallback } from 'react';
import { notFound, useParams } from "next/navigation";
import Image from "next/image";
import { doc, getDoc, collection, query, where, getDocs, orderBy, writeBatch, increment, onSnapshot, setDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Post, User } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/post-card";
import { User as UserIcon, Loader2, MessageSquare } from "lucide-react";
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/context/i18n';


export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const { t, locale } = useI18n();

  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if (!userId || !db) return;
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
  }, [userId]);


  const fetchPosts = useCallback(async () => {
    if(!user || !userId || !db) return;
    setPostsLoading(true);
    const postsQuery = query(
      collection(db, "posts"), 
      where("authorId", "==", userId),
      orderBy("createdAt", "desc")
    );
    try {
      const querySnapshot = await getDocs(postsQuery);
      const postsData = querySnapshot.docs.map((doc) => {
          return { id: doc.id, ...doc.data(), author: user } as Post;
      });
      setPosts(postsData);
    } catch(error) {
      console.error("Error fetching posts: ", error);
    } finally {
      setPostsLoading(false);
    }
  }, [userId, user]);

  useEffect(() => {
    if(user) {
        fetchPosts();
    }
  }, [user, fetchPosts]);

  useEffect(() => {
    if (!currentUser || !user || !db) return;
    setFollowLoading(true);
    const followDocRef = doc(db, "follows", `${currentUser.uid}_${user.id}`);
    const unsubscribe = onSnapshot(followDocRef, (doc) => {
        setIsFollowing(doc.exists());
        setFollowLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser, user]);

  const handleFollowToggle = async () => {
    if (!currentUser || !user || followLoading || !db) return;
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

            // Create notification
            const notificationsColRef = collection(db, 'notifications');
            batch.set(doc(notificationsColRef), {
                type: 'follow',
                senderId: currentUser.uid,
                recipientId: user.id,
                createdAt: serverTimestamp(),
                read: false,
            });
        }
        await batch.commit();
    } catch (error) {
        console.error("Error toggling follow:", error);
    } finally {
        setFollowLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentUser || !user || !db) return;

    const conversationId = [currentUser.uid, user.id].sort().join('_');
    const conversationRef = doc(db, 'conversations', conversationId);
    
    const docSnap = await getDoc(conversationRef);
    if (!docSnap.exists()) {
        await setDoc(conversationRef, {
            participants: [currentUser.uid, user.id],
            lastMessage: '',
            lastMessageTimestamp: new Date(),
        });
    }
    
    router.push('/messages');
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
        <Image src={user.coverPhoto} alt={`${user.name}'s cover photo`} fill className="object-cover" />
      </div>
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-start">
          <div className="relative -mt-20 md:-mt-24">
            <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
          </div>
          <div className="flex gap-2">
            {currentUser?.uid === user.id ? (
              <Button variant="outline" onClick={() => router.push('/profile/edit')}>{t('edit_profile')}</Button>
            ) : (
              currentUser && (
                <>
                <Button onClick={handleSendMessage} variant="outline" size="icon">
                    <MessageSquare />
                </Button>
                <Button onClick={handleFollowToggle} disabled={followLoading}>
                {followLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isFollowing ? t('following_button') : t('follow')}
                </Button>
                </>
              )
            )}
          </div>
        </div>
        
        <div className="mt-4">
          <h1 className="text-2xl md:text-3xl font-bold">{user.name}</h1>
          <p className="text-muted-foreground">@{user.handle}</p>
        </div>

        <p className="mt-4 text-base">{user.bio}</p>

        <div className="flex items-center gap-4 mt-4 text-muted-foreground">
            <div className="flex items-center gap-1">
                <UserIcon className="w-4 h-4" />
                <span><span className="font-bold text-foreground">{user.following?.toLocaleString(locale as string) || 0}</span> {t('following_stat')}</span>
            </div>
             <div className="flex items-center gap-1">
                <UserIcon className="w-4 h-4" />
                <span><span className="font-bold text-foreground">{user.followers?.toLocaleString(locale as string) || 0}</span> {t('followers_stat')}</span>
            </div>
        </div>
      </div>
      
      <div className="border-t border-border">
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-transparent border-b rounded-none px-4 md:px-6">
            <TabsTrigger value="posts">{t('posts')}</TabsTrigger>
            <TabsTrigger value="replies">{t('replies')}</TabsTrigger>
            <TabsTrigger value="likes">{t('likes')}</TabsTrigger>
          </TabsList>
          <TabsContent value="posts" className="p-4 md:p-6 space-y-4">
             {postsLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
             ) : posts.length > 0 ? (
                posts.map(post => <PostCard key={post.id} post={post} user={currentUser}/>)
             ) : (
                <div className="text-center py-16 text-muted-foreground">
                    <p>{t('no_posts_yet')}</p>
                </div>
             )}
          </TabsContent>
           <TabsContent value="replies" className="p-4 md:p-6">
                <div className="text-center py-16 text-muted-foreground">
                    <p>{t('no_replies_yet')}</p>
                </div>
           </TabsContent>
           <TabsContent value="likes" className="p-4 md:p-6">
                <div className="text-center py-16 text-muted-foreground">
                    <p>{t('no_likes_yet')}</p>
                </div>
           </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
