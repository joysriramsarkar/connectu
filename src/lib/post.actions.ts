"use server";

import { revalidatePath } from "next/cache";
import { query, withTransaction } from "@/lib/neon";
import { getTokenFromHeaders, requireCurrentUserId } from "@/lib/auth";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { Comment } from "@/lib/data";

// ---------------------------------------------------------------------------
// toggleLike — SECURITY FIX
//
// Before: userId and authorId were accepted from the client, meaning any
// caller could forge likes on behalf of any user.
//
// After: the server extracts the Firebase ID token from the request header,
// verifies it, and uses the resulting UID as the actor. The client only
// provides postId and path.
// ---------------------------------------------------------------------------

interface LikeParams {
  postId: string;
  /** Firebase ID token — obtained client-side via `user.getIdToken()` */
  idToken: string;
  path: string;
}

export async function toggleLike({ postId, idToken, path }: LikeParams) {
  // 1. Verify token server-side — never trust client-supplied userId
  const userId = await verifyFirebaseToken(idToken);
  if (!userId) {
    throw new Error("Unauthorized: invalid or missing authentication token.");
  }

  try {
    await withTransaction(async (client) => {
      // 2. Verify post exists and get the author
      const postResult = await client.query<{ author_id: string }>(
        "SELECT author_id FROM posts WHERE id = $1",
        [postId],
      );
      if (!postResult.rowCount) {
        throw new Error("Post not found.");
      }
      const authorId = postResult.rows[0].author_id;

      // 3. Idempotent like: INSERT ... ON CONFLICT DO NOTHING
      const existingLike = await client.query(
        "SELECT 1 FROM likes WHERE post_id = $1 AND user_id = $2",
        [postId, userId],
      );

      if (existingLike.rowCount) {
        // Unlike
        const deleted = await client.query(
          "DELETE FROM likes WHERE post_id = $1 AND user_id = $2",
          [postId, userId],
        );
        if ((deleted.rowCount ?? 0) > 0) {
          await client.query(
            "UPDATE posts SET likes = GREATEST(likes - 1, 0) WHERE id = $1",
            [postId],
          );
        }
      } else {
        // Like — idempotent insert
        const inserted = await client.query(
          "INSERT INTO likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [postId, userId],
        );
        if ((inserted.rowCount ?? 0) > 0) {
          await client.query(
            "UPDATE posts SET likes = likes + 1 WHERE id = $1",
            [postId],
          );
          // Notify author (skip self-like)
          if (userId !== authorId) {
            await client.query(
              "INSERT INTO notifications (type, sender_id, recipient_id, post_id) VALUES ('like', $1, $2, $3)",
              [userId, authorId, postId],
            );
          }
        }
      }
    });

    revalidatePath(path);
  } catch (error) {
    console.error("Error toggling like:", error);
    throw new Error("Failed to toggle like.");
  }
}

// ---------------------------------------------------------------------------
// addComment — SECURITY FIX
//
// Before: userId and authorId were accepted from the client.
// After: userId derived from verified Firebase ID token.
// ---------------------------------------------------------------------------

interface CommentParams {
  postId: string;
  /** Firebase ID token */
  idToken: string;
  content: string;
  path: string;
}

export async function addComment({ postId, idToken, content, path }: CommentParams) {
  // 1. Verify token
  const userId = await verifyFirebaseToken(idToken);
  if (!userId) {
    throw new Error("Unauthorized: invalid or missing authentication token.");
  }

  // 2. Validate input
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 1000) {
    throw new Error("Comment must be between 1 and 1000 characters.");
  }

  try {
    await withTransaction(async (client) => {
      // 3. Verify post exists and get author
      const postResult = await client.query<{ author_id: string }>(
        "SELECT author_id FROM posts WHERE id = $1",
        [postId],
      );
      if (!postResult.rowCount) {
        throw new Error("Post not found.");
      }
      const authorId = postResult.rows[0].author_id;

      await client.query(
        "INSERT INTO comments (post_id, author_id, content) VALUES ($1, $2, $3)",
        [postId, userId, trimmed],
      );
      await client.query(
        "UPDATE posts SET comments = comments + 1 WHERE id = $1",
        [postId],
      );
      if (userId !== authorId) {
        await client.query(
          "INSERT INTO notifications (type, sender_id, recipient_id, post_id) VALUES ('comment', $1, $2, $3)",
          [userId, authorId, postId],
        );
      }
    });

    revalidatePath(path);
  } catch (error) {
    console.error("Error adding comment:", error);
    throw new Error("Failed to add comment.");
  }
}

// ---------------------------------------------------------------------------
// getComments — no auth required for public posts
// ---------------------------------------------------------------------------

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