/**
 * POST /api/v1/posts
 *
 * Creates a new post in PostgreSQL.
 * The author is derived from the verified Firebase ID token — never from the request body.
 *
 * Body (multipart or JSON):
 *   content  — post text (required, 1-2000 chars)
 *   image    — image URL (optional, already uploaded to Firebase Storage)
 *   visibility — "public" | "followers" | "private" (default: "public")
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { query } from "@/lib/neon";
import { invalidateCache } from "@/lib/cache";

export async function POST(request: NextRequest) {
  // 1. Authenticate
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const authorId = await verifyFirebaseToken(token);
  if (!authorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: { content?: string; image?: string; visibility?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const content = (body.content ?? "").trim();
  if (!content || content.length > 2000) {
    return NextResponse.json(
      { error: "Content must be between 1 and 2000 characters." },
      { status: 422 },
    );
  }

  const visibility = ["public", "followers", "private"].includes(body.visibility ?? "")
    ? body.visibility
    : "public";

  const image = body.image && typeof body.image === "string" ? body.image : null;

  // 3. Insert into PostgreSQL
  try {
    const result = await query<{ id: string; created_at: Date }>(
      `INSERT INTO posts (author_id, content, image, visibility, status, likes, comments, created_at)
       VALUES ($1, $2, $3, $4, 'active', 0, 0, NOW())
       RETURNING id, created_at`,
      [authorId, content, image, visibility],
    );

    const post = result.rows[0];
    invalidateCache("feed_");
    return NextResponse.json(
      {
        id: post.id,
        authorId,
        content,
        image: image ?? undefined,
        visibility,
        likes: 0,
        comments: 0,
        createdAt: post.created_at.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Post creation error:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
