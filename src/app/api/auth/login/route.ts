import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/neon";
import { signAuthToken } from "@/lib/jwt";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email/handle and password are required." },
        { status: 400 },
      );
    }

    const identifier = String(email).trim().toLowerCase();

    // Find user by email or handle
    const result = await query<{
      id: string;
      name: string;
      handle: string;
      email: string;
      password_hash: string | null;
      avatar: string;
      cover_photo: string;
      bio: string;
      followers: number;
      following: number;
    }>(
      `SELECT id, name, handle, email, password_hash, avatar, cover_photo, bio, followers, following
       FROM users
       WHERE LOWER(email) = $1 OR LOWER(handle) = $1
       LIMIT 1`,
      [identifier],
    );

    if (!result.rowCount || result.rowCount === 0) {
      return NextResponse.json(
        { error: "No account found with that email or handle." },
        { status: 401 },
      );
    }

    const user = result.rows[0];

    // Check password
    if (!user.password_hash) {
      return NextResponse.json(
        { error: "Password not set for this account. Please register or reset password." },
        { status: 401 },
      );
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Incorrect password. Please try again." },
        { status: 401 },
      );
    }

    // Sign JWT
    const token = await signAuthToken({
      userId: user.id,
      email: user.email,
      handle: user.handle,
    });

    const userProfile = {
      id: user.id,
      name: user.name,
      handle: user.handle,
      email: user.email,
      avatar: user.avatar,
      coverPhoto: user.cover_photo,
      bio: user.bio,
      followers: user.followers,
      following: user.following,
    };

    const response = NextResponse.json({
      user: userProfile,
      token,
      message: "Login successful",
    });

    // Set cookie
    response.cookies.set("auth-token", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
