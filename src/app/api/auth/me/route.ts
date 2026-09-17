import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/neon";
import { verifyAuthToken } from "@/lib/jwt";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    let token: string | null = null;

    if (authorization?.startsWith("Bearer ")) {
      token = authorization.slice(7);
    } else {
      token = request.cookies.get("auth-token")?.value ?? null;
    }

    const userId = await verifyAuthToken(token);
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const result = await query<{
      id: string;
      name: string;
      handle: string;
      email: string;
      avatar: string;
      cover_photo: string;
      bio: string;
      followers: number;
      following: number;
    }>(
      `SELECT id, name, handle, email, avatar, cover_photo, bio, followers, following
       FROM users WHERE id = $1 LIMIT 1`,
      [userId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const u = result.rows[0];
    return NextResponse.json({
      user: {
        id: u.id,
        name: u.name,
        handle: u.handle,
        email: u.email,
        avatar: u.avatar,
        coverPhoto: u.cover_photo,
        bio: u.bio,
        followers: u.followers,
        following: u.following,
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
