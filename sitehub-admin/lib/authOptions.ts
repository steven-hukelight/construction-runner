/* eslint-disable @typescript-eslint/no-explicit-any */
import Credentials from "next-auth/providers/credentials";
import { supabaseAdmin } from "./supabaseAdmin";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: any) {
        if (!credentials?.email || !credentials.password) return null;

        if (
          credentials.email === "admin@construction-runner.local" &&
          credentials.password === "password123"
        ) {
          return {
            id: "1",
            name: "Steven",
            email: "admin@construction-runner.local",
            role: "admin",
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      // Attach role from the credentials provider
      if (user) token.role = user.role;

      // Map NextAuth user (email) to Supabase users & update last_login on sign-in
      try {
        const email = (user?.email as string) || (token?.email as string);
        if (email) {
          const { data: users } = await supabaseAdmin.from("users").select("id, profileId").eq("email", email).limit(1);
          if (users && users[0]) {
            token.uid = users[0].id;
            token.profileId = users[0].profileId || null;
            if (user) {
              await supabaseAdmin.from("users").update({ last_login: new Date().toISOString() }).eq("id", users[0].id);
            }
          } else {
            token.uid = null;
            token.profileId = null;
          }
        }
      } catch {
        // Non-fatal: leave mapping unset if lookup fails
        token.uid = token.uid ?? null;
        token.profileId = token.profileId ?? null;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.role = token.role;
        session.user.uid = token.uid || null;
        session.user.profileId = token.profileId || null;
      }
      return session;
    },
  },
};
