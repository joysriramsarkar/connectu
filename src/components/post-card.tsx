
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
import { bn, enUS } from 'date-fns/locale';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, increment, writeBatch, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { CommentSheet } from './comment-sheet';
import { User as FirebaseUser } from 'firebase/auth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useI18n } from '@/context/i18n';

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 512" {...props}><path fill="#0866FF" d="M512 256C512 114.6 397.4 0 256 0S0 114.6 0 256C0 376 82.7 476.8 194.2 504.5V334.2H137.4V256h56.8v-60.3c0-56.1 33.4-87.2 84.5-87.2c24.6 0 51.3 4.4 51.3 4.4v68.5h-39.3c-27.2 0-35.6 16.3-35.6 34.5V256h76.2l-12.2 78.2h-64V504.5C429.3 476.8 512 376 512 256z"/></svg>
);
const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 512" {...props}><path fill="#000000" d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" /></svg>
);
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 512" {...props}><path fill="#25D366" d="M413.2 98.8c-48-48-111.4-73.2-179.3-73.2-138.3 0-250 111.7-250 250 0 45.4 12.3 88.5 35.1 126.4l-37.4 136.3 139.5-36.6c36.2 21.1 76.8 32.2 117.8 32.2h.1c138.2 0 249.9-111.7 249.9-250 .1-67.8-25.2-131.2-73.1-179.1zm-157.3 351.8h-.1c-34.9 0-68.9-9.1-98.8-26.3l-7.1-4.2-73.4 19.3 19.6-71.5-4.6-7.3c-18.3-29.2-27.9-63.3-27.9-98.8 0-110.1 89.2-199.3 199.4-199.3 54.5 0 105.7 21.3 144.1 59.7 38.4 38.4 59.7 89.6 59.7 144.1-.1 110.1-89.3 199.3-199.3 199.3zm112.4-148.6c-5.9-3-35.1-17.3-40.5-19.3s-9.3-3-13.2 3c-3.9 6-15.3 19.3-18.8 23.2-3.5 3.9-6.9 4.4-12.8 1.4-5.9-3-25-9.2-47.6-29.4-17.6-15.7-29.5-35.1-32.9-41.1s-.4-9.3 1.9-12.2c2.1-2.6 4.6-6.9 6.9-9.3 2.3-2.3 3-3.9 4.4-6.9s.7-5.9-1.4-8.8c-2.1-3-13.2-31.7-18.1-43.4-4.8-11.7-9.7-10.1-13.2-10.1-3.4 0-7.3-.5-11.2-.5s-9.3 1.4-14.2 6.9c-5 5.5-19.3 18.8-19.3 45.9s19.7 53.3 22.5 56.9c2.8 3.6 38.9 59.2 94.1 82.8 13.1 5.5 23.4 8.8 31.4 11.2 11.7 3.6 22.4 3.1 30.8 1.9 9.3-1.4 28.9-11.8 32.9-23.2 3.9-11.4 3.9-21.1 2.8-23.2s-3.9-3.5-5.8-6.4z" /></svg>
);


interface PostCardProps {
  post: Post;
  user: FirebaseUser | null | undefined;
}

export function PostCard({ post, user }: PostCardProps) {
  const { toast } = useToast();
  const { t, locale } = useI18n();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [commentCount, setCommentCount] = useState(post.comments || 0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false);

  useEffect(() => {
    if (!post.id || !db) return;
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
    if (user && post.id && db) {
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
    if (!user || likeLoading || !post.id || !post.author || !db) return;
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
        title: t('error_title'),
        description: t('like_error'),
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
          title: t('copy_link'),
          description: t('copy_link_description'),
        });
        return;
    }
    
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const formattedDate = post.createdAt?.toDate ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: locale === 'bn' ? bn : enUS }) : t('a_moment_ago');

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
            <span>{(likeCount || 0).toLocaleString(locale as string)}</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={() => setIsCommentSheetOpen(true)} disabled={!user}>
            <MessageCircle className="h-5 w-5" />
            <span>{(commentCount || 0).toLocaleString(locale as string)}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <div className="flex justify-around p-2">
                    <Button variant="ghost" size="icon" onClick={() => handleShare('facebook')}><FacebookIcon className="h-5 w-5"/></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleShare('twitter')}><TwitterIcon className="h-5 w-5"/></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleShare('whatsapp')}><WhatsAppIcon className="h-5 w-5"/></Button>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleShare('copy')}>
                    <Copy className="mr-2 h-4 w-4" />
                    <span>{t('copy')}</span>
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
