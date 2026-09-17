"use client";

/**
 * Native Authentication Context (Pure PostgreSQL + JWT)
 *
 * Provides:
 *  - `appUser` / `user`  — Current user profile from PostgreSQL
 *  - `firebaseUser`      — Backwards-compatible user object for existing UI
 *  - `idToken` / `token` — JWT session token
 *  - `loading`           — Initial load state
 *  - `login`             — Native email/handle & password login
 *  - `signup`            — Native registration
 *  - `signOut` / `logout`— Sign out
 *  - `refreshUser`       — Reloads current user profile
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";

export type AppUser = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  coverPhoto: string;
  bio: string;
  email?: string;
  followers: number;
  following: number;
};

export type CompatibleAuthUser = {
  uid: string;
  id: string;
  displayName: string;
  name: string;
  email: string | null;
  photoURL: string;
  avatar: string;
  getIdToken: () => Promise<string | null>;
};

interface AuthContextType {
  firebaseUser: CompatibleAuthUser | null;
  appUser: AppUser | null;
  user: AppUser | null;
  idToken: string | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: {
    name: string;
    handle: string;
    email?: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "connectu_auth_token";

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Derive compatible auth user for legacy components
  const firebaseUser: CompatibleAuthUser | null = appUser
    ? {
        uid: appUser.id,
        id: appUser.id,
        displayName: appUser.name,
        name: appUser.name,
        email: appUser.email || null,
        photoURL: appUser.avatar,
        avatar: appUser.avatar,
        getIdToken: async () => idToken,
      }
    : null;

  // Fetch current user from /api/auth/me
  const fetchCurrentUser = useCallback(async (tokenToVerify: string): Promise<AppUser | null> => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${tokenToVerify}`,
        },
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      return data.user as AppUser;
    } catch {
      return null;
    }
  }, []);

  // Initial load: check localStorage for token
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const storedToken =
          typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

        if (storedToken) {
          const user = await fetchCurrentUser(storedToken);
          if (isMounted) {
            if (user) {
              setAppUser(user);
              setIdToken(storedToken);
            } else {
              localStorage.removeItem(TOKEN_KEY);
              setAppUser(null);
              setIdToken(null);
            }
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [fetchCurrentUser]);

  // Login action
  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error || "Login failed" };
        }

        const token = data.token as string;
        const user = data.user as AppUser;

        if (typeof window !== "undefined") {
          localStorage.setItem(TOKEN_KEY, token);
        }

        setIdToken(token);
        setAppUser(user);

        return { success: true };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Network error. Please try again.",
        };
      }
    },
    [],
  );

  // Signup action
  const signup = useCallback(
    async (data: {
      name: string;
      handle: string;
      email?: string;
      password: string;
    }): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const resData = await res.json();
        if (!res.ok) {
          return { success: false, error: resData.error || "Registration failed" };
        }

        const token = resData.token as string;
        const user = resData.user as AppUser;

        if (typeof window !== "undefined") {
          localStorage.setItem(TOKEN_KEY, token);
        }

        setIdToken(token);
        setAppUser(user);

        return { success: true };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Network error. Please try again.",
        };
      }
    },
    [],
  );

  // Logout action
  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors during logout
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
    }

    setIdToken(null);
    setAppUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!idToken) return;
    const refreshed = await fetchCurrentUser(idToken);
    if (refreshed) {
      setAppUser(refreshed);
    }
  }, [idToken, fetchCurrentUser]);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        appUser,
        user: appUser,
        idToken,
        token: idToken,
        loading,
        login,
        signup,
        signOut,
        logout: signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const AuthProvider = FirebaseAuthProvider;

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
