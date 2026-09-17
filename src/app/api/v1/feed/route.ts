/**
 * GET /api/v1/feed
 *
 * Query params:
 *   type   — "following" (default) | "explore"
 *   cursor — pagination cursor
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { getFollowingFeed, getExploreFeed } from "@/modules/feed/feed.service";
import { getCached, setCached } from "@/lib/cache";

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  const viewerId = await verifyFirebaseToken(idToken);

  const type = request.nextUrl.searchParams.get("type") ?? "following";
  const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;

  const cacheKey = !cursor ? `feed_${type}_${viewerId || "anon"}` : null;

  try {
    // Check in-memory cache for first page queries
    if (cacheKey) {
      const cached = getCached(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    if (type === "explore") {
      const page = await getExploreFeed(viewerId, cursor);
      if (cacheKey) setCached(cacheKey, page, 10);
      return NextResponse.json(page);
    }

    // Following feed requires authentication
    if (!viewerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const page = await getFollowingFeed(viewerId, cursor);
    if (cacheKey) setCached(cacheKey, page, 10);
    return NextResponse.json(page);
  } catch (error) {
    console.error("Feed fetch error:", error);
    return NextResponse.json({ error: "Failed to load feed" }, { status: 500 });
  }
}
