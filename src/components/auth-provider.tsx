"use client";

/**
 * AuthProvider wraps the app with Firebase Auth context.
 * This replaces the NextAuth SessionProvider which was incompatible
 * with the CredentialsProvider + database session strategy combination.
 */

import { FirebaseAuthProvider } from "@/context/auth";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
}
