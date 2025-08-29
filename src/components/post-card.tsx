
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Post } from '@/lib/data';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Send, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { bn } from 'date-fns/locale';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, increment, writeBatch, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { CommentSheet } from './comment-sheet';
import { User as FirebaseUser } from 'firebase/auth';

interface PostCardProps {
  post: Post;
  user: FirebaseUser | null | undefined;
}

export function PostCard({ post, user }: PostCardProps) {
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [commentCount, setCommentCount] = useState(post.comments || 0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false);

  useEffect(() => {
    if (!post.id) return;
    const postRef = doc(db, "posts", post.id);
    const unsubscribe = onSnapshot(postRef, (doc) => {
        if(doc.exists()) {
            const data = doc.data();
            setLikeCount(data.likes || 0);
            setCommentCount(data.comments || 0);
        }
    });
    return () => unsubscribe();
  }, [post.id]);
  
  useEffect(() => {
    let unsubscribe: () => void;
    if (user && post.id) {
      const likeDocRef = doc(db, "posts", post.id, "likes", user.uid);
      unsubscribe = onSnapshot(likeDocRef, (doc) => {
        setIsLiked(doc.exists());
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, post.id]);

  const handleLikeToggle = async () => {
    if (!user || likeLoading || !post.id || !post.author) return;
    setLikeLoading(true);

    const postRef = doc(db, "posts", post.id);
    const likeRef = doc(db, "posts", post.id, "likes", user.uid);
    const notificationsColRef = collection(db, 'notifications');

    const batch = writeBatch(db);

    try {
      if (isLiked) {
        batch.delete(likeRef);
        batch.update(postRef, { likes: increment(-1) });
      } else {
        batch.set(likeRef, { userId: user.uid, createdAt: serverTimestamp() });
        batch.update(postRef, { likes: increment(1) });
        
        if (user.uid !== post.author.id) {
             batch.set(doc(notificationsColRef), {
                type: 'like',
                senderId: user.uid,
                recipientId: post.author.id,
                postId: post.id,
                postContent: post.content,
                createdAt: serverTimestamp(),
                read: false,
            });
        }
      }
      await batch.commit();
    } catch (error) {
      console.error("Error toggling like: ", error);
      toast({
        variant: "destructive",
        title: "ত্রুটি",
        description: "লাইক করার সময় একটি সমস্যা হয়েছে।",
      });
    } finally {
      setLikeLoading(false);
    }
  };
  
  const handleShare = () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(postUrl);
    toast({
      title: "লিঙ্ক কপি হয়েছে",
      description: "পোস্টের লিঙ্ক আপনার ক্লিপবোর্ডে কপি করা হয়েছে।",
    });
  };

  const formattedDate = post.createdAt?.toDate ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: bn }) : 'কিছুক্ষণ আগে';

  if (!post.author) {
    return (
        <Card>
            <CardHeader className="p-4">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarFallback>...</AvatarFallback>
                    </Avatar>
                    <div className="w-full space-y-2">
                        <div className="h-4 w-2/5 rounded-full bg-muted animate-pulse"></div>
                        <div className="h-3 w-1/4 rounded-full bg-muted animate-pulse"></div>
                    </div>
                </div>
            </CardHeader>
             <CardContent className="px-4 pb-2 space-y-4">
                <div className="h-4 w-4/5 rounded-full bg-muted animate-pulse"></div>
             </CardContent>
        </Card>
    )
  }

  return (
    <>
    <Card>
      <CardHeader className="p-4">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.author.id}`}>
            <Avatar>
              <AvatarImage src={post.author.avatar} alt={post.author.name} />
              <AvatarFallback>{post.author.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link href={`/profile/${post.author.id}`} className="font-bold hover:underline">{post.author.name}</Link>
            <p className="text-sm text-muted-foreground">@{post.author.handle} · {formattedDate}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-2 space-y-4">
        <p className="whitespace-pre-wrap">{post.content}</p>
        {post.image && (
          <div className="relative aspect-video rounded-lg overflow-hidden border">
            <Image src={post.image} alt="Post image" fill className="object-cover" />
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-2">
        <div className="flex justify-start gap-4 text-muted-foreground">
          <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={handleLikeToggle} disabled={!user || likeLoading}>
            <Heart className={cn("h-5 w-5", isLiked && 'fill-red-500 text-red-500')} />
            <span>{(likeCount || 0).toLocaleString('bn-BD')}</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={() => setIsCommentSheetOpen(true)} disabled={!user}>
            <MessageCircle className="h-5 w-5" />
            <span>{(commentCount || 0).toLocaleString('bn-BD')}</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={handleShare}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
    {user && post.id && post.author && <CommentSheet postId={post.id} postContent={post.content} author={post.author} open={isCommentSheetOpen} onOpenChange={setIsCommentSheetOpen} />}
    </>
  );
}
