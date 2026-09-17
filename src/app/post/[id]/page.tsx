"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, notFound, useRouter } from "next/navigation";
import { Post } from "@/lib/data";
import { PostCard } from "@/components/post-card";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useI18n } from '@/context/i18n';
import { useAuth } from '@/context/auth';

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const { firebaseUser, idToken } = useAuth();
  const postId = params.id as string;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPost = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (idToken) headers["Authorization"] = `Bearer ${idToken}`;

      const res = await fetch(`/api/v1/posts/${postId}`, { headers });
      if (res.status === 404) {
        setPost(null);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch post");

      const data = await res.json();
      setPost(data);
    } catch (error) {
      console.error("Error fetching post:", error);
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [postId, idToken]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

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

  const authUser = firebaseUser
    ? {
        id: firebaseUser.uid,
        name: firebaseUser.displayName ?? null,
        email: firebaseUser.email ?? null,
        image: firebaseUser.photoURL ?? null,
      }
    : null;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> {t('back_button')}
      </Button>
      <PostCard post={post} user={authUser} idToken={idToken} />
    </div>
  );
}
