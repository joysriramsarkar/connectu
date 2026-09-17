/**
 * GET /api/v1/bookmarks
 *
 * Returns the current authenticated user's bookmarked posts from PostgreSQL.
 * Supports cursor pagination.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { query } from "@/lib/neon";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const currentUserId = await verifyFirebaseToken(token);

  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor"); // ISO timestamp
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "10", 10), 1), 50);

  try {
    const queryParams: any[] = [currentUserId, limit + 1];
    let whereClause = "WHERE b.user_id = $1 AND p.status = 'active'";

    if (cursor) {
      queryParams.push(cursor);
      whereClause += ` AND b.created_at < $${queryParams.length}::timestamptz`;
    }

    const result = await query<{
      id: string;
      author_id: string;
      content: string;
      image: string | null;
      likes: number;
      comments: number;
      created_at: Date;
      bookmarked_at: Date;
      author_name: string;
      author_handle: string;
      author_avatar: string;
      author_cover_photo: string;
      author_bio: string;
      author_followers: number;
      author_following: number;
    }>(
      `SELECT p.id, p.author_id, p.content, p.image, p.likes, p.comments, p.created_at,
              b.created_at AS bookmarked_at,
              u.name AS author_name, u.handle AS author_handle, u.avatar AS author_avatar,
              u.cover_photo AS author_cover_photo, u.bio AS author_bio,
              u.followers AS author_followers, u.following AS author_following
       FROM bookmarks b
       JOIN posts p ON p.id = b.post_id
       JOIN users u ON u.id = p.author_id
       ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT $2`,
      queryParams
    );

    const hasMore = result.rows.length > limit;
    const rawPosts = hasMore ? result.rows.slice(0, limit) : result.rows;
    const postIds = rawPosts.map((p) => p.id);

    // Likes check for viewer
    let likedPostIds = new Set<string>();
    if (postIds.length > 0) {
      const likesResult = await query<{ post_id: string }>(
        `SELECT post_id FROM likes WHERE user_id = $1 AND post_id = ANY($2::uuid[])`,
        [currentUserId, postIds]
      );
      likedPostIds = new Set(likesResult.rows.map((r) => r.post_id));
    }

    const posts = rawPosts.map((row) => ({
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
      hasLiked: likedPostIds.has(row.id),
      isBookmarked: true,
    }));

    const nextCursor = hasMore && rawPosts.length > 0
      ? rawPosts[rawPosts.length - 1].bookmarked_at.toISOString()
      : null;

    return NextResponse.json({ posts, nextCursor });
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 });
  }
}
