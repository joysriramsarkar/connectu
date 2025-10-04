
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
import { useI18n } from '@/context/i18n';


const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  handle: z.string().min(1, 'Handle is required').regex(/^[a-zA-Z0-9_]+$/, 'Handle can only contain letters, numbers, and underscores'),
  bio: z.string().max(160, 'Bio cannot be more than 160 characters').optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function EditProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
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
    // Update zod schema messages with translations
    profileSchema.extend({
        name: z.string().min(1, t('name_required')),
        handle: z.string().min(1, t('handle_required')).regex(/^[a-zA-Z0-9_]+$/, t('handle_validation')),
        bio: z.string().max(160, t('bio_validation')).optional(),
    });
   }, [t]);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        if (!db) {
            setLoading(false);
            return;
        }
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
  }, [router, reset, t]);

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
    if (!currentUser || !userProfile || !storage || !db) return;
    setIsSubmitting(true);
    
    try {
        let avatarUrl = userProfile.avatar;
        let coverUrl = userProfile.coverPhoto;

        if (avatarFile) {
            const avatarRef = ref(storage, `avatars/${currentUser.uid}`);
            const snapshot = await uploadBytes(avatarRef, avatarFile);
            avatarUrl = await getDownloadURL(snapshot.ref);
        }

        if (coverFile) {
            const coverRef = ref(storage, `covers/${currentUser.uid}`);
            const snapshot = await uploadBytes(coverRef, coverFile);
            coverUrl = await getDownloadURL(snapshot.ref);
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
        title: t('success_title'),
        description: t('profile_update_success'),
      });
      router.push(`/profile/${currentUser.uid}`);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: 'destructive',
        title: t('error_title'),
        description: t('profile_update_error'),
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
            <p>{t('profile_not_found')}</p>
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('back_button')}
        </Button>
        <form onSubmit={handleSubmit(onSubmit)}>
            <Card>
                <CardHeader>
                    <CardTitle>{t('edit_profile')}</CardTitle>
                    <CardDescription>{t('profile_update_description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Label>{t('cover_photo')}</Label>
                        <div className="mt-2 aspect-[3/1] relative w-full rounded-lg overflow-hidden bg-muted">
                            {coverPreview && <Image src={coverPreview} alt={t('cover_photo')} fill className="object-cover" />}
                        </div>
                        <Input id="coverPhoto" type="file" onChange={handleCoverChange} className="mt-2" accept="image/*" disabled={isSubmitting}/>
                    </div>

                     <div>
                        <Label>{t('profile_photo')}</Label>
                        <div className="mt-2 flex items-center gap-4">
                            <Avatar className="h-24 w-24">
                                {avatarPreview && <AvatarImage src={avatarPreview} alt={userProfile.name} />}
                                <AvatarFallback>{userProfile.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                             <Input id="avatar" type="file" onChange={handleAvatarChange} className="max-w-xs" accept="image/*" disabled={isSubmitting}/>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('name')}</Label>
                        <Input id="name" {...register('name')} disabled={isSubmitting} />
                        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="handle">{t('handle')}</Label>
                        <Input id="handle" {...register('handle')} disabled={isSubmitting} />
                        {errors.handle && <p className="text-sm text-destructive">{errors.handle.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio">{t('bio')}</Label>
                        <Textarea id="bio" {...register('bio')} disabled={isSubmitting} />
                        {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? t('saving') : t('save')}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    </div>
  );
}
