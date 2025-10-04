
"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, Hash, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateRelevantHashtags } from "@/ai/flows/generate-relevant-hashtags";
import { Badge } from "./ui/badge";
import { User } from "@/lib/data";
import { db, storage } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Image from "next/image";
import { useI18n } from "@/context/i18n";


const postSchema = z.object({
  content: z.string().min(1, { message: "Post cannot be empty." }).max(280, { message: "Post cannot be more than 280 characters." }),
});

interface CreatePostProps {
    user: User;
    onPostCreated: () => void;
}

export function CreatePost({ user, onPostCreated }: CreatePostProps) {
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
    defaultValues: {
      content: "",
    },
  });

  useEffect(() => {
    const newResolver = zodResolver(z.object({
        content: z.string()
            .min(1, { message: t('content_empty_error') })
            .max(280, { message: t('content_length_error') }),
    }));
    form.reset(undefined, { resolver: newResolver } as any);
  }, [t, form]);
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if(imageInputRef.current) {
        imageInputRef.current.value = "";
    }
  }

  const handleGenerateHashtags = async () => {
    const postContent = form.getValues("content");
    if (!postContent.trim()) {
      toast({
        variant: "destructive",
        title: t('error_title'),
        description: t('generate_hashtags_prompt'),
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
        title: t('error_title'),
        description: t('hashtag_generation_failed'),
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
    if (!user) {
        toast({
            variant: "destructive",
            title: t('error_title'),
            description: t('create_post_error_login'),
        });
        return;
    }
    if (!db || !storage) return;

    setIsSubmitting(true);
    try {
        let imageUrl: string | undefined = undefined;

        if (imageFile) {
            const imageRef = ref(storage, `posts/${user.id}_${Date.now()}`);
            const snapshot = await uploadBytes(imageRef, imageFile);
            imageUrl = await getDownloadURL(snapshot.ref);
        }
        
        const postData: any = {
            authorId: user.id,
            content: values.content,
            createdAt: serverTimestamp(),
            likes: 0,
            comments: 0,
        };

        if (imageUrl) {
            postData.image = imageUrl;
        }

        await addDoc(collection(db, "posts"), postData);

        toast({
          title: t('post_success_title'),
          description: t('post_success_description'),
        });
        form.reset();
        setHashtags([]);
        removeImage();
        onPostCreated();
    } catch (error) {
        console.error("Error creating post: ", error);
         toast({
            variant: "destructive",
            title: t('error_title'),
            description: t('post_create_failed'),
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  const isLoading = isGenerating || isSubmitting;

  return (
    <Card>
      <CardContent className="p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex gap-4">
              <Avatar>
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder={t('whats_on_your_mind')}
                          className="resize-none border-none focus-visible:ring-0 text-lg p-0"
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
                    <div className="relative">
                        <Image src={imagePreview} alt="Image preview" width={500} height={300} className="rounded-lg object-cover w-full max-h-96" />
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 rounded-full"
                            onClick={removeImage}
                            disabled={isLoading}
                        >
                            <X className="h-4 w-4"/>
                        </Button>
                    </div>
                )}
              </div>
            </div>
            
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 pl-16">
                {hashtags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => addHashtagToContent(tag)}>
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pl-16">
              <div className="flex gap-1 text-muted-foreground">
                <Button variant="ghost" size="icon" type="button" onClick={() => imageInputRef.current?.click()} disabled={isLoading}>
                  <ImageIcon className="h-5 w-5" />
                </Button>
                 <input type="file" ref={imageInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                <Button variant="ghost" size="icon" type="button" onClick={handleGenerateHashtags} disabled={isLoading}>
                  {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Hash className="h-5 w-5" />}
                </Button>
              </div>
              <Button type="submit" className="rounded-full" disabled={isLoading || !form.formState.isValid}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('post_button')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
