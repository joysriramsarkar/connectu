/**
 * GET /api/v1/notifications/unread-count
 *
 * Returns the count of unread notifications for the authenticated user.
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
    return NextResponse.json({ count: 0 });
  }

  try {
    const result = await query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM notifications WHERE recipient_id = $1 AND read = FALSE",
      [currentUserId]
    );

    const count = parseInt(result.rows[0]?.count ?? "0", 10);
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching unread notification count:", error);
    return NextResponse.json({ count: 0 });
  }
}
