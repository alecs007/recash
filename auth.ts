import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import { prisma } from "@/lib/prisma";
import authConfig from "./auth.config";
import type { UserRole } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: `/api/${process.env.NEXT_PUBLIC_API_VERSION || "v1"}/auth`,
  ...authConfig,

  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID!,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },

  events: {
    async createUser({ user }) {
      if (!user.id) return;
      await prisma.badge.create({
        data: {
          userId: user.id!,
          type: "FIRST_WEEK",
        },
      });
    },
  },

  pages: {
    error: "/",
  },

  trustHost: true,
});
