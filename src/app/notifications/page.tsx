
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Notification as NotificationType, User } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Bell, Heart, MessageCircle, User as UserIcon } from "lucide-react";
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/context/i18n';

async function getUserProfile(userId: string): Promise<User | null> {
    if (!userId || !db) return null;
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() } as User;
    }
    return null;
}

const NotificationIcon = ({ type }: { type: NotificationType['type'] }) => {
    switch (type) {
        case 'like': return <Heart className="w-5 h-5 text-red-500" />;
        case 'comment': return <MessageCircle className="w-5 h-5 text-blue-500" />;
        case 'follow': return <UserIcon className="w-5 h-5 text-green-500" />;
        default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
}

const NotificationMessage = ({ notification }: { notification: NotificationType }) => {
    const { t } = useI18n();
    switch (notification.type) {
        case 'like':
            return (
                <p>
                    <Link href={`/profile/${notification.sender.id}`} onClick={(e) => e.stopPropagation()} className="font-bold hover:underline">{notification.sender.name}</Link>
                    {' '}{t('liked_your_post')}{' "'}
                    <span className="italic">{notification.postContent?.substring(0, 30)}...</span>&quot;
                </p>
            );
        case 'comment':
            return (
                <p>
                    <Link href={`/profile/${notification.sender.id}`} onClick={(e) => e.stopPropagation()} className="font-bold hover:underline">{notification.sender.name}</Link>
                    {' '}{t('commented_on_your_post')}{' "'}
                    <span className="italic">{notification.postContent?.substring(0, 30)}...</span>&quot;
                </p>
            );
        case 'follow':
            return (
                <p>
                    <Link href={`/profile/${notification.sender.id}`} onClick={(e) => e.stopPropagation()} className="font-bold hover:underline">{notification.sender.name}</Link>
                    {' '}{t('started_following_you')}
                </p>
            );
        default:
            return <p>{t('new_notification')}</p>;
    }
}


export default function NotificationsPage() {
    const router = useRouter();
    const { t, locale } = useI18n();
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [notifications, setNotifications] = useState<NotificationType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!currentUser || !db) return;
        setLoading(true);
        const q = query(
            collection(db, "notifications"),
            where("recipientId", "==", currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const notifs = await Promise.all(snapshot.docs.map(async (doc) => {
                const data = doc.data();
                const sender = await getUserProfile(data.senderId);
                return { id: doc.id, ...data, sender, createdAt: data.createdAt } as NotificationType;
            }));
            const sortedNotifs = notifs.filter(n => n.sender).sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            setNotifications(sortedNotifs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching notifications:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleNotificationClick = async (notification: NotificationType) => {
        if (!db) return;
        if (!notification.read) {
            await updateDoc(doc(db, "notifications", notification.id), { read: true });
        }
        if (notification.type === 'follow') {
            router.push(`/profile/${notification.sender.id}`);
        } else if (notification.postId) {
            router.push(`/post/${notification.postId}`);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }
    

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">{t('notifications')}</h1>
      {notifications.length > 0 ? (
        <div className="space-y-4">
            {notifications.map(notification => (
                 <Card key={notification.id} onClick={() => handleNotificationClick(notification)} className={cn("cursor-pointer hover:bg-accent/50", !notification.read && "bg-primary/10 border-primary")}>
                    <CardContent className="p-4 flex items-start gap-4">
                       <div className="flex-shrink-0">
                           <NotificationIcon type={notification.type} />
                       </div>
                       <div className="flex-1">
                           <div className="flex items-center gap-3">
                               <Link href={`/profile/${notification.sender.id}`} onClick={(e) => e.stopPropagation()}>
                                  <Avatar className="h-10 w-10">
                                      <AvatarImage src={notification.sender.avatar} alt={notification.sender.name} />
                                      <AvatarFallback>{notification.sender.name.substring(0,2)}</AvatarFallback>
                                  </Avatar>
                               </Link>
                               <div>
                                    <NotificationMessage notification={notification} />
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {notification.createdAt ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true, locale: locale === 'bn' ? bn : enUS }) : ''}
                                    </p>
                               </div>
                           </div>
                       </div>
                    </CardContent>
                 </Card>
            ))}
        </div>
      ) : (
        <Card>
            <CardContent className="flex flex-col items-center justify-center text-center p-16 text-muted-foreground">
                <Bell className="w-16 h-16 mb-4" />
                <h2 className="text-xl font-semibold">{t('no_notifications_yet')}</h2>
                <p className="mt-2">{t('new_notifications_will_appear_here')}</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
