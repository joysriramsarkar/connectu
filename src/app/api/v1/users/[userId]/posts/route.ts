/**
 * GET /api/v1/users/:userId/posts
 *
 * Returns posts created by a specific user from PostgreSQL.
 * Supports cursor pagination.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { query } from "@/lib/neon";

type Params = { params: Promise<{ userId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { userId } = await params;
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor"); // ISO timestamp
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "10", 10), 1), 50);

  // Optional authentication for hasLiked
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const currentUserId = token ? await verifyFirebaseToken(token) : null;

  try {
    // 1. Fetch user to ensure existence and author object
    const userResult = await query<{
      id: string;
      name: string;
      handle: string;
      avatar: string;
      cover_photo: string;
      bio: string;
      followers: number;
      following: number;
    }>(
      `SELECT id, name, handle, avatar, cover_photo, bio, followers, following
       FROM users WHERE id = $1`,
      [userId]
    );

    if (!userResult.rowCount) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const author = {
      id: userResult.rows[0].id,
      name: userResult.rows[0].name,
      handle: userResult.rows[0].handle,
      avatar: userResult.rows[0].avatar,
      coverPhoto: userResult.rows[0].cover_photo,
      bio: userResult.rows[0].bio,
      followers: userResult.rows[0].followers,
      following: userResult.rows[0].following,
    };

    // 2. Fetch posts
    const queryParams: any[] = [userId, limit + 1];
    let whereClause = "WHERE p.author_id = $1 AND p.status = 'active'";

    if (cursor) {
      queryParams.push(cursor);
      whereClause += ` AND p.created_at < $${queryParams.length}::timestamptz`;
    }

    const postsResult = await query<{
      id: string;
      author_id: string;
      content: string;
      image: string | null;
      likes: number;
      comments: number;
      created_at: Date;
    }>(
      `SELECT p.id, p.author_id, p.content, p.image, p.likes, p.comments, p.created_at
       FROM posts p
       ${whereClause}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT $2`,
      queryParams
    );

    const hasMore = postsResult.rows.length > limit;
    const rawPosts = hasMore ? postsResult.rows.slice(0, limit) : postsResult.rows;
    const postIds = rawPosts.map((p) => p.id);

    // 3. Batch check likes for viewer if authenticated
    let likedPostIds = new Set<string>();
    if (currentUserId && postIds.length > 0) {
      const likesResult = await query<{ post_id: string }>(
        `SELECT post_id FROM likes WHERE user_id = $1 AND post_id = ANY($2::uuid[])`,
        [currentUserId, postIds]
      );
      likedPostIds = new Set(likesResult.rows.map((r) => r.post_id));
    }

    const posts = rawPosts.map((p) => ({
      id: p.id,
      authorId: p.author_id,
      author,
      content: p.content,
      image: p.image ?? undefined,
      likes: p.likes,
      comments: p.comments,
      createdAt: p.created_at.toISOString(),
      hasLiked: likedPostIds.has(p.id),
    }));

    const nextCursor = hasMore && rawPosts.length > 0
      ? rawPosts[rawPosts.length - 1].created_at.toISOString()
      : null;

    return NextResponse.json({ posts, nextCursor });
  } catch (error) {
    console.error("Error fetching user posts:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
