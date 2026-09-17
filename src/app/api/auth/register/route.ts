import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/neon";
import { signAuthToken } from "@/lib/jwt";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, handle, email, password } = body;

    // Validate name
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    // Validate handle
    if (!handle || typeof handle !== "string" || !/^[a-zA-Z0-9_]{3,30}$/.test(handle)) {
      return NextResponse.json(
        { error: "Handle must be 3-30 alphanumeric characters or underscores." },
        { status: 400 },
      );
    }

    // Validate email (optional)
    let cleanEmail: string | null = null;
    if (email && typeof email === "string" && email.trim().length > 0) {
      const trimmedEmail = email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
        return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
      }
      // Check if email already registered
      const emailCheck = await query("SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1", [
        trimmedEmail,
      ]);
      if (emailCheck.rowCount && emailCheck.rowCount > 0) {
        return NextResponse.json(
          { error: "This email is already registered." },
          { status: 409 },
        );
      }
      cleanEmail = trimmedEmail;
    }

    // Validate password
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 },
      );
    }

    const cleanHandle = handle.trim().toLowerCase();
    const cleanName = name.trim();

    // Check if handle already registered
    const handleCheck = await query("SELECT id FROM users WHERE LOWER(handle) = $1 LIMIT 1", [
      cleanHandle,
    ]);
    if (handleCheck.rowCount && handleCheck.rowCount > 0) {
      return NextResponse.json(
        { error: "This handle is already taken. Please choose another." },
        { status: 409 },
      );
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    // Generate unique user ID
    const userId = "u_" + crypto.randomBytes(12).toString("hex");
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanHandle)}`;
    const coverPhoto = `https://picsum.photos/seed/${encodeURIComponent(cleanHandle)}/1200/400`;
    const bio = "ConnectU-তে স্বাগতম!";

    // Insert user into PostgreSQL
    const insertResult = await query<{
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
      `INSERT INTO users (id, name, handle, email, password_hash, avatar, cover_photo, bio, followers, following)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0)
       RETURNING id, name, handle, email, avatar, cover_photo, bio, followers, following`,
      [userId, cleanName, cleanHandle, cleanEmail, passwordHash, avatar, coverPhoto, bio],
    );

    const newUser = insertResult.rows[0];
    if (!newUser) {
      return NextResponse.json({ error: "Failed to create user account." }, { status: 500 });
    }

    // Sign JWT
    const token = await signAuthToken({
      userId: newUser.id,
      email: newUser.email,
      handle: newUser.handle,
    });

    const userProfile = {
      id: newUser.id,
      name: newUser.name,
      handle: newUser.handle,
      email: newUser.email,
      avatar: newUser.avatar,
      coverPhoto: newUser.cover_photo,
      bio: newUser.bio,
      followers: newUser.followers,
      following: newUser.following,
    };

    const response = NextResponse.json({
      user: userProfile,
      token,
      message: "Registration successful",
    });

    // Set auth cookie
    response.cookies.set("auth-token", token, {
      httpOnly: false, // Accessible to client-side auth state
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
