import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "connectu_jwt_super_secret_key_production_grade_2026",
);

export interface JWTPayload {
  userId: string;
  email?: string;
  handle?: string;
}

/**
 * Signs a JWT with the user's ID and claims.
 * Valid for 7 days by default.
 */
export async function signAuthToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({
    uid: payload.userId,
    email: payload.email,
    handle: payload.handle,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

/**
 * Verifies a JWT and returns the userId (or null if invalid/expired).
 */
export async function verifyAuthToken(
  token: string | null | undefined,
): Promise<string | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = (payload.uid as string) || (payload.sub as string);
    return userId || null;
  } catch {
    return null;
  }
}
