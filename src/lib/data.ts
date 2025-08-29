
import type { Timestamp } from "firebase/firestore";

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
}

export type Message = {
  id: string;
  senderId: string;
  content: string;
  timestamp: Timestamp;
}

export type Conversation = {
  id:string;
  participant: User;
  participants: string[];
  lastMessage: string;
  lastMessageTimestamp: Timestamp;
}

export type Notification = {
    id: string;
    type: 'like' | 'comment' | 'follow';
    sender: User;
    recipientId: string;
    postId?: string;
    postContent?: string;
    createdAt: Timestamp;
    read: boolean;
}
