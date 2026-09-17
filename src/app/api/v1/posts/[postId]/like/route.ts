/**
 * PUT    /api/v1/posts/:postId/like  — like a post (idempotent)
 * DELETE /api/v1/posts/:postId/like  — unlike a post (idempotent)
 *
 * Unlike the old toggleLike server action, these endpoints are idempotent:
 * - PUT twice → post is liked once (not toggled back)
 * - DELETE twice → post is not liked (no error)
 *
 * This prevents accidental unlike on network retry.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { withTransaction } from "@/lib/neon";

type Params = { params: Promise<{ postId: string }> };

async function authenticate(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  return verifyFirebaseToken(token);
}

// PUT — like
export async function PUT(request: NextRequest, { params }: Params) {
  const { postId } = await params;
  const userId = await authenticate(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await withTransaction(async (client) => {
      // Verify post exists
      const post = await client.query<{ author_id: string }>(
        "SELECT author_id FROM posts WHERE id = $1 AND status = 'active'",
        [postId],
      );
      if (!post.rowCount) throw new Error("Post not found");
      const authorId = post.rows[0].author_id;

      // Idempotent insert
      const inserted = await client.query(
        "INSERT INTO likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [postId, userId],
      );

      // Only update counter if a new row was inserted
      if ((inserted.rowCount ?? 0) > 0) {
        await client.query("UPDATE posts SET likes = likes + 1 WHERE id = $1", [postId]);
        if (userId !== authorId) {
          await client.query(
            "INSERT INTO notifications (type, sender_id, recipient_id, post_id) VALUES ('like', $1, $2, $3) ON CONFLICT DO NOTHING",
            [userId, authorId, postId],
          );
        }
      }
    });

    return NextResponse.json({ liked: true });
  } catch (error: any) {
    if (error?.message === "Post not found") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    console.error("Like error:", error);
    return NextResponse.json({ error: "Failed to like post" }, { status: 500 });
  }
}

// DELETE — unlike
export async function DELETE(request: NextRequest, { params }: Params) {
  const { postId } = await params;
  const userId = await authenticate(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await withTransaction(async (client) => {
      const deleted = await client.query(
        "DELETE FROM likes WHERE post_id = $1 AND user_id = $2",
        [postId, userId],
      );
      // Only decrement if a row was actually deleted
      if ((deleted.rowCount ?? 0) > 0) {
        await client.query(
          "UPDATE posts SET likes = GREATEST(likes - 1, 0) WHERE id = $1",
          [postId],
        );
      }
    });

    return NextResponse.json({ liked: false });
  } catch (error) {
    console.error("Unlike error:", error);
    return NextResponse.json({ error: "Failed to unlike post" }, { status: 500 });
  }
}
