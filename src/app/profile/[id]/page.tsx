"use client";

import { useEffect, useState, useCallback } from 'react';
import { notFound, useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Post, User } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/post-card";
import { User as UserIcon, Loader2, MessageSquare } from "lucide-react";
import { useAuth } from '@/context/auth';
import { useI18n } from '@/context/i18n';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const { firebaseUser, idToken } = useAuth();

  const [user, setUser] = useState<(User & { postsCount?: number }) | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // 1. Fetch user profile from PostgreSQL
  const fetchUserProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (idToken) headers["Authorization"] = `Bearer ${idToken}`;

      const res = await fetch(`/api/v1/users/${userId}`, { headers });
      if (res.status === 404) {
        setUser(null);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch user");

      const data = await res.json();
      setUser(data);
      setIsFollowing(data.isFollowing ?? false);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [userId, idToken]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  // 2. Fetch user posts from PostgreSQL
  const fetchPosts = useCallback(async () => {
    if (!userId) return;
    setPostsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (idToken) headers["Authorization"] = `Bearer ${idToken}`;

      const res = await fetch(`/api/v1/users/${userId}/posts`, { headers });
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch (error) {
      console.error("Error fetching user posts:", error);
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, [userId, idToken]);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user, fetchPosts]);

  // 3. Follow / Unfollow toggle via PostgreSQL API
  const handleFollowToggle = async () => {
    if (!firebaseUser || !idToken || !user || followLoading) {
      if (!firebaseUser) router.push('/login');
      return;
    }

    setFollowLoading(true);
    const method = isFollowing ? "DELETE" : "PUT";
    try {
      const res = await fetch(`/api/v1/users/${user.id}/follow`, {
        method,
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update follow status");
      }

      const nextFollowingState = !isFollowing;
      setIsFollowing(nextFollowingState);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              followers: prev.followers + (nextFollowingState ? 1 : -1),
            }
          : prev
      );
    } catch (error: any) {
      console.error("Error toggling follow:", error);
      toast({
        variant: "destructive",
        title: t("error_title"),
        description: error?.message || "Failed to update follow status",
      });
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!firebaseUser || !user) {
      router.push('/login');
      return;
    }
    const query = new URLSearchParams({
      userId: user.id,
      name: user.name || '',
      handle: user.handle || '',
      avatar: user.avatar || '',
    }).toString();
    router.push(`/messages?${query}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">প্রোফাইল লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!user) {
    notFound();
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
    <div className="relative min-h-screen">
      {/* Dynamic ambient floating orbs */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-float-orb" />

      <div className="relative h-48 md:h-64 w-full bg-muted/40 border-b border-white/10">
        {user.coverPhoto ? (
          <Image
            src={user.coverPhoto}
            alt={`${user.name}'s cover photo`}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-primary/20 via-accent/15 to-primary/10" />
        )}
      </div>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-start">
          <div className="relative -mt-20 md:-mt-24">
            <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-2xl ring-4 ring-primary/20">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="font-bold text-2xl bg-primary/15 text-primary">
                {user.name?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex items-center gap-2 pt-2">
            {firebaseUser?.uid === user.id ? (
              <Button
                variant="outline"
                onClick={() => router.push('/profile/edit')}
                className="rounded-full border-white/20 hover:border-primary/40 hover:bg-primary/10 transition-all h-9 px-4 text-xs sm:text-sm font-semibold"
              >
                {t('edit_profile')}
              </Button>
            ) : (
              firebaseUser && (
                <>
                  <Button
                    onClick={handleSendMessage}
                    variant="outline"
                    className="rounded-full border-white/20 hover:border-primary/50 hover:bg-primary/10 gap-2 h-9 px-4 transition-all duration-200 active:scale-95 shadow-sm text-foreground"
                  >
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-xs sm:text-sm">{t('messages') || 'মেসেজ'}</span>
                  </Button>
                  <Button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className="rounded-full h-9 px-5 font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-95 shadow-md shadow-primary/20 hover:shadow-primary/40 transition-all duration-200 text-xs sm:text-sm"
                  >
                    {followLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isFollowing ? (
                      t('following_button')
                    ) : (
                      t('follow')
                    )}
                  </Button>
                </>
              )
            )}
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl md:text-3xl font-bold">{user.name}</h1>
          <p className="text-muted-foreground">@{user.handle}</p>
        </div>

        <p className="mt-4 text-base">{user.bio}</p>

        <div className="flex items-center gap-4 mt-4 text-muted-foreground">
          <div className="flex items-center gap-1">
            <UserIcon className="w-4 h-4" />
            <span>
              <span className="font-bold text-foreground">
                {(user.following ?? 0).toLocaleString(locale as string)}
              </span>{" "}
              {t('following_stat')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <UserIcon className="w-4 h-4" />
            <span>
              <span className="font-bold text-foreground">
                {(user.followers ?? 0).toLocaleString(locale as string)}
              </span>{" "}
              {t('followers_stat')}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-transparent border-b rounded-none px-4 md:px-6">
            <TabsTrigger value="posts">{t('posts')}</TabsTrigger>
            <TabsTrigger value="replies">{t('replies')}</TabsTrigger>
            <TabsTrigger value="likes">{t('likes')}</TabsTrigger>
          </TabsList>
          <TabsContent value="posts" className="p-4 md:p-6 space-y-4">
            {postsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : posts.length > 0 ? (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  user={authUser}
                  idToken={idToken}
                />
              ))
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <p>{t('no_posts_yet')}</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="replies" className="p-4 md:p-6">
            <div className="text-center py-16 text-muted-foreground">
              <p>{t('no_replies_yet')}</p>
            </div>
          </TabsContent>
          <TabsContent value="likes" className="p-4 md:p-6">
            <div className="text-center py-16 text-muted-foreground">
              <p>{t('no_likes_yet')}</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
