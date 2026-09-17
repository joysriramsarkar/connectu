/**
 * Shared data types for ConnectU.
 *
 * Note: Timestamp is defined as a flexible union to support both
 * Firebase Firestore Timestamps (for messages still on Firestore)
 * and ISO string timestamps (for PostgreSQL-backed data).
 */

export type Timestamp =
  | { toDate(): Date; seconds: number; nanoseconds: number }  // Firestore Timestamp
  | string                                                      // ISO string (PostgreSQL)
  | Date;

export type User = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  coverPhoto: string;
  bio: string;
  followers: number;
  following: number;
};

export type Post = {
  id: string;
  authorId: string;
  author: User; // This will be populated after fetching
  content: string;
  image?: string;
  likes: number;
  comments: number;
  createdAt: Timestamp;
};

export type Comment = {
  id: string;
  authorId: string;
  author: User;
  content: string;
  createdAt: Timestamp;
};

export type Message = {
  id: string;
  conversationId?: string;
  senderId: string;
  content: string;
  timestamp: Timestamp;
};

export type Conversation = {
  id: string;
  participant: User;
  participants?: string[];
  lastMessage: string;
  lastMessageTimestamp: Timestamp;
};

export type Notification = {
  id: string;
  type: "like" | "comment" | "follow";
  sender: User;
  recipientId: string;
  postId?: string;
  postContent?: string;
  createdAt: Timestamp;
  read: boolean;
};
