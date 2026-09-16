
import NextAuth from "next-auth"
import type { AuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import PostgresAdapter from "@auth/pg-adapter"
import bcrypt from "bcrypt"
import { pool, query } from "@/lib/neon"

export const authOptions: AuthOptions = {
  adapter: PostgresAdapter(pool),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }
        try {
          const result = await query<{ id: string; email: string; name: string; password_hash: string }>(
            "SELECT id, email, name, password_hash FROM users WHERE email = $1 LIMIT 1",
            [credentials.email.toLowerCase()],
          );
          const user = result.rows[0];
          if (!user?.password_hash || !(await bcrypt.compare(credentials.password, user.password_hash))) {
            return null;
          }
          return { id: user.id, email: user.email, name: user.name };
        } catch (error) {
          console.error("Credentials authentication failed:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "database",
  },
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
