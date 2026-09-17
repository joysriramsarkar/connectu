"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, Hash, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateRelevantHashtags } from "@/ai/flows/generate-relevant-hashtags";
import { Badge } from "./ui/badge";
import { User } from "@/lib/data";

import Image from "next/image";
import { useI18n } from "@/context/i18n";

const postSchema = z.object({
  content: z
    .string()
    .min(1, { message: "Post cannot be empty." })
    .max(2000, { message: "Post cannot be more than 2000 characters." }),
});

interface CreatePostProps {
  user: User;
  /** Firebase ID token for authenticated server requests */
  idToken: string | null;
  onPostCreated: () => void;
}

export function CreatePost({ user, idToken, onPostCreated }: CreatePostProps) {
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t } = useI18n();

  const form = useForm<z.infer<typeof postSchema>>({
    resolver: zodResolver(postSchema),
    defaultValues: { content: "" },
  });

  useEffect(() => {
    const newResolver = zodResolver(
      z.object({
        content: z
          .string()
          .min(1, { message: t("content_empty_error") })
          .max(2000, { message: t("content_length_error") }),
      }),
    );
    form.reset(undefined, { resolver: newResolver } as any);
  }, [t, form]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Basic client-side validation (server will also validate)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: t("error_title"),
          description: t("image_too_large") || "ছবি ১০ MB-এর বেশি হতে পারবে না।",
        });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleGenerateHashtags = async () => {
    const postContent = form.getValues("content");
    if (!postContent.trim()) {
      toast({
        variant: "destructive",
        title: t("error_title"),
        description: t("generate_hashtags_prompt"),
      });
      return;
    }
    setIsGenerating(true);
    setHashtags([]);
    try {
      const result = await generateRelevantHashtags({ postContent });
      setHashtags(result.hashtags);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: t("error_title"),
        description: t("hashtag_generation_failed"),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const addHashtagToContent = (tag: string) => {
    const currentContent = form.getValues("content");
    form.setValue("content", `${currentContent} ${tag}`.trim());
  };

  async function onSubmit(values: z.infer<typeof postSchema>) {
    if (!idToken) {
      toast({
        variant: "destructive",
        title: t("error_title"),
        description: t("create_post_error_login"),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload image via local media upload endpoint if selected
      let imageUrl: string | undefined;
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const upRes = await fetch("/api/v1/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          body: formData,
        });

        if (!upRes.ok) {
          const upErr = await upRes.json().catch(() => ({}));
          throw new Error(upErr.error || "Image upload failed");
        }

        const upData = await upRes.json();
        imageUrl = upData.url;
      }

      // 2. Create post via authenticated API route (author derived from token server-side)
      const response = await fetch("/api/v1/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          content: values.content,
          image: imageUrl,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create post");
      }

      toast({
        title: t("post_success_title"),
        description: t("post_success_description"),
      });
      form.reset();
      setHashtags([]);
      removeImage();
      onPostCreated();
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        variant: "destructive",
        title: t("error_title"),
        description: t("post_create_failed"),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLoading = isGenerating || isSubmitting;

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/10 shadow-lg relative overflow-hidden transition-all duration-300 hover:border-primary/30">
      {/* Top accent gradient bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-accent to-primary/40 opacity-80" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="flex gap-3.5">
            <Avatar className="h-11 w-11 ring-2 ring-primary/25 ring-offset-2 ring-offset-background/50 transition-all duration-300 hover:ring-primary/60">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="font-semibold bg-primary/10 text-primary">
                {user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder={t("whats_on_your_mind") || "আপনার মনে কি চলছে?"}
                        className="resize-none border-none focus-visible:ring-0 text-base md:text-lg p-0 bg-transparent placeholder:text-muted-foreground/60 min-h-[80px]"
                        rows={3}
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {imagePreview && (
                <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-inner group/preview max-h-96">
                  <Image
                    src={imagePreview}
                    alt="Image preview"
                    width={600}
                    height={350}
                    className="object-cover w-full max-h-96 transition-transform duration-500 group-hover/preview:scale-[1.01]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover/preview:opacity-100 transition-opacity" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2.5 right-2.5 h-8 w-8 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform bg-destructive/90 hover:bg-destructive"
                    onClick={removeImage}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 pl-14 animate-slide-up-spring">
              {hashtags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 rounded-full px-3 py-1 text-xs transition-all hover:scale-105 active:scale-95"
                  onClick={() => addHashtagToContent(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center pl-14 pt-2 border-t border-white/5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="rounded-full h-9 px-3 gap-2 hover:bg-primary/15 hover:text-primary transition-all duration-200 active:scale-95"
                onClick={() => imageInputRef.current?.click()}
                disabled={isLoading}
              >
                <ImageIcon className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium hidden sm:inline">ছবি যোগ করুন</span>
              </Button>
              <input
                type="file"
                ref={imageInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />

              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="rounded-full h-9 px-3 gap-2 hover:bg-accent/15 hover:text-accent transition-all duration-200 active:scale-95"
                onClick={handleGenerateHashtags}
                disabled={isLoading}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                ) : (
                  <Hash className="h-4 w-4 text-accent" />
                )}
                <span className="text-xs font-medium hidden sm:inline">হ্যাশট্যাগ AI</span>
              </Button>
            </div>

            <Button
              type="submit"
              className="rounded-full px-6 h-9 font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-95 shadow-md shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              disabled={isLoading || !form.formState.isValid}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              <span>{t("post_button") || "পোস্ট করুন"}</span>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
