/**
 * GET    /api/v1/posts/:postId  — fetch single post with author, like & bookmark status
 * DELETE /api/v1/posts/:postId  — soft-delete post (author only)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { query } from "@/lib/neon";

type Params = { params: Promise<{ postId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { postId } = await params;

  try {
    const auth = request.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    const currentUserId = token ? await verifyFirebaseToken(token) : null;

    const result = await query<{
      id: string;
      author_id: string;
      content: string;
      image: string | null;
      likes: number;
      comments: number;
      created_at: Date;
      author_name: string;
      author_handle: string;
      author_avatar: string;
      author_cover_photo: string;
      author_bio: string;
      author_followers: number;
      author_following: number;
    }>(
      `SELECT p.id, p.author_id, p.content, p.image, p.likes, p.comments, p.created_at,
              u.name AS author_name, u.handle AS author_handle, u.avatar AS author_avatar,
              u.cover_photo AS author_cover_photo, u.bio AS author_bio,
              u.followers AS author_followers, u.following AS author_following
       FROM posts p
       JOIN users u ON u.id = p.author_id
       WHERE p.id = $1 AND p.status = 'active'`,
      [postId]
    );

    if (!result.rowCount) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const row = result.rows[0];

    // Check if viewer has liked or bookmarked this post
    let hasLiked = false;
    let isBookmarked = false;

    if (currentUserId) {
      const likeCheck = await query(
        "SELECT 1 FROM likes WHERE post_id = $1 AND user_id = $2",
        [postId, currentUserId]
      );
      hasLiked = (likeCheck.rowCount ?? 0) > 0;

      const bookmarkCheck = await query(
        "SELECT 1 FROM bookmarks WHERE post_id = $1 AND user_id = $2",
        [postId, currentUserId]
      );
      isBookmarked = (bookmarkCheck.rowCount ?? 0) > 0;
    }

    const post = {
      id: row.id,
      authorId: row.author_id,
      author: {
        id: row.author_id,
        name: row.author_name,
        handle: row.author_handle,
        avatar: row.author_avatar,
        coverPhoto: row.author_cover_photo,
        bio: row.author_bio,
        followers: row.author_followers,
        following: row.author_following,
      },
      content: row.content,
      image: row.image ?? undefined,
      likes: row.likes,
      comments: row.comments,
      createdAt: row.created_at.toISOString(),
      hasLiked,
      isBookmarked,
    };

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error fetching single post:", error);
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }
}

// DELETE — author soft-delete
export async function DELETE(request: NextRequest, { params }: Params) {
  const { postId } = await params;
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const currentUserId = await verifyFirebaseToken(token);

  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const postCheck = await query<{ author_id: string }>(
      "SELECT author_id FROM posts WHERE id = $1",
      [postId]
    );

    if (!postCheck.rowCount) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (postCheck.rows[0].author_id !== currentUserId) {
      return NextResponse.json({ error: "Forbidden: You are not the author" }, { status: 403 });
    }

    await query("UPDATE posts SET status = 'deleted' WHERE id = $1", [postId]);

    return NextResponse.json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
