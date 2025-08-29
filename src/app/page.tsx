
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { PostCard } from "@/components/post-card";
import { CreatePost } from "@/components/create-post";
import { mockPosts, mockUsers, User } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // For now, using mock user data. We will replace this with real user data from Firestore.
        const currentUser = mockUsers.find(u => u.id === 'user-1');
        if (currentUser) {
            // @ts-ignore
            currentUser.email = firebaseUser.email;
            setUser(currentUser);
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const suggestedUsers = mockUsers.slice(2, 6);

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
        <CreatePost user={user} />
        <div className="space-y-4">
          {mockPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
      <aside className="hidden md:block md:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>আপনার জন্য পরামর্শ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestedUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between">
                <Link href={`/profile/${user.id}`} className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-muted-foreground">@{user.handle}</p>
                  </div>
                </Link>
                <Button size="sm" variant="outline">অনুসরণ করুন</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
