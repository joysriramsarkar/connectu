"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Heart,
  MessageCircle,
  Send,
  Copy,
  Loader2,
  Bookmark,
  MoreHorizontal,
  Trash2,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { bn, enUS } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { CommentSheet } from "./comment-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/context/i18n";

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 512" {...props}>
    <path fill="#0866FF" d="M512 256C512 114.6 397.4 0 256 0S0 114.6 0 256C0 376 82.7 476.8 194.2 504.5V334.2H137.4V256h56.8v-60.3c0-56.1 33.4-87.2 84.5-87.2c24.6 0 51.3 4.4 51.3 4.4v68.5h-39.3c-27.2 0-35.6 16.3-35.6 34.5V256h76.2l-12.2 78.2h-64V504.5C429.3 476.8 512 376 512 256z" />
  </svg>
);
const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 512" {...props}>
    <path fill="#000000" d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" />
  </svg>
);
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 512" {...props}>
    <path fill="#25D366" d="M413.2 98.8c-48-48-111.4-73.2-179.3-73.2-138.3 0-250 111.7-250 250 0 45.4 12.3 88.5 35.1 126.4l-37.4 136.3 139.5-36.6c36.2 21.1 76.8 32.2 117.8 32.2h.1c138.2 0 249.9-111.7 249.9-250 .1-67.8-25.2-131.2-73.1-179.1zm-157.3 351.8h-.1c-34.9 0-68.9-9.1-98.8-26.3l-7.1-4.2-73.4 19.3 19.6-71.5-4.6-7.3c-18.3-29.2-27.9-63.3-27.9-98.8 0-110.1 89.2-199.3 199.4-199.3 54.5 0 105.7 21.3 144.1 59.7 38.4 38.4 59.7 89.6 59.7 144.1-.1 110.1-89.3 199.3-199.3 199.3z" />
  </svg>
);

