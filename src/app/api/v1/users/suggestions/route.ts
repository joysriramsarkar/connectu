/**
 * GET /api/v1/users/suggestions
 *
 * Returns recommended accounts to follow from PostgreSQL.
 * Excludes accounts the current user already follows, blocked users, and self.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { query } from "@/lib/neon";
import { getCached, setCached } from "@/lib/cache";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const currentUserId = token ? await verifyFirebaseToken(token) : null;

  const cacheKey = `suggestions_${currentUserId || "anon"}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    let result;
    if (currentUserId) {
      result = await query<{
        id: string;
        name: string;
        handle: string;
        avatar: string;
        bio: string;
        followers: number;
      }>(
        `SELECT id, name, handle, avatar, bio, followers
         FROM users
         WHERE id <> $1
           AND id NOT IN (
             SELECT following_id FROM follows WHERE follower_id = $1
           )
           AND id NOT IN (
             SELECT blocked_id FROM blocks WHERE blocker_id = $1
             UNION
             SELECT blocker_id FROM blocks WHERE blocked_id = $1
           )
         ORDER BY followers DESC, created_at DESC
         LIMIT 6`,
        [currentUserId]
      );
    } else {
      result = await query<{
        id: string;
        name: string;
        handle: string;
        avatar: string;
        bio: string;
        followers: number;
      }>(
        `SELECT id, name, handle, avatar, bio, followers
         FROM users
         ORDER BY followers DESC, created_at DESC
         LIMIT 6`
      );
    }

    const responseData = { users: result.rows };
    setCached(cacheKey, responseData, 30);
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
  }
}
