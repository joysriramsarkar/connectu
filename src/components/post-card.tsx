
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Post } from '@/lib/data';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Send, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { bn } from 'date-fns/locale';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, increment, writeBatch, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { CommentSheet } from './comment-sheet';
import { User as FirebaseUser } from 'firebase/auth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
);
const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 4s-.7 2.1-2 3.4c1.6 1.4 3.3 4.4 3.3 4.4s-1.4 1.4-2.8 1.4c-1.4 0-2.8-1.4-2.8-1.4s-1.4 2.8-4.2 2.8c-2.8 0-4.2-2.8-4.2-2.8s-1.4 1.4-2.8 1.4c-1.4 0-2.8-1.4-2.8-1.4s1.7-3 3.3-4.4c-1.3-1.3-2-3.4-2-3.4s1.4-1.4 2.8-1.4c1.4 0 2.8 1.4 2.8 1.4s1.4-2.8 4.2-2.8c2.8 0 4.2 2.8 4.2 2.8z"></path></svg>
);
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
);


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
  
  const handleShare = (platform: 'facebook' | 'twitter' | 'whatsapp' | 'copy') => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    const text = encodeURIComponent(`"${post.content}" - ${post.author.name}`);
    let shareUrl = '';

    switch(platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${text}`;
        break;
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${text}%20${encodeURIComponent(postUrl)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(postUrl);
        toast({
          title: "লিঙ্ক কপি হয়েছে",
          description: "পোস্টের লিঙ্ক আপনার ক্লিপবোর্ডে কপি করা হয়েছে।",
        });
        return;
    }
    
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
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
          <div className="relative mt-3 aspect-[16/9] w-full rounded-lg overflow-hidden border">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleShare('facebook')}>
                    <FacebookIcon className="mr-2 h-4 w-4" />
                    <span>ফেসবুকে শেয়ার করুন</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('twitter')}>
                    <TwitterIcon className="mr-2 h-4 w-4" />
                    <span>টুইটারে শেয়ার করুন</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
                    <WhatsAppIcon className="mr-2 h-4 w-4" />
                    <span>হোয়াটসঅ্যাপে শেয়ার করুন</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('copy')}>
                    <Copy className="mr-2 h-4 w-4" />
                    <span>লিঙ্ক কপি করুন</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>
    </Card>
    {user && post.id && post.author && <CommentSheet postId={post.id} postContent={post.content} author={post.author} open={isCommentSheetOpen} onOpenChange={setIsCommentSheetOpen} />}
    </>
  );
}
