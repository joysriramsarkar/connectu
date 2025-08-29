
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from '@/lib/firebase';
import { User } from '@/lib/data';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const profileSchema = z.object({
  name: z.string().min(1, 'নাম আবশ্যক'),
  handle: z.string().min(1, 'হ্যান্ডেল আবশ্যক').regex(/^[a-zA-Z0-9_]+$/, 'হ্যান্ডেল শুধুমাত্র অক্ষর, সংখ্যা এবং আন্ডারস্কোর ধারণ করতে পারে'),
  bio: z.string().max(160, 'বায়ো ১৬০ অক্ষরের বেশি হতে পারবে না').optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function EditProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const profileData = { id: userDoc.id, ...userDoc.data() } as User;
          setUserProfile(profileData);
          reset(profileData);
          setAvatarPreview(profileData.avatar);
          setCoverPreview(profileData.coverPhoto);
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router, reset]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };
  
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    
    try {
        let avatarUrl = userProfile?.avatar;
        let coverUrl = userProfile?.coverPhoto;

        if (avatarFile) {
            const avatarRef = ref(storage, `avatars/${currentUser.uid}`);
            await uploadBytes(avatarRef, avatarFile);
            avatarUrl = await getDownloadURL(avatarRef);
        }

        if (coverFile) {
            const coverRef = ref(storage, `covers/${currentUser.uid}`);
            await uploadBytes(coverRef, coverFile);
            coverUrl = await getDownloadURL(coverRef);
        }

      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        name: data.name,
        handle: data.handle,
        bio: data.bio,
        avatar: avatarUrl,
        coverPhoto: coverUrl
      });

      toast({
        title: 'সফল',
        description: 'আপনার প্রোফাইল সফলভাবে আপডেট করা হয়েছে।',
      });
      router.push(`/profile/${currentUser.uid}`);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: 'destructive',
        title: 'ত্রুটি',
        description: 'প্রোফাইল আপডেট করার সময় একটি সমস্যা হয়েছে।',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  if (!userProfile) {
    return (
        <div className="flex items-center justify-center h-screen">
            <p>প্রোফাইল খুঁজে পাওয়া যায়নি।</p>
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> ফিরে যান
        </Button>
        <form onSubmit={handleSubmit(onSubmit)}>
            <Card>
                <CardHeader>
                    <CardTitle>প্রোফাইল সম্পাদনা করুন</CardTitle>
                    <CardDescription>আপনার প্রোফাইলের তথ্য এখানে পরিবর্তন করুন।</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Label>কভার ফটো</Label>
                        <div className="mt-2 aspect-[3/1] relative w-full rounded-lg overflow-hidden bg-muted">
                            {coverPreview && <Image src={coverPreview} alt="কভার ফটো প্রিভিউ" fill className="object-cover" />}
                        </div>
                        <Input id="coverPhoto" type="file" onChange={handleCoverChange} className="mt-2" accept="image/*" disabled={isSubmitting}/>
                    </div>

                     <div>
                        <Label>প্রোফাইল ফটো</Label>
                        <div className="mt-2 flex items-center gap-4">
                            <Avatar className="h-24 w-24">
                                {avatarPreview && <AvatarImage src={avatarPreview} alt={userProfile.name} />}
                                <AvatarFallback>{userProfile.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                             <Input id="avatar" type="file" onChange={handleAvatarChange} className="max-w-xs" accept="image/*" disabled={isSubmitting}/>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="name">নাম</Label>
                        <Input id="name" {...register('name')} disabled={isSubmitting} />
                        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="handle">হ্যান্ডেল</Label>
                        <Input id="handle" {...register('handle')} disabled={isSubmitting} />
                        {errors.handle && <p className="text-sm text-destructive">{errors.handle.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio">বায়ো</Label>
                        <Textarea id="bio" {...register('bio')} disabled={isSubmitting} />
                        {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'সংরক্ষণ করা হচ্ছে...' : 'সংরক্ষণ করুন'}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    </div>
  );
}
