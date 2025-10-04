
"use client";

import { useEffect, useState } from 'react';
import { useParams, notFound, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Post, User } from "@/lib/data";
import { PostCard } from "@/components/post-card";
import { Loader2, ArrowLeft } from "lucide-react";
import { useAuthState } from 'react-firebase-hooks/auth';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/context/i18n';

async function getUserProfile(userId: string): Promise<User | null> {
    if (!userId || !db) return null;
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() } as User;
    }
    return null;
}

export default function PostPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useI18n();
    const postId = params.id as string;
    const [user] = useAuthState(auth!);
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!postId) return;

        const fetchPost = async () => {
            if (!db) return;
            setLoading(true);
            const postRef = doc(db, "posts", postId);
            const postDoc = await getDoc(postRef);

            if (postDoc.exists()) {
                const postData = postDoc.data();
                const author = await getUserProfile(postData.authorId);
                if (author) {
                    setPost({ id: postDoc.id, ...postData, author } as Post);
                } else {
                    setPost(null); // Author not found
                }
            } else {
                setPost(null); // Post not found
            }
            setLoading(false);
        }
        fetchPost();

    }, [postId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }

    if (!post) {
        return notFound();
    }

    return (
        <div className="p-4 md:p-6 max-w-2xl mx-auto">
             <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> {t('back_button')}
            </Button>
            <PostCard post={post} user={user} />
        </div>
    )
}
