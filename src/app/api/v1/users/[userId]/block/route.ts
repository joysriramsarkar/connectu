/**
 * PUT    /api/v1/users/:userId/block  — block a user (idempotent)
 * DELETE /api/v1/users/:userId/block  — unblock a user (idempotent)
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

// PUT — block user
export async function PUT(request: NextRequest, { params }: Params) {
  const { userId: targetUserId } = await params;
  const currentUserId = await getActorId(request);

  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentUserId === targetUserId) {
    return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
  }

  try {
    await withTransaction(async (client) => {
      // 1. Insert block
      await client.query(
        "INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [currentUserId, targetUserId]
      );

      // 2. Remove follow relationships in both directions
      const removed1 = await client.query(
        "DELETE FROM follows WHERE follower_id = $1 AND following_id = $2 RETURNING 1",
        [currentUserId, targetUserId]
      );
      if ((removed1.rowCount ?? 0) > 0) {
        await client.query("UPDATE users SET following = GREATEST(following - 1, 0) WHERE id = $1", [currentUserId]);
        await client.query("UPDATE users SET followers = GREATEST(followers - 1, 0) WHERE id = $1", [targetUserId]);
      }

      const removed2 = await client.query(
        "DELETE FROM follows WHERE follower_id = $1 AND following_id = $2 RETURNING 1",
        [targetUserId, currentUserId]
      );
      if ((removed2.rowCount ?? 0) > 0) {
        await client.query("UPDATE users SET following = GREATEST(following - 1, 0) WHERE id = $1", [targetUserId]);
        await client.query("UPDATE users SET followers = GREATEST(followers - 1, 0) WHERE id = $1", [currentUserId]);
      }
    });

    return NextResponse.json({ blocked: true });
  } catch (error) {
    console.error("Block error:", error);
    return NextResponse.json({ error: "Failed to block user" }, { status: 500 });
  }
}

// DELETE — unblock user
export async function DELETE(request: NextRequest, { params }: Params) {
  const { userId: targetUserId } = await params;
  const currentUserId = await getActorId(request);

  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await query(
      "DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2",
      [currentUserId, targetUserId]
    );

    return NextResponse.json({ blocked: false });
  } catch (error) {
    console.error("Unblock error:", error);
    return NextResponse.json({ error: "Failed to unblock user" }, { status: 500 });
  }
}
