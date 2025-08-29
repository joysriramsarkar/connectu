
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Image, Hash, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateRelevantHashtags } from "@/ai/flows/generate-relevant-hashtags";
import { Badge } from "./ui/badge";
import { User } from "@/lib/data";


const postSchema = z.object({
  content: z.string().min(1, { message: "পোস্ট খালি থাকতে পারে না।" }).max(280, { message: "পোস্ট ২৮০ অক্ষরের বেশি হতে পারে না।" }),
});

export function CreatePost({ user }: { user: User }) {
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof postSchema>>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      content: "",
    },
  });

  const handleGenerateHashtags = async () => {
    const postContent = form.getValues("content");
    if (!postContent.trim()) {
      toast({
        variant: "destructive",
        title: "ত্রুটি",
        description: "হ্যাশট্যাগ তৈরি করতে কিছু লিখুন।",
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
        title: "ত্রুটি",
        description: "হ্যাশট্যাগ তৈরি করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const addHashtagToContent = (tag: string) => {
    const currentContent = form.getValues("content");
    form.setValue("content", `${currentContent} ${tag}`.trim());
  };

  function onSubmit(values: z.infer<typeof postSchema>) {
    console.log(values);
    toast({
      title: "পোস্ট সফল হয়েছে!",
      description: "আপনার পোস্ট সফলভাবে তৈরি হয়েছে।",
    });
    form.reset();
    setHashtags([]);
  }

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
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Textarea
                        placeholder="আপনার মনে কি চলছে?"
                        className="resize-none border-none focus-visible:ring-0 text-lg"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <div className="flex gap-2 text-muted-foreground">
                <Button variant="ghost" size="icon" type="button">
                  <Image className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" type="button" onClick={handleGenerateHashtags} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Hash className="h-5 w-5" />}
                </Button>
              </div>
              <Button type="submit" className="rounded-full" disabled={isGenerating}>পোস্ট করুন</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
