/**
 * GET  /api/v1/conversations — list conversations for authenticated user
 * POST /api/v1/conversations — start or fetch conversation with another user
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { query, withTransaction } from "@/lib/neon";

async function getActorId(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  return verifyFirebaseToken(token);
}

import { getCached, setCached } from "@/lib/cache";

// GET — list conversations
export async function GET(request: NextRequest) {
  const currentUserId = await getActorId(request);
  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cacheKey = `convs_${currentUserId}`;
  const cached = getCached<{ conversations: any[] }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const result = await query<{
      id: string;
      last_message: string;
      last_message_timestamp: Date;
      participant_id: string;
      participant_name: string;
      participant_handle: string;
      participant_avatar: string;
    }>(
      `SELECT c.id, c.last_message, c.last_message_timestamp,
              u.id AS participant_id, u.name AS participant_name,
              u.handle AS participant_handle, u.avatar AS participant_avatar
       FROM conversation_participants cp
       JOIN conversations c ON c.id = cp.conversation_id
       JOIN conversation_participants other_cp ON other_cp.conversation_id = c.id AND other_cp.user_id <> $1
       JOIN users u ON u.id = other_cp.user_id
       WHERE cp.user_id = $1
       ORDER BY c.last_message_timestamp DESC`,
      [currentUserId]
    );

    const conversations = result.rows.map((row) => ({
      id: row.id,
      lastMessage: row.last_message,
      lastMessageTimestamp: row.last_message_timestamp ? new Date(row.last_message_timestamp).toISOString() : new Date().toISOString(),
      participant: {
        id: row.participant_id,
        name: row.participant_name,
        handle: row.participant_handle,
        avatar: row.participant_avatar,
      },
    }));

    const responsePayload = { conversations };
    setCached(cacheKey, responsePayload, 10000); // 10s TTL
    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

// POST — create or open 1-on-1 conversation
export async function POST(request: NextRequest) {
  const currentUserId = await getActorId(request);
  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { recipientId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { recipientId } = body;
  if (!recipientId || typeof recipientId !== "string") {
    return NextResponse.json({ error: "recipientId is required" }, { status: 400 });
  }

  if (recipientId === currentUserId) {
    return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
  }

  try {
    // Run recipient check and block check in parallel to cut WAN round-trips
    const [recipientResult, blockCheck] = await Promise.all([
      query<{
        id: string;
        name: string;
        handle: string;
        avatar: string;
      }>("SELECT id, name, handle, avatar FROM users WHERE id = $1", [recipientId]),
      query(
        `SELECT 1 FROM blocks
         WHERE (blocker_id = $1 AND blocked_id = $2)
            OR (blocker_id = $2 AND blocked_id = $1)`,
        [currentUserId, recipientId]
      ),
    ]);

    if (!recipientResult.rowCount) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    if ((blockCheck.rowCount ?? 0) > 0) {
      return NextResponse.json({ error: "Cannot start conversation with this user" }, { status: 403 });
    }

    const recipient = recipientResult.rows[0];
    const conversationId = [currentUserId, recipientId].sort().join("_");

    // Execute in a single fast data-modifying CTE query
    await query(
      `WITH ins_conv AS (
         INSERT INTO conversations (id, last_message, last_message_timestamp)
         VALUES ($1, '', NOW())
         ON CONFLICT (id) DO NOTHING
       )
       INSERT INTO conversation_participants (conversation_id, user_id)
       VALUES ($1, $2), ($1, $3)
       ON CONFLICT DO NOTHING`,
      [conversationId, currentUserId, recipientId]
    );

    return NextResponse.json({
      id: conversationId,
      lastMessage: "",
      lastMessageTimestamp: new Date().toISOString(),
      participant: recipient,
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}
