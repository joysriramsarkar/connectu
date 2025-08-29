
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import { PostCard } from "@/components/post-card";
import { CreatePost } from "@/components/create-post";
import { User as AppUser, Post } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from 'lucide-react';

async function getUserProfile(userId: string): Promise<AppUser | null> {
  if (!userId) return null;
  const userDocRef = doc(db, "users", userId);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() } as AppUser;
  }
  return null;
}

async function createUserProfile(firebaseUser: FirebaseUser): Promise<AppUser> {
    const isAnonymous = firebaseUser.isAnonymous;
    const newUser: AppUser = {
        id: firebaseUser.uid,
        name: isAnonymous ? 'বেনামী ব্যবহারকারী' : firebaseUser.displayName || 'New User',
        handle: isAnonymous ? `guest${Date.now()}` : firebaseUser.email?.split('@')[0] || `user${Date.now()}`,
        avatar: isAnonymous ? `https://picsum.photos/seed/guest${firebaseUser.uid}/200` : firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/200`,
        coverPhoto: `https://picsum.photos/seed/cover${firebaseUser.uid}/1200/400`,
        bio: 'Welcome to ConnectU!',
        followers: 0,
        following: 0,
    };
    await setDoc(doc(db, "users", firebaseUser.uid), newUser);
    return newUser;
}

export default function Home() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const router = useRouter();

  const fetchPosts = useCallback(async () => {
    setPostsLoading(true);
    const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(20));
    const querySnapshot = await getDocs(postsQuery);
    const postsData = await Promise.all(
        querySnapshot.docs.map(async (postDoc) => {
            const postData = postDoc.data();
            const author = await getUserProfile(postData.authorId);
            return { id: postDoc.id, ...postData, author } as Post;
        })
    );
    setPosts(postsData.filter(p => p.author));
    setPostsLoading(false);
  }, []);
  
  const fetchSuggestedUsers = useCallback(async (currentUserId: string) => {
    if (!currentUserId) return;
    const usersQuery = query(
      collection(db, "users"), 
      where("id", "!=", currentUserId),
      limit(5)
    );
    const usersSnapshot = await getDocs(usersQuery);
    const usersData = usersSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as AppUser);
    setSuggestedUsers(usersData);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true);
        let userProfile = await getUserProfile(firebaseUser.uid);
        if (!userProfile) {
            userProfile = await createUserProfile(firebaseUser);
        }
        setUser(userProfile);
        setLoading(false);
        fetchPosts();
        fetchSuggestedUsers(firebaseUser.uid);
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router, fetchPosts, fetchSuggestedUsers]);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4 p-4 md:p-6">
      <div className="md:col-span-2 xl:col-span-3 space-y-6">
        <CreatePost user={user} onPostCreated={fetchPosts} />
        <div className="space-y-4">
          {postsLoading ? (
            <div className="space-y-4">
              <PostCard post={{id: '1', authorId: '1'} as Post} />
              <PostCard post={{id: '2', authorId: '2'} as Post} />
            </div>
          ) : posts.length > 0 ? (
             posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))
          ) : (
             <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    এখনও কোনো পোস্ট নেই। প্রথম পোস্টটি আপনিই করুন!
                </CardContent>
             </Card>
          )}
        </div>
      </div>
      <aside className="hidden md:block md:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>আপনার জন্য পরামর্শ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestedUsers.length > 0 ? suggestedUsers.map(suggestedUser => (
              <div key={suggestedUser.id} className="flex items-center justify-between">
                <Link href={`/profile/${suggestedUser.id}`} className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={suggestedUser.avatar} alt={suggestedUser.name} />
                    <AvatarFallback>{suggestedUser.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{suggestedUser.name}</p>
                    <p className="text-sm text-muted-foreground">@{suggestedUser.handle}</p>
                  </div>
                </Link>
                <Button size="sm" variant="outline" onClick={() => router.push(`/profile/${suggestedUser.id}`)}>প্রোফাইল দেখুন</Button>
              </div>
            )) : <p className="text-sm text-muted-foreground">কোনো পরামর্শ নেই।</p>}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

    