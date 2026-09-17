"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { PostCard } from "@/components/post-card";
import { CreatePost } from "@/components/create-post";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2, RefreshCw, Compass, Users, Sparkles, UserPlus, ArrowRight } from "lucide-react";
import { useI18n } from "@/context/i18n";
import { useAuth } from "@/context/auth";
import { cn } from "@/lib/utils";
import type { FeedPost, FeedPage } from "@/modules/feed/feed.service";
import type { User as AppUser } from "@/lib/data";

type SuggestedUser = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  followers?: number;
};

type CachedFeed = {
  posts: FeedPost[];
  nextCursor: string | null;
  timestamp: number;
};

export default function Home() {
  const { firebaseUser, appUser, idToken, loading: authLoading } = useAuth();
  const [feedType, setFeedType] = useState<"following" | "explore">("following");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [postsLoading, setPostsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const router = useRouter();
  const { t } = useI18n();

  // Client-side SWR feed cache for instant 0ms tab transitions
  const feedCache = useRef<Record<string, CachedFeed>>({});

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push("/login");
    }
  }, [authLoading, firebaseUser, router]);

  // Fetch feed with SWR caching & instant tab preview
  const fetchFeed = useCallback(
    async (cursor?: string, append = false, type = feedType, forceFresh = false) => {
      if (!idToken) return;

      // SWR cache check for initial page load of a tab
      if (!append && !cursor && !forceFresh) {
        const cached = feedCache.current[type];
        if (cached && Date.now() - cached.timestamp < 60000) {
          // Instant 0ms cache hit!
          setPosts(cached.posts);
          setNextCursor(cached.nextCursor);
          setPostsLoading(false);
          setFeedError(null);
        } else {
          setPostsLoading(true);
          setFeedError(null);
        }
      } else if (append) {
        setLoadingMore(true);
      }

      try {
        const queryParts = [`type=${type}`];
        if (cursor) queryParts.push(`cursor=${encodeURIComponent(cursor)}`);
        const url = `/api/v1/feed?${queryParts.join("&")}`;

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (!response.ok) {
          throw new Error("Feed fetch failed");
        }

        const page: FeedPage = await response.json();

        setPosts((prev) => {
          const next = append ? [...prev, ...page.posts] : page.posts;
          // Store in SWR cache
          if (!append) {
            feedCache.current[type] = {
              posts: next,
              nextCursor: page.nextCursor,
              timestamp: Date.now(),
            };
          }
          return next;
        });

        setNextCursor(page.nextCursor);
      } catch (err) {
        console.error("Feed error:", err);
        if (!append && (!feedCache.current[type] || feedCache.current[type].posts.length === 0)) {
          setFeedError(t("feed_error") || "ফিড লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
        }
      } finally {
        setPostsLoading(false);
        setLoadingMore(false);
      }
    },
    [idToken, feedType, t],
  );

  // Fetch suggested users with caching
  const fetchSuggestedUsers = useCallback(async () => {
    if (!idToken) return;
    try {
      const res = await fetch("/api/v1/users/suggestions", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestedUsers(data.users ?? []);
      }
    } catch (err) {
      console.error("Suggested users error:", err);
    }
  }, [idToken]);

  // Parallel load on mount / token available
  useEffect(() => {
    if (idToken && appUser) {
      Promise.allSettled([
        fetchFeed(undefined, false, feedType),
        fetchSuggestedUsers(),
      ]);
    }
  }, [idToken, appUser, feedType, fetchFeed, fetchSuggestedUsers]);

  const handleTabChange = (type: "following" | "explore") => {
    if (type === feedType) return;
    setFeedType(type);
    fetchFeed(undefined, false, type);
  };

  const handlePostCreated = () => {
    // Invalidate local tab cache and reload fresh
    delete feedCache.current["following"];
    delete feedCache.current["explore"];
    fetchFeed(undefined, false, feedType, true);
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <Sparkles className="h-6 w-6 text-primary absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          ConnectU লোড হচ্ছে...
        </p>
      </div>
    );
  }

  if (!firebaseUser || !appUser) {
    return null;
  }

  const createPostUser: AppUser = {
    id: appUser.id,
    name: appUser.name,
    handle: appUser.handle,
    avatar: appUser.avatar,
    coverPhoto: appUser.coverPhoto,
    bio: appUser.bio,
    followers: appUser.followers,
    following: appUser.following,
  };

  const authUserForCard = {
    id: firebaseUser.uid,
    name: firebaseUser.displayName,
    email: firebaseUser.email,
    image: firebaseUser.photoURL,
  };

  return (
    <div className="relative min-h-screen">
      {/* Dynamic ambient floating orbs */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-float-orb" />
      <div
        className="fixed top-1/3 -right-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none animate-float-orb"
        style={{ animationDelay: "3s" }}
      />

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Main Feed Column */}
        <div className="md:col-span-2 xl:col-span-3 space-y-6">
          {/* Create Post Component */}
          <CreatePost
            user={createPostUser}
            idToken={idToken}
            onPostCreated={handlePostCreated}
          />

          {/* Feed Type Switcher: Following vs Explore (Floating glass dock pill) */}
          <div className="flex justify-center pt-2">
            <div className="glass-card p-1.5 rounded-full border border-white/10 shadow-lg flex items-center gap-1.5 bg-black/20 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => handleTabChange("following")}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300",
                  feedType === "following"
                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/30 scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <Users className="h-4 w-4" />
                <span>অনুসরণ (Following)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("explore")}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300",
                  feedType === "explore"
                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/30 scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <Compass className="h-4 w-4" />
                <span>অন্বেষণ (Explore)</span>
              </button>
            </div>
          </div>

          {/* Feed Posts Stream */}
          <div className="space-y-4">
            {postsLoading && posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">পোস্টগুলো লোড হচ্ছে...</p>
              </div>
            ) : feedError && posts.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center space-y-4 border border-white/10 shadow-lg">
                <p className="text-muted-foreground">{feedError}</p>
                <Button
                  variant="outline"
                  onClick={() => fetchFeed(undefined, false, feedType, true)}
                  size="sm"
                  className="rounded-full border-primary/40 text-primary hover:bg-primary/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t("retry") || "আবার চেষ্টা করুন"}
                </Button>
              </div>
            ) : posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map((post, idx) => (
                  <div
                    key={post.id}
                    className="animate-slide-up-spring"
                    style={{ animationDelay: `${Math.min(idx * 0.05, 0.3)}s` }}
                  >
                    <PostCard
                      post={{
                        ...post,
                        createdAt: post.createdAt as any,
                        author: post.author as any,
                        isLiked: post.isLiked,
                      }}
                      user={authUserForCard}
                      idToken={idToken}
                    />
                  </div>
                ))}

                {/* Load More Button */}
                {nextCursor && (
                  <div className="flex justify-center py-6">
                    <Button
                      variant="outline"
                      onClick={() => fetchFeed(nextCursor, true)}
                      disabled={loadingMore}
                      className="rounded-full px-6 border-white/15 hover:border-primary/40 hover:bg-primary/10 shadow-md transition-all duration-200"
                    >
                      {loadingMore ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" />
                      ) : null}
                      <span>{t("load_more") || "আরও দেখুন"}</span>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-10 text-center text-muted-foreground space-y-4 border border-white/10 shadow-lg">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Compass className="h-6 w-6" />
                </div>
                <p className="text-base font-medium text-foreground/90">
                  {feedType === "following"
                    ? "আপনি যাদের অনুসরণ করছেন তাদের কোনো পোস্ট পাওয়া যায়নি।"
                    : "এখনও কোনো পোস্ট প্রকাশিত হয়নি।"}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {feedType === "following"
                    ? "নতুন নতুন বন্ধুদের খুঁজুন অথবা অন্বেষণ ট্যাবে গিয়ে জনপ্রিয় পোস্টগুলো উপভোগ করুন।"
                    : "প্রথম পোস্টটি আপনিই প্রকাশ করুন এবং কমিউনিটির সাথে যুক্ত হন!"}
                </p>
                {feedType === "following" && (
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTabChange("explore")}
                      className="rounded-full border-primary/40 text-primary hover:bg-primary/10 gap-2"
                    >
                      <Compass className="h-4 w-4" />
                      <span>অন্বেষণ ট্যাবে যান</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Suggested Accounts */}
        <aside className="hidden md:block md:col-span-1 space-y-6">
          <div className="glass-card rounded-2xl p-5 border border-white/10 shadow-lg relative overflow-hidden group">
            {/* Top gradient accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent via-primary to-accent/40 opacity-80" />

            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent animate-pulse" />
                <h2 className="font-bold text-sm tracking-wide text-foreground/90">
                  {t("suggestions_for_you") || "পরামর্শকৃত একাউন্ট"}
                </h2>
              </div>
            </div>

            <div className="space-y-3.5 pt-4">
              {suggestedUsers.length > 0 ? (
                suggestedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group/user"
                  >
                    <Link
                      href={`/profile/${user.id}`}
                      className="flex items-center gap-3 overflow-hidden min-w-0"
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-primary/20 group-hover/user:ring-primary/60 transition-all">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="font-semibold bg-primary/10 text-primary text-xs">
                          {user.name?.[0]?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="overflow-hidden min-w-0">
                        <p className="font-bold truncate group-hover/user:text-primary transition-colors text-sm">
                          {user.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{user.handle}
                        </p>
                      </div>
                    </Link>

                    <Link href={`/profile/${user.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2.5 rounded-full hover:bg-primary/15 hover:text-primary transition-colors"
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        <span>দেখুন</span>
                      </Button>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  {t("no_suggestions") || "কোনো নতুন পরামর্শ নেই"}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

