"use client";

import { useState, useEffect, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send } from 'lucide-react';
import { useI18n } from '@/context/i18n';
import { Comment } from '@/lib/data';
import { addComment, getComments } from '@/lib/post.actions';

interface CommentSheetProps {
  postId: string;
  postAuthorId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommentSheet({ postId, postAuthorId, open, onOpenChange }: CommentSheetProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const pathname = usePathname();
  const { t, locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(true);

  useEffect(() => {
    if (open) {
      setIsLoadingComments(true);
      getComments(postId)
        .then((data: Comment[]) => setComments(data))
        .finally(() => setIsLoadingComments(false));
    }
  }, [open, postId]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    startTransition(async () => {
      await addComment({
        postId,
        userId: user.id,
        authorId: postAuthorId,
        content: newComment,
        path: pathname,
      });
      setNewComment('');
      // Refresh comments list
      const updatedComments = await getComments(postId);
      setComments(updatedComments);
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('comments')}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 pr-4 -mr-6">
          {isLoadingComments ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id as string} className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
                    <AvatarFallback>{comment.author.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-muted rounded-lg p-2">
                      <p className="font-semibold text-sm">{comment.author.name}</p>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(comment.createdAt as any), { addSuffix: true, locale: locale === 'bn' ? bn : enUS })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-16">
              <p>{t('no_comments_yet')}</p>
              <p className="text-sm">{t('be_the_first_to_comment')}</p>
            </div>
          )}
        </ScrollArea>
        <SheetFooter>
          {user && (
            <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 w-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.image || ''} />
                <AvatarFallback>{user.name?.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <Input
                placeholder={t('add_a_comment')}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={isPending}
              />
              <Button type="submit" size="icon" disabled={!newComment.trim() || isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}