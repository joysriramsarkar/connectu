/**
 * GET /api/v1/users/:userId
 *
 * Returns the public user profile from PostgreSQL.
 * If an Authorization header is provided, includes `isFollowing`.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { query } from "@/lib/neon";

type Params = { params: Promise<{ userId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { userId } = await params;

  try {
    const auth = request.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    const currentUserId = token ? await verifyFirebaseToken(token) : null;

    const userResult = await query<{
      id: string;
      name: string;
      handle: string;
      avatar: string;
      cover_photo: string;
      bio: string;
      followers: number;
      following: number;
      created_at: Date;
    }>(
      `SELECT id, name, handle, avatar, cover_photo, bio, followers, following, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (!userResult.rowCount) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userResult.rows[0];

    // Post count
    const postCountResult = await query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM posts WHERE author_id = $1 AND status = 'active'",
      [userId]
    );
    const postsCount = parseInt(postCountResult.rows[0]?.count ?? "0", 10);

    // Check if following
    let isFollowing = false;
    if (currentUserId && currentUserId !== userId) {
      const followResult = await query(
        "SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2",
        [currentUserId, userId]
      );
      isFollowing = (followResult.rowCount ?? 0) > 0;
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      handle: user.handle,
      avatar: user.avatar,
      coverPhoto: user.cover_photo,
      bio: user.bio,
      followers: user.followers,
      following: user.following,
      postsCount,
      isFollowing,
      createdAt: user.created_at.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 });
  }
}
