/**
 * POST /api/v1/reports
 *
 * Submits a moderation report for a post, user, or comment.
 * Authenticated users only.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { query } from "@/lib/neon";

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const currentUserId = await verifyFirebaseToken(token);

  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    targetType?: string;
    targetId?: string;
    reason?: string;
    details?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { targetType, targetId, reason, details } = body;

  if (!targetType || !['post', 'user', 'comment'].includes(targetType)) {
    return NextResponse.json(
      { error: "Invalid targetType. Must be 'post', 'user', or 'comment'." },
      { status: 422 }
    );
  }

  if (!targetId || typeof targetId !== 'string') {
    return NextResponse.json({ error: "targetId is required." }, { status: 422 });
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return NextResponse.json({ error: "Reason is required." }, { status: 422 });
  }

  try {
    const result = await query<{ id: string }>(
      `INSERT INTO reports (reporter_id, target_type, target_id, reason, details, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
       RETURNING id`,
      [currentUserId, targetType, targetId, reason.trim(), (details ?? "").trim()]
    );

    return NextResponse.json({
      success: true,
      reportId: result.rows[0].id,
      message: "Report submitted successfully.",
    }, { status: 201 });
  } catch (error) {
    console.error("Report submission error:", error);
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
