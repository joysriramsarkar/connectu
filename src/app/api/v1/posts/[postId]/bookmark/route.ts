/**
 * PUT    /api/v1/posts/:postId/bookmark  — bookmark/save a post (idempotent)
 * DELETE /api/v1/posts/:postId/bookmark  — remove bookmark (idempotent)
 * GET    /api/v1/posts/:postId/bookmark  — check if bookmarked
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { query } from "@/lib/neon";

type Params = { params: Promise<{ postId: string }> };

async function getActorId(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  return verifyFirebaseToken(token);
}

// GET — check bookmark status
export async function GET(request: NextRequest, { params }: Params) {
  const { postId } = await params;
  const userId = await getActorId(request);
  if (!userId) return NextResponse.json({ bookmarked: false });

  try {
    const result = await query(
      "SELECT 1 FROM bookmarks WHERE user_id = $1 AND post_id = $2",
      [userId, postId]
    );
    return NextResponse.json({ bookmarked: (result.rowCount ?? 0) > 0 });
  } catch (error) {
    console.error("Error checking bookmark:", error);
    return NextResponse.json({ error: "Failed to check bookmark" }, { status: 500 });
  }
}

// PUT — save post
export async function PUT(request: NextRequest, { params }: Params) {
  const { postId } = await params;
  const userId = await getActorId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Verify post exists
    const postCheck = await query(
      "SELECT 1 FROM posts WHERE id = $1 AND status = 'active'",
      [postId]
    );
    if (!postCheck.rowCount) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await query(
      "INSERT INTO bookmarks (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [userId, postId]
    );

    return NextResponse.json({ bookmarked: true });
  } catch (error) {
    console.error("Bookmark error:", error);
    return NextResponse.json({ error: "Failed to bookmark post" }, { status: 500 });
  }
}

// DELETE — remove bookmark
export async function DELETE(request: NextRequest, { params }: Params) {
  const { postId } = await params;
  const userId = await getActorId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await query(
      "DELETE FROM bookmarks WHERE user_id = $1 AND post_id = $2",
      [userId, postId]
    );
    return NextResponse.json({ bookmarked: false });
  } catch (error) {
    console.error("Remove bookmark error:", error);
    return NextResponse.json({ error: "Failed to remove bookmark" }, { status: 500 });
  }
}
