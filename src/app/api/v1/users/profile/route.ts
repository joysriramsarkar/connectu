/**
 * PATCH /api/v1/users/profile
 *
 * Updates the current authenticated user's profile in PostgreSQL.
 * Verified actor only — user cannot update other users' profiles.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { query } from "@/lib/neon";

export async function PATCH(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const currentUserId = await verifyFirebaseToken(token);

  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    name?: string;
    handle?: string;
    bio?: string;
    avatar?: string;
    coverPhoto?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  const handle = body.handle?.trim().toLowerCase();
  const bio = body.bio?.trim();
  const avatar = body.avatar?.trim();
  const coverPhoto = body.coverPhoto?.trim();

  if (handle) {
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(handle)) {
      return NextResponse.json(
        { error: "Handle must be 3-30 characters containing only letters, numbers, and underscores." },
        { status: 422 }
      );
    }

    // Check handle collision
    const existing = await query<{ id: string }>(
      "SELECT id FROM users WHERE handle = $1 AND id <> $2",
      [handle, currentUserId]
    );
    if (existing.rowCount) {
      return NextResponse.json(
        { error: "Handle is already taken. Please choose another." },
        { status: 409 }
      );
    }
  }

  try {
    const result = await query<{
      id: string;
      name: string;
      handle: string;
      avatar: string;
      cover_photo: string;
      bio: string;
      followers: number;
      following: number;
      email: string;
    }>(
      `UPDATE users
       SET name        = COALESCE(NULLIF($1, ''), name),
           handle      = COALESCE(NULLIF($2, ''), handle),
           bio         = COALESCE($3, bio),
           avatar      = COALESCE(NULLIF($4, ''), avatar),
           cover_photo = COALESCE(NULLIF($5, ''), cover_photo)
       WHERE id = $6
       RETURNING id, name, handle, avatar, cover_photo, bio, followers, following, email`,
      [name || null, handle || null, bio !== undefined ? bio : null, avatar || null, coverPhoto || null, currentUserId]
    );

    if (!result.rowCount) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updated = result.rows[0];
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      handle: updated.handle,
      avatar: updated.avatar,
      coverPhoto: updated.cover_photo,
      bio: updated.bio,
      followers: updated.followers,
      following: updated.following,
      email: updated.email,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
