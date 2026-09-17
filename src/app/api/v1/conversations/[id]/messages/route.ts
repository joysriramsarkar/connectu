/**
 * GET  /api/v1/conversations/:id/messages — get messages (with membership check)
 * POST /api/v1/conversations/:id/messages — send message (with membership & block check)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { query, withTransaction } from "@/lib/neon";
import { invalidateCache } from "@/lib/cache";

type Params = { params: Promise<{ id: string }> };

async function getActorId(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  return verifyFirebaseToken(token);
}

// GET — messages for conversation
export async function GET(request: NextRequest, { params }: Params) {
  const { id: conversationId } = await params;
  const currentUserId = await getActorId(request);

  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Verify membership
    const membership = await query(
      "SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2",
      [conversationId, currentUserId]
    );

    if (!membership.rowCount) {
      const parts = conversationId.split("_");
      if (parts.length === 2 && parts.includes(currentUserId)) {
        return NextResponse.json({ messages: [] });
      }
      return NextResponse.json({ error: "Forbidden: not a participant" }, { status: 403 });
    }

    // 2. Fetch messages
    const result = await query<{
      id: string;
      conversation_id: string;
      sender_id: string;
      content: string;
      timestamp: Date;
    }>(
      `SELECT id, conversation_id, sender_id, content, timestamp
       FROM messages
       WHERE conversation_id = $1
       ORDER BY timestamp ASC
       LIMIT 100`,
      [conversationId]
    );

    const messages = result.rows.map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      content: row.content,
      timestamp: row.timestamp.toISOString(),
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

// POST — send message
export async function POST(request: NextRequest, { params }: Params) {
  const { id: conversationId } = await params;
  const currentUserId = await getActorId(request);

  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const content = (body.content ?? "").trim();
  if (!content || content.length > 2000) {
    return NextResponse.json(
      { error: "Content must be between 1 and 2000 characters." },
      { status: 422 }
    );
  }

  try {
    const parts = conversationId.split("_");
    const otherParticipantId = parts.length === 2 ? parts.find((id) => id !== currentUserId) : null;

    // Fast block check if 1-on-1
    if (otherParticipantId) {
      const blockCheck = await query(
        `SELECT 1 FROM blocks
         WHERE (blocker_id = $1 AND blocked_id = $2)
            OR (blocker_id = $2 AND blocked_id = $1)`,
        [currentUserId, otherParticipantId]
      );
      if ((blockCheck.rowCount ?? 0) > 0) {
        return NextResponse.json({ error: "Cannot message this user" }, { status: 403 });
      }
    }

    // Atomic CTE: guarantees conversation exists, guarantees participants exist,
    // inserts message and updates conversation in a single database round-trip (< 100ms)
    const result = await query<{ id: string; timestamp: Date }>(
      `WITH ensured_conv AS (
         INSERT INTO conversations (id, last_message, last_message_timestamp)
         VALUES ($1, $3, NOW())
         ON CONFLICT (id) DO UPDATE
         SET last_message = $3, last_message_timestamp = NOW()
       ),
       ensured_participants AS (
         INSERT INTO conversation_participants (conversation_id, user_id)
         VALUES ($1, $2), ($1, $4)
         ON CONFLICT DO NOTHING
       ),
       inserted_msg AS (
         INSERT INTO messages (conversation_id, sender_id, content, timestamp)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, timestamp
       )
       SELECT id, timestamp FROM inserted_msg`,
      [conversationId, currentUserId, content, otherParticipantId || currentUserId]
    );

    const newMessage = result.rows[0];
    if (!newMessage) {
      throw new Error("Failed to insert message");
    }

    // Invalidate conversation list cache so fresh last_message is shown immediately
    invalidateCache("convs_");

    return NextResponse.json(
      {
        id: newMessage.id,
        conversationId,
        senderId: currentUserId,
        content,
        timestamp: new Date(newMessage.timestamp).toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
