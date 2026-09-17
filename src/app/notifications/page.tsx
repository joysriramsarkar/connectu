"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Notification as NotificationType } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, Heart, MessageCircle, User as UserIcon, CheckCheck } from "lucide-react";
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useI18n } from '@/context/i18n';
import { useAuth } from '@/context/auth';

const NotificationIcon = ({ type }: { type: NotificationType['type'] }) => {
  switch (type) {
    case 'like':
      return <Heart className="w-5 h-5 text-red-500" />;
    case 'comment':
      return <MessageCircle className="w-5 h-5 text-blue-500" />;
    case 'follow':
      return <UserIcon className="w-5 h-5 text-green-500" />;
    default:
      return <Bell className="w-5 h-5 text-gray-500" />;
  }
};

const NotificationMessage = ({ notification }: { notification: NotificationType }) => {
  const { t } = useI18n();
  switch (notification.type) {
    case 'like':
      return (
        <p>
          <Link
            href={`/profile/${notification.sender.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-bold hover:underline"
          >
            {notification.sender.name}
          </Link>{' '}
          {t('liked_your_post')}{' "'}
          <span className="italic">
            {notification.postContent ? `${notification.postContent.substring(0, 30)}...` : 'আপনার পোস্ট'}
          </span>
          &quot;
        </p>
      );
    case 'comment':
      return (
        <p>
          <Link
            href={`/profile/${notification.sender.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-bold hover:underline"
          >
            {notification.sender.name}
          </Link>{' '}
          {t('commented_on_your_post')}{' "'}
          <span className="italic">
            {notification.postContent ? `${notification.postContent.substring(0, 30)}...` : 'আপনার পোস্ট'}
          </span>
          &quot;
        </p>
      );
    case 'follow':
      return (
        <p>
          <Link
            href={`/profile/${notification.sender.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-bold hover:underline"
          >
            {notification.sender.name}
          </Link>{' '}
          {t('started_following_you')}
        </p>
      );
    default:
      return <p>{t('new_notification')}</p>;
  }
};

export default function NotificationsPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { firebaseUser, idToken, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!idToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/notifications", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser) {
      router.push('/login');
      return;
    }
    fetchNotifications();
  }, [authLoading, firebaseUser, router, fetchNotifications]);

  const handleNotificationClick = async (notification: NotificationType) => {
    if (!idToken) return;

    if (!notification.read) {
      // Optimistically update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      try {
        await fetch(`/api/v1/notifications/${notification.id}/read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${idToken}` },
        });
      } catch (err) {
        console.error("Error marking read:", err);
      }
    }

    if (notification.type === 'follow') {
      router.push(`/profile/${notification.sender.id}`);
    } else if (notification.postId) {
      router.push(`/post/${notification.postId}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!idToken || markingAll) return;
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${idToken}` },
      });
    } catch (err) {
      console.error("Error marking all read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('notifications')}</h1>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
            className="flex items-center gap-2"
          >
            <CheckCheck className="w-4 h-4" />
            <span>সব পঠিত হিসেবে চিহ্নিত করুন</span>
          </Button>
        )}
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={cn(
                "cursor-pointer transition-colors hover:bg-accent/50",
                !notification.read && "bg-primary/5 border-primary/40 shadow-sm"
              )}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <NotificationIcon type={notification.type} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/profile/${notification.sender.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={notification.sender.avatar}
                          alt={notification.sender.name}
                        />
                        <AvatarFallback>
                          {notification.sender.name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div>
                      <NotificationMessage notification={notification} />
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.createdAt
                          ? formatDistanceToNow(new Date(notification.createdAt as any), {
                              addSuffix: true,
                              locale: locale === 'bn' ? bn : enUS,
                            })
                          : ''}
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
