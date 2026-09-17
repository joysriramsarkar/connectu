/**
 * Auth Token Verification — server-side.
 *
 * Migrated from Firebase Admin to native JWT verification (`jose`).
 * Retains `verifyFirebaseToken` and `requireFirebaseToken` signatures
 * so existing API routes continue to work without code churn.
 */

import { verifyAuthToken } from "@/lib/jwt";

/**
 * Verifies an authentication token and returns the user ID (UID).
 * Returns null if token is missing, expired, or invalid.
 */
export async function verifyFirebaseToken(
  token: string | undefined | null,
): Promise<string | null> {
  return verifyAuthToken(token);
}

/**
 * Verifies an auth token and throws an error if invalid.
 */
export async function requireFirebaseToken(
  token: string | undefined | null,
): Promise<string> {
  const uid = await verifyAuthToken(token);
  if (!uid) {
    throw new Error("Unauthorized: invalid or missing authentication token.");
  }
  return uid;
}

export { verifyAuthToken, verifyAuthToken as verifyToken };