interface PostCardUser {
  id: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface PostCardProps {
  post: Post & { isLiked?: boolean; hasLiked?: boolean; isBookmarked?: boolean };
  user: PostCardUser | null;
  /** Firebase ID token — required for authenticated actions */
  idToken?: string | null;
}

export function PostCard({ post, user, idToken }: PostCardProps) {
  const { toast } = useToast();
  const { t, locale } = useI18n();

  // Optimistic UI state
  const [optimisticLikes, setOptimisticLikes] = useState({
    count: post.likes || 0,
    isLiked: post.hasLiked || post.isLiked || false,
  });
  const [isLiking, setIsLiking] = useState(false);
  const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked || false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAuthor = user?.id && post.author?.id && user.id === post.author.id;

  const handleLikeToggle = async () => {
    if (!user?.id || !post.id || !post.author || !idToken) return;

    const wasLiked = optimisticLikes.isLiked;
    setOptimisticLikes((prev) => ({
      count: wasLiked ? prev.count - 1 : prev.count + 1,
      isLiked: !wasLiked,
    }));
    setIsLiking(true);

    try {
      const method = wasLiked ? "DELETE" : "PUT";
      const response = await fetch(`/api/v1/posts/${post.id}/like`, {
        method,
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!response.ok) {
        throw new Error("Like request failed");
      }
    } catch (err) {
      setOptimisticLikes((prev) => ({
        count: wasLiked ? prev.count + 1 : prev.count - 1,
        isLiked: wasLiked,
      }));
      toast({
        variant: "destructive",
        title: t("error_title"),
        description: t("like_failed") || "লাইক করতে সমস্যা হয়েছে।",
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmarkToggle = async () => {
    if (!user?.id || !post.id || !idToken) return;
    const wasBookmarked = isBookmarked;
    setIsBookmarked(!wasBookmarked);
    setIsBookmarking(true);

    try {
      const method = wasBookmarked ? "DELETE" : "PUT";
      const res = await fetch(`/api/v1/posts/${post.id}/bookmark`, {
        method,
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error();
      toast({
        title: wasBookmarked
          ? "সংরক্ষণ থেকে সরানো হয়েছে"
          : "পোস্টটি সংরক্ষণ করা হয়েছে",
      });
    } catch (err) {
      setIsBookmarked(wasBookmarked);
      toast({
        variant: "destructive",
        title: t("error_title"),
        description: "বুকমার্ক পরিবর্তন ব্যর্থ হয়েছে।",
      });
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleDeletePost = async () => {
    if (!user?.id || !post.id || !idToken || isDeleting) return;
    if (!confirm("আপনি কি নিশ্চিতভাবে এই পোস্টটি মুছে ফেলতে চান?")) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/posts/${post.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error();
      setIsDeleted(true);
      toast({
        title: "পোস্ট মুছে ফেলা হয়েছে",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("error_title"),
        description: "পোস্ট মুছতে ব্যর্থ হয়েছে।",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReportPost = async () => {
    if (!user?.id || !post.id || !idToken) return;
    try {
      const res = await fetch("/api/v1/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          targetType: "post",
          targetId: post.id,
          reason: "inappropriate content",
          details: "Reported by user from feed",
        }),
      });
      if (res.ok) {
        toast({
          title: "রিপোর্ট জমা হয়েছে",
          description: "আমাদের মডারেশন টিম এটি পর্যালোচনা করবে।",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: t("error_title"),
        description: "রিপোর্ট সাবমিট করা যায়নি।",
      });
    }
  };

  const handleShare = (platform: "facebook" | "twitter" | "whatsapp" | "copy") => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    const text = encodeURIComponent(`"${post.content}" - ${post.author?.name ?? ""}`);
    let shareUrl = "";

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${text}`;
        break;
      case "whatsapp":
        shareUrl = `https://api.whatsapp.com/send?text=${text}%20${encodeURIComponent(postUrl)}`;
        break;
      case "copy":
        navigator.clipboard.writeText(postUrl);
        toast({
          title: t("copy_link"),
          description: t("copy_link_description"),
        });
        return;
    }
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  if (isDeleted) {
    return null;
  }

  const formattedDate = post.createdAt
    ? formatDistanceToNow(new Date(post.createdAt as any), {
        addSuffix: true,
        locale: locale === "bn" ? bn : enUS,
      })
    : t("a_moment_ago");

  // Skeleton state (no author yet)
  if (!post.author) {
    return (
      <div className="glass-card rounded-2xl p-5 border border-white/10 shadow-md animate-pulse">
        <div className="flex items-center gap-3.5">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-white/10">...</AvatarFallback>
          </Avatar>
          <div className="w-full space-y-2">
            <div className="h-4 w-2/5 rounded-full bg-white/10" />
            <div className="h-3 w-1/4 rounded-full bg-white/5" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-4 w-4/5 rounded-full bg-white/10" />
          <div className="h-4 w-3/5 rounded-full bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <>
      <article className="glass-card rounded-2xl p-5 border border-white/10 shadow-md hover:shadow-2xl hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group/card">
        {/* Subtle hover gradient reflection */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover/card:bg-primary/10 transition-colors duration-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${post.author.id}`} className="relative group/avatar">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20 group-hover/avatar:ring-primary/60 transition-all duration-300">
                <AvatarImage src={post.author.avatar} alt={post.author.name} />
                <AvatarFallback className="font-semibold bg-primary/10 text-primary">
                  {post.author.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <Link
                href={`/profile/${post.author.id}`}
                className="font-bold hover:text-primary transition-colors text-sm sm:text-base inline-block"
              >
                {post.author.name}
              </Link>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span>@{post.author.handle}</span>
                <span>·</span>
                <span>{formattedDate}</span>
              </p>
            </div>
          </div>

          {/* Post Options Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full hover:bg-white/10 transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-card border border-white/10 shadow-xl backdrop-blur-xl">
              {isAuthor && (
                <DropdownMenuItem
                  onClick={handleDeletePost}
                  disabled={isDeleting}
                  className="text-destructive focus:text-destructive cursor-pointer hover:bg-destructive/10"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>পোস্ট মুছুন</span>
                </DropdownMenuItem>
              )}
              {!isAuthor && (
                <DropdownMenuItem onClick={handleReportPost} className="cursor-pointer hover:bg-white/10">
                  <Flag className="mr-2 h-4 w-4" />
                  <span>রিপোর্ট করুন</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleShare("copy")} className="cursor-pointer hover:bg-white/10">
                <Copy className="mr-2 h-4 w-4" />
                <span>লিঙ্ক কপি করুন</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Post Content */}
        <div className="space-y-3.5 pt-1">
          <p className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed text-foreground/90">
            {post.content}
          </p>

          {post.image && (
            <div className="relative mt-3 aspect-[16/9] w-full rounded-xl overflow-hidden border border-white/10 bg-black/20 shadow-inner group/img">
              <Image
                src={post.image}
                alt="Post image"
                fill
                className="object-cover transition-transform duration-700 ease-out group-hover/img:scale-105"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center w-full pt-4 mt-3 border-t border-white/5 text-muted-foreground text-xs sm:text-sm">
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Like */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex items-center gap-1.5 h-8 px-2.5 rounded-full transition-all duration-200",
                optimisticLikes.isLiked
                  ? "text-rose-500 hover:bg-rose-500/15"
                  : "hover:text-rose-500 hover:bg-rose-500/10"
              )}
              onClick={handleLikeToggle}
              disabled={!user?.id || isLiking || !idToken}
            >
              {isLiking ? (
                <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
              ) : (
                <Heart
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    optimisticLikes.isLiked
                      ? "fill-rose-500 text-rose-500 animate-heart-pop"
                      : "group-hover/card:scale-110"
                  )}
                />
              )}
              <span className="font-medium">
                {optimisticLikes.count.toLocaleString(locale as string)}
              </span>
            </Button>

            {/* Comment */}
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-full hover:text-sky-400 hover:bg-sky-500/10 transition-all duration-200"
              onClick={() => setIsCommentSheetOpen(true)}
              disabled={!user?.id}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="font-medium">
                {(post.comments || 0).toLocaleString(locale as string)}
              </span>
            </Button>

            {/* Share */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1.5 h-8 px-2.5 rounded-full hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="glass-card border border-white/10 shadow-xl backdrop-blur-xl">
                <div className="flex justify-around p-2 gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-blue-500/15"
                    onClick={() => handleShare("facebook")}
                  >
                    <FacebookIcon className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-white/10"
                    onClick={() => handleShare("twitter")}
                  >
                    <TwitterIcon className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-emerald-500/15"
                    onClick={() => handleShare("whatsapp")}
                  >
                    <WhatsAppIcon className="h-5 w-5" />
                  </Button>
                </div>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={() => handleShare("copy")} className="cursor-pointer hover:bg-white/10">
                  <Copy className="mr-2 h-4 w-4" />
                  <span>{t("copy") || "লিঙ্ক কপি করুন"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Bookmark */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBookmarkToggle}
            disabled={!user?.id || isBookmarking || !idToken}
            className={cn(
              "h-8 px-2.5 rounded-full transition-all duration-200",
              isBookmarked
                ? "text-amber-400 hover:bg-amber-500/15"
                : "hover:text-amber-400 hover:bg-amber-500/10"
            )}
            title="সংরক্ষণ করুন"
          >
            {isBookmarking ? (
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
            ) : (
              <Bookmark
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isBookmarked && "fill-amber-400 text-amber-400 scale-110"
                )}
              />
            )}
          </Button>
        </div>
      </article>
      {user?.id && post.id && post.author && (
        <CommentSheet
          postId={post.id as string}
          postAuthorId={post.author.id}
          open={isCommentSheetOpen}
          onOpenChange={setIsCommentSheetOpen}
          idToken={idToken}
        />
      )}
    </>
  );
}
