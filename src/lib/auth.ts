/**
 * Server-side authentication helpers.
 *
 * All server actions and API routes should use `getCurrentUserId()` or
 * `requireCurrentUserId()` instead of trusting any client-supplied userId.
 *
 * The Firebase ID token must be passed in the Authorization header:
 *   Authorization: Bearer <idToken>
 *
 * Or, for server actions called from the client, the token should be
 * sent as a `x-firebase-token` header or embedded in the request body
 * as a `_token` field (see `getTokenFromRequest`).
 */

import { headers } from "next/headers";
import { verifyFirebaseToken } from "@/lib/firebase-admin";

/**
 * Extracts the Firebase ID token from the incoming request headers.
 * Supports:
 *   - `Authorization: Bearer <token>`
 *   - `x-firebase-token: <token>`
 */
export async function getTokenFromHeaders(): Promise<string | null> {
  const headersList = await headers();
  const authorization = headersList.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7);
  }
  const xToken = headersList.get("x-firebase-token");
  return xToken ?? null;
}

/**
 * Returns the verified UID of the currently authenticated user,
 * or null if unauthenticated / invalid token.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const token = await getTokenFromHeaders();
  return verifyFirebaseToken(token);
}

/**
 * Returns the verified UID of the currently authenticated user.
 * Throws an Unauthorized error if the user is not authenticated.
 * Use this in server actions that require authentication.
 */
export async function requireCurrentUserId(): Promise<string> {
  const uid = await getCurrentUserId();
  if (!uid) {
    throw new Error("Unauthorized: authentication required.");
  }
  return uid;
}
