"use server";

import { revalidatePath } from "next/cache";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb"; 
import { Comment } from "@/lib/data";

interface ToggleLikeParams {
    postId: string;
    userId: string;
    authorId: string;
    path: string;
}

export async function toggleLike({ postId, userId, authorId, path }: ToggleLikeParams) {
    try {
        const client = await clientPromise;
        const db = client.db();

        const postObjectId = new ObjectId(postId);
        const userObjectId = new ObjectId(userId);

        const existingLike = await db.collection('likes').findOne({
            postId: postObjectId,
            userId: userObjectId,
        });

        if (existingLike) {
            // Unlike
            await db.collection('likes').deleteOne({ _id: existingLike._id });
            await db.collection('posts').updateOne({ _id: postObjectId }, { $inc: { likes: -1 } });
        } else {
            // Like
            await db.collection('likes').insertOne({
                postId: postObjectId,
                userId: userObjectId,
                createdAt: new Date(),
            });
            await db.collection('posts').updateOne({ _id: postObjectId }, { $inc: { likes: 1 } });

            // Create notification if not liking own post
            if (userId !== authorId) {
                await db.collection('notifications').insertOne({
                    type: 'like',
                    senderId: userObjectId,
                    recipientId: new ObjectId(authorId),
                    postId: postObjectId,
                    createdAt: new Date(),
                    read: false,
                });
            }
        }

        revalidatePath(path);
    } catch (error) {
        console.error("Error toggling like:", error);
        throw new Error("Failed to toggle like.");
    }
}

export async function addComment({ postId, userId, authorId, content, path }: { postId: string; userId: string; authorId: string; content: string; path: string; }) {
    try {
        const client = await clientPromise;
        const db = client.db();

        const postObjectId = new ObjectId(postId);
        const userObjectId = new ObjectId(userId);

        await db.collection('comments').insertOne({
            postId: postObjectId,
            authorId: userObjectId,
            content,
            createdAt: new Date(),
        });

        await db.collection('posts').updateOne({ _id: postObjectId }, { $inc: { comments: 1 } });

        // Create notification if not commenting on own post
        if (userId !== authorId) {
            await db.collection('notifications').insertOne({
                type: 'comment',
                senderId: userObjectId,
                recipientId: new ObjectId(authorId),
                postId: postObjectId,
                createdAt: new Date(),
                read: false,
            });
        }

        revalidatePath(path);
    } catch (error) {
        console.error("Error adding comment:", error);
        throw new Error("Failed to add comment.");
    }
}

export async function getComments(postId: string): Promise<Comment[]> {
    try {
        const client = await clientPromise;
        const db = client.db();

        const postObjectId = new ObjectId(postId);

        const comments = await db.collection('comments').aggregate([
            { $match: { postId: postObjectId } },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'authorId',
                    foreignField: '_id',
                    as: 'author'
                }
            },
            { $unwind: '$author' },
            {
                $project: { // প্রজেক্ট করে ডেটা মডেল অনুযায়ী সাজানো হচ্ছে
                    _id: 1,
                    content: 1,
                    createdAt: 1,
                    author: 1
                }
            }
        ]).toArray();

        return JSON.parse(JSON.stringify(comments)) as Comment[];
    } catch (error) {
        console.error("Error fetching comments:", error);
        return [];
    }
}