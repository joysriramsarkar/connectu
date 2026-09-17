"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Post } from "@/lib/data";
import { PostCard } from "@/components/post-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bookmark, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/auth";
import { useI18n } from "@/context/i18n";

export default function BookmarksPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { firebaseUser, idToken, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchBookmarks = useCallback(async (cursor?: string) => {
    if (!idToken) return;
    if (cursor) setLoadingMore(true);
    else setLoading(true);

    try {
      const url = cursor
        ? `/api/v1/bookmarks?cursor=${encodeURIComponent(cursor)}&limit=10`
        : `/api/v1/bookmarks?limit=10`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) throw new Error("Failed to fetch bookmarks");
      const data = await res.json();

      setPosts((prev) => (cursor ? [...prev, ...(data.posts ?? [])] : data.posts ?? []));
      setNextCursor(data.nextCursor ?? null);
    } catch (err) {
      console.error("Error fetching bookmarks:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [idToken]);

  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser) {
      router.push("/login");
      return;
    }
    fetchBookmarks();
  }, [authLoading, firebaseUser, router, fetchBookmarks]);

  const authUser = firebaseUser
    ? {
        id: firebaseUser.uid,
        name: firebaseUser.displayName ?? null,
        email: firebaseUser.email ?? null,
        image: firebaseUser.photoURL ?? null,
      }
    : null;

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Bookmark className="h-6 w-6 text-primary fill-primary" />
          <h1 className="text-2xl font-bold">সংরক্ষিত পোস্ট</h1>
        </div>
      </div>

      {posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={{ ...post, isBookmarked: true }}
              user={authUser}
              idToken={idToken}
            />
          ))}

          {nextCursor && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => fetchBookmarks(nextCursor)}
                disabled={loadingMore}
              >
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                আরও দেখুন
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center text-center p-16 text-muted-foreground">
            <Bookmark className="w-16 h-16 mb-4 text-muted-foreground/40" />
            <h2 className="text-xl font-semibold">কোনো পোস্ট সংরক্ষিত নেই</h2>
            <p className="mt-2 text-sm">
              পোস্টের বুকমার্ক আইকনে ক্লিক করে আপনি পছন্দের পোস্টগুলো এখানে সংরক্ষণ করতে পারেন।
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
