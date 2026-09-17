/**
 * PATCH /api/v1/notifications/:id/read
 *
 * Marks a single notification as read for the authenticated recipient.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { query } from "@/lib/neon";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const currentUserId = await verifyFirebaseToken(token);

  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await query(
      "UPDATE notifications SET read = TRUE WHERE id = $1 AND recipient_id = $2",
      [id, currentUserId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notification read:", error);
    return NextResponse.json({ error: "Failed to mark notification read" }, { status: 500 });
  }
}
