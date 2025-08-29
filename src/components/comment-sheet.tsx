
"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  increment,
  writeBatch,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import type { Comment, User } from "@/lib/data";
import { formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";


interface CommentSheetProps {
  postId: string;
  postContent: string;
  author: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function getUserProfile(userId: string): Promise<User | null> {
    if (!userId) return null;
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() } as User;
    }
    return null;
}

export function CommentSheet({ postId, postContent, author, open, onOpenChange }: CommentSheetProps) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const q = query(
      collection(db, "posts", postId, "comments"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const commentsData = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const commentData = doc.data();
          const author = await getUserProfile(commentData.authorId);
          return { id: doc.id, ...commentData, author } as Comment;
        })
      );
      setComments(commentsData.filter(c => c.author));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [postId, open]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || submitting || !author) return;

    setSubmitting(true);
    
    const postRef = doc(db, "posts", postId);
    const commentsColRef = collection(postRef, "comments");
    const notificationsColRef = collection(db, 'notifications');

    try {
        const batch = writeBatch(db);
        
        const newCommentRef = doc(commentsColRef);
        batch.set(newCommentRef, {
            authorId: user.uid,
            content: newComment.trim(),
            createdAt: serverTimestamp(),
        });

        batch.update(postRef, { comments: increment(1) });
        
        if (user.uid !== author.id) {
            batch.set(doc(notificationsColRef), {
                type: 'comment',
                senderId: user.uid,
                recipientId: author.id,
                postId: postId,
                postContent: postContent,
                createdAt: serverTimestamp(),
                read: false,
            });
        }

        await batch.commit();

        setNewComment("");
        toast({
            title: "সফল",
            description: "আপনার মন্তব্য যোগ করা হয়েছে।"
        })
    } catch (error) {
        console.error("Error adding comment: ", error);
        toast({
            variant: "destructive",
            title: "ত্রুটি",
            description: "মন্তব্য যোগ করা যায়নি।"
        })
    } finally {
        setSubmitting(false);
    }
  };
  
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp?.toDate) return '';
    return formatDistanceToNow(timestamp.toDate(), { addSuffix: true, locale: bn });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{author.name}-এর পোস্টে মন্তব্য</SheetTitle>
          <SheetDescription>
            এখানে আপনি এই পোস্টের সকল মন্তব্য দেখতে পারবেন।
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 flex flex-col min-h-0">
            {loading ? (
                 <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                 </div>
            ) : comments.length > 0 ? (
                <ScrollArea className="flex-1 pr-4 -mr-4">
                    <div className="space-y-6">
                    {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                            <Link href={`/profile/${comment.author.id}`}>
                                <Avatar>
                                    <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
                                    <AvatarFallback>{comment.author.name.substring(0, 2)}</AvatarFallback>
                                </Avatar>
                            </Link>
                            <div>
                                <div className="flex items-center gap-2">
                                <Link href={`/profile/${comment.author.id}`} className="font-bold hover:underline">{comment.author.name}</Link>
                                <span className="text-xs text-muted-foreground">{formatTimestamp(comment.createdAt)}</span>
                                </div>
                                <p>{comment.content}</p>
                            </div>
                        </div>
                    ))}
                    </div>
                </ScrollArea>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-muted-foreground">এখনও কোনো মন্তব্য নেই।</p>
                </div>
            )}
            <form onSubmit={handleAddComment} className="mt-4 border-t pt-4">
            <div className="relative">
                <Textarea
                placeholder="আপনার মন্তব্য যোগ করুন..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="pr-16"
                disabled={submitting}
                />
                <Button
                type="submit"
                size="icon"
                className="absolute right-2 top-2"
                disabled={!newComment.trim() || submitting}
                >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            </div>
            </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
