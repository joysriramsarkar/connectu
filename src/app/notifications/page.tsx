
"use client";

import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">বিজ্ঞপ্তিসমূহ</h1>
      <div className="border rounded-lg">
        <div className="flex flex-col items-center justify-center text-center p-16 text-muted-foreground">
            <Bell className="w-16 h-16 mb-4" />
            <h2 className="text-xl font-semibold">এখনও কোনো বিজ্ঞপ্তি নেই</h2>
            <p className="mt-2">আপনার নতুন কোনো নোটিফিকেশন থাকলে এখানে দেখতে পাবেন।</p>
        </div>
      </div>
    </div>
  );
}
