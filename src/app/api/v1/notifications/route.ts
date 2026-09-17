/**
 * GET   /api/v1/notifications  — fetch notifications for authenticated user
 * PATCH /api/v1/notifications  — mark all notifications as read
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

  try {
    const result = await query<{
      id: string;
      type: "like" | "comment" | "follow";
      post_id: string | null;
      read: boolean;
      created_at: Date;
      sender_id: string;
      sender_name: string;
      sender_handle: string;
      sender_avatar: string;
      post_content: string | null;
    }>(
      `SELECT n.id, n.type, n.post_id, n.read, n.created_at,
              u.id AS sender_id, u.name AS sender_name, u.handle AS sender_handle, u.avatar AS sender_avatar,
              p.content AS post_content
       FROM notifications n
       JOIN users u ON u.id = n.sender_id
       LEFT JOIN posts p ON p.id = n.post_id
       WHERE n.recipient_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [currentUserId]
    );

    const notifications = result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      postId: row.post_id ?? undefined,
      postContent: row.post_content ?? undefined,
      read: row.read,
      createdAt: row.created_at.toISOString(),
      sender: {
        id: row.sender_id,
        name: row.sender_name,
        handle: row.sender_handle,
        avatar: row.sender_avatar,
      },
    }));

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const currentUserId = await verifyFirebaseToken(token);

  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await query(
      "UPDATE notifications SET read = TRUE WHERE recipient_id = $1 AND read = FALSE",
      [currentUserId]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 500 });
  }
}
