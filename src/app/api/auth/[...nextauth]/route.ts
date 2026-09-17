/**
 * NextAuth route — DEPRECATED
 *
 * This route has been replaced by Firebase Auth + the new session endpoint:
 *   POST /api/auth/session  →  src/app/api/auth/session/route.ts
 *
 * Authentication flow:
 *   1. Client signs in with Firebase (Email / Google / Phone)
 *   2. Client calls POST /api/auth/session with the Firebase ID token
 *   3. Server verifies the token using Firebase Admin SDK
 *   4. Server upserts the user in PostgreSQL and returns the user profile
 *
 * This file is kept to preserve the route path for now.
 * It returns 410 Gone to any caller that still has the old route cached.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "This auth endpoint has been replaced. Use POST /api/auth/session instead." },
    { status: 410 },
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "This auth endpoint has been replaced. Use POST /api/auth/session instead." },
    { status: 410 },
  );
}
