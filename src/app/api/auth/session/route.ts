/**
 * POST /api/auth/session
 *
 * Accepts a Firebase ID token (from the client after successful Firebase
 * Auth sign-in) and returns the verified user profile from PostgreSQL.
 *
 * This replaces the NextAuth CredentialsProvider pattern which had a
 * session-strategy mismatch when used with the database adapter.
 *
 * Flow:
 *   Client signs in with Firebase (Email/Google/Phone)
 *   → Firebase returns idToken
 *   → Client calls this endpoint with the token
 *   → Server verifies token with Firebase Admin SDK
 *   → Server upserts user in PostgreSQL and returns user profile
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { query } from "@/lib/neon";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, name, email, photoURL } = body as {
      idToken: string;
      name?: string;
      email?: string;
      photoURL?: string;
    };

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    // 1. Verify the Firebase ID token
    const uid = await verifyFirebaseToken(idToken);
    if (!uid) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // 2. Upsert user in PostgreSQL using Firebase UID as primary key
    //    The handle defaults to email prefix or uid fallback.
    const defaultHandle = email
      ? email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() + "_" + uid.slice(0, 6)
      : `user_${uid.slice(0, 8)}`;

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
      `INSERT INTO users (id, name, handle, avatar, cover_photo, bio, email, followers, following)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0)
       ON CONFLICT (id) DO UPDATE
         SET name    = COALESCE(NULLIF(EXCLUDED.name, ''), users.name),
             avatar  = COALESCE(NULLIF(EXCLUDED.avatar, ''), users.avatar),
             email   = COALESCE(NULLIF(EXCLUDED.email, ''), users.email)
       RETURNING id, name, handle, avatar, cover_photo, email, bio, followers, following`,
      [
        uid,
        name || "ConnectU User",
        defaultHandle,
        photoURL || `https://picsum.photos/seed/${uid}/200`,
        `https://picsum.photos/seed/cover${uid}/1200/400`,
        "ConnectU-তে স্বাগতম!",
        email || null,
      ],
    );

    const user = result.rows[0];
    if (!user) {
      return NextResponse.json({ error: "Failed to upsert user" }, { status: 500 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      handle: user.handle,
      avatar: user.avatar,
      coverPhoto: user.cover_photo,
      bio: user.bio,
      email: user.email,
      followers: user.followers,
      following: user.following,
    });
  } catch (error) {
    console.error("Session endpoint error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
