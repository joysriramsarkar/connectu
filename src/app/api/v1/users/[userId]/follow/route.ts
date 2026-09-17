/**
 * PUT    /api/v1/users/:userId/follow  — follow a user (idempotent)
 * DELETE /api/v1/users/:userId/follow  — unfollow a user (idempotent)
 * GET    /api/v1/users/:userId/follow  — check if following
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { query, withTransaction } from "@/lib/neon";

type Params = { params: Promise<{ userId: string }> };

async function getActorId(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  return verifyFirebaseToken(token);
}

// GET — check follow status
export async function GET(request: NextRequest, { params }: Params) {
  const { userId: targetUserId } = await params;
  const currentUserId = await getActorId(request);

  if (!currentUserId) {
    return NextResponse.json({ isFollowing: false });
  }

  try {
    const result = await query(
      "SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2",
      [currentUserId, targetUserId]
    );

    return NextResponse.json({ isFollowing: (result.rowCount ?? 0) > 0 });
  } catch (error) {
    console.error("Error checking follow status:", error);
    return NextResponse.json({ error: "Failed to check follow status" }, { status: 500 });
  }
}

// PUT — follow
export async function PUT(request: NextRequest, { params }: Params) {
  const { userId: targetUserId } = await params;
  const currentUserId = await getActorId(request);

  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentUserId === targetUserId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  try {
    // 1. Check target user exists
    const target = await query("SELECT id FROM users WHERE id = $1", [targetUserId]);
    if (!target.rowCount) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Check blocks table (migration 002)
    const blockCheck = await query(
      "SELECT 1 FROM blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)",
      [currentUserId, targetUserId]
    );
    if ((blockCheck.rowCount ?? 0) > 0) {
      return NextResponse.json({ error: "Unable to follow this user" }, { status: 403 });
    }

    // 3. Atomically create follow relationship and update counters
    await withTransaction(async (client) => {
      const inserted = await client.query(
        "INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [currentUserId, targetUserId]
      );

      if ((inserted.rowCount ?? 0) > 0) {
        await client.query(
          "UPDATE users SET following = following + 1 WHERE id = $1",
          [currentUserId]
        );
        await client.query(
          "UPDATE users SET followers = followers + 1 WHERE id = $1",
          [targetUserId]
        );
        // Create follow notification
        await client.query(
          "INSERT INTO notifications (type, sender_id, recipient_id) VALUES ('follow', $1, $2)",
          [currentUserId, targetUserId]
        );
      }
    });

    return NextResponse.json({ following: true });
  } catch (error) {
    console.error("Follow error:", error);
    return NextResponse.json({ error: "Failed to follow user" }, { status: 500 });
  }
}

// DELETE — unfollow
export async function DELETE(request: NextRequest, { params }: Params) {
  const { userId: targetUserId } = await params;
  const currentUserId = await getActorId(request);

  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await withTransaction(async (client) => {
      const deleted = await client.query(
        "DELETE FROM follows WHERE follower_id = $1 AND following_id = $2",
        [currentUserId, targetUserId]
      );

      if ((deleted.rowCount ?? 0) > 0) {
        await client.query(
          "UPDATE users SET following = GREATEST(following - 1, 0) WHERE id = $1",
          [currentUserId]
        );
        await client.query(
          "UPDATE users SET followers = GREATEST(followers - 1, 0) WHERE id = $1",
          [targetUserId]
        );
      }
    });

    return NextResponse.json({ following: false });
  } catch (error) {
    console.error("Unfollow error:", error);
    return NextResponse.json({ error: "Failed to unfollow user" }, { status: 500 });
  }
}
