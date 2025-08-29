
"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Post } from '@/lib/data';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);

  const handleLike = () => {
    if (isLiked) {
      setLikeCount(likeCount - 1);
    } else {
      setLikeCount(likeCount + 1);
    }
    setIsLiked(!isLiked);
  };

  return (
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
            <p className="text-sm text-muted-foreground">@{post.author.handle} · {post.createdAt}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-2 space-y-4">
        <p className="whitespace-pre-wrap">{post.content}</p>
        {post.image && (
          <div className="relative aspect-video rounded-lg overflow-hidden border">
            <Image src={post.image} alt="Post image" fill className="object-cover" data-ai-hint={post['data-ai-hint']}/>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-2">
        <div className="flex justify-start gap-4 text-muted-foreground">
          <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={handleLike}>
            <Heart className={cn("h-5 w-5", isLiked && 'fill-red-500 text-red-500')} />
            <span>{likeCount.toLocaleString('bn-BD')}</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <span>{post.comments.toLocaleString('bn-BD')}</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
