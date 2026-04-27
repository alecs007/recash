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

  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role as UserRole;
      }
      return session;
    },
  },

  events: {
    async createUser({ user }) {
      await prisma.badge.create({
        data: { userId: user.id, type: "FIRST_WEEK" },
      });
    },
  },

  pages: {
    error: "/",
  },

  session: { strategy: "database" },
  trustHost: true,
});
