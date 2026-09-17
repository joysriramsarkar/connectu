/**
 * GET   /api/v1/admin/reports — list content moderation reports
 * PATCH /api/v1/admin/reports — update report status and optionally remove content
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { query, withTransaction } from "@/lib/neon";

async function authenticate(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  return verifyFirebaseToken(token);
}

export async function GET(request: NextRequest) {
  const userId = await authenticate(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await query<{
      id: string;
      reporter_id: string;
      reporter_name: string;
      reporter_handle: string;
      target_type: "post" | "user" | "comment";
      target_id: string;
      reason: string;
      details: string;
      status: "pending" | "reviewed" | "dismissed" | "actioned";
      created_at: Date;
    }>(
      `SELECT r.id, r.reporter_id, u.name AS reporter_name, u.handle AS reporter_handle,
              r.target_type, r.target_id, r.reason, r.details, r.status, r.created_at
       FROM reports r
       JOIN users u ON u.id = r.reporter_id
       ORDER BY r.created_at DESC
       LIMIT 50`
    );

    const reports = result.rows.map((row) => ({
      id: row.id,
      reporter: {
        id: row.reporter_id,
        name: row.reporter_name,
        handle: row.reporter_handle,
      },
      targetType: row.target_type,
      targetId: row.target_id,
      reason: row.reason,
      details: row.details,
      status: row.status,
      createdAt: row.created_at.toISOString(),
    }));

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const userId = await authenticate(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { reportId?: string; action?: "dismiss" | "resolve" | "remove_target" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { reportId, action } = body;
  if (!reportId || !action) {
    return NextResponse.json({ error: "reportId and action are required" }, { status: 400 });
  }

  try {
    const reportCheck = await query<{ target_type: string; target_id: string }>(
      "SELECT target_type, target_id FROM reports WHERE id = $1",
      [reportId]
    );

    if (!reportCheck.rowCount) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const { target_type, target_id } = reportCheck.rows[0];

    await withTransaction(async (client) => {
      if (action === "dismiss") {
        await client.query("UPDATE reports SET status = 'dismissed' WHERE id = $1", [reportId]);
      } else if (action === "resolve") {
        await client.query("UPDATE reports SET status = 'reviewed' WHERE id = $1", [reportId]);
      } else if (action === "remove_target") {
        if (target_type === "post") {
          await client.query("UPDATE posts SET status = 'deleted' WHERE id = $1::uuid", [target_id]);
        }
        await client.query("UPDATE reports SET status = 'actioned' WHERE id = $1", [reportId]);
      }
    });

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error("Error updating report:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
