/**
 * Firebase Client SDK — DEPRECATED / REMOVED
 *
 * ConnectU has completely migrated to:
 * - PostgreSQL (`@/lib/neon`)
 * - Native JWT Session (`@/lib/jwt`)
 * - Local uploads (`/api/v1/upload`)
 *
 * This file is retained as an empty stub for any legacy references.
 */

export const app = null;
export const auth = null;
export const db = null;
export const storage = null;
export const googleProvider = null;

export async function signInAnonymously() {
  throw new Error("Firebase has been removed. Use native ConnectU authentication.");
}

export async function signInWithPhoneNumber() {
  throw new Error("Firebase has been removed. Use native ConnectU authentication.");
}

export class RecaptchaVerifier {
  constructor() {}
  clear() {}
  render() { return Promise.resolve(0); }
  verify() { return Promise.resolve(""); }
}