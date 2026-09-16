"use server";

import { revalidatePath } from "next/cache";
import { query, withTransaction } from "@/lib/neon";
import { Comment } from "@/lib/data";

interface ToggleLikeParams {
    postId: string;
    userId: string;
    authorId: string;
    path: string;
}

export async function toggleLike({ postId, userId, authorId, path }: ToggleLikeParams) {
    try {
        await withTransaction(async (client) => {
        const existingLike = await client.query("SELECT 1 FROM likes WHERE post_id = $1 AND user_id = $2", [postId, userId]);
        if (existingLike.rowCount) {
            await client.query("DELETE FROM likes WHERE post_id = $1 AND user_id = $2", [postId, userId]);
            await client.query("UPDATE posts SET likes = GREATEST(likes - 1, 0) WHERE id = $1", [postId]);
        } else {
            await client.query("INSERT INTO likes (post_id, user_id) VALUES ($1, $2)", [postId, userId]);
            await client.query("UPDATE posts SET likes = likes + 1 WHERE id = $1", [postId]);
            if (userId !== authorId) {
                await client.query("INSERT INTO notifications (type, sender_id, recipient_id, post_id) VALUES ('like', $1, $2, $3)", [userId, authorId, postId]);
            }
        }
        });

        revalidatePath(path);
    } catch (error) {
        console.error("Error toggling like:", error);
        throw new Error("Failed to toggle like.");
    }
}

export async function addComment({ postId, userId, authorId, content, path }: { postId: string; userId: string; authorId: string; content: string; path: string; }) {
    try {
        await withTransaction(async (client) => {
            await client.query("INSERT INTO comments (post_id, author_id, content) VALUES ($1, $2, $3)", [postId, userId, content]);
            await client.query("UPDATE posts SET comments = comments + 1 WHERE id = $1", [postId]);
            if (userId !== authorId) {
                await client.query("INSERT INTO notifications (type, sender_id, recipient_id, post_id) VALUES ('comment', $1, $2, $3)", [userId, authorId, postId]);
            }
        });

        revalidatePath(path);
    } catch (error) {
        console.error("Error adding comment:", error);
        throw new Error("Failed to add comment.");
    }
}

export async function getComments(postId: string): Promise<Comment[]> {
    try {
        const result = await query<Comment & { author_id: string; created_at: Date }>(
            `SELECT c.id, c.author_id AS "authorId", c.content, c.created_at AS "createdAt",
                    json_build_object('id', u.id, 'name', u.name, 'handle', u.handle, 'avatar', u.avatar,
                    'coverPhoto', u.cover_photo, 'bio', u.bio, 'followers', u.followers, 'following', u.following) AS author
             FROM comments c JOIN users u ON u.id = c.author_id WHERE c.post_id = $1 ORDER BY c.created_at DESC`,
            [postId],
        );
        return result.rows as Comment[];
    } catch (error) {
        console.error("Error fetching comments:", error);
        return [];
    }
}