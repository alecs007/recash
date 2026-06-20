import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import Credentials from "next-auth/providers/credentials";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import authConfig from "./auth.config";
import { createNotification } from "./lib/notifications";
import type { UserRole } from "@prisma/client";

const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || "v1";
const googleClient = new OAuth2Client(process.env.AUTH_GOOGLE_ID!);

export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: `/api/${API_VERSION}/auth`,
  ...authConfig,

  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID!,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET!,
    }),
    Credentials({
      id: "googleonetap",
      name: "Google One Tap",
      credentials: { credential: { type: "text" } },
      async authorize(creds) {
        const idToken = creds?.credential as string | undefined;
        if (!idToken) return null;

        try {
          const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.AUTH_GOOGLE_ID!,
          });
          const payload = ticket.getPayload();
          if (!payload?.email_verified || !payload.email) return null;

          let user = await prisma.user.findUnique({
            where: { email: payload.email },
          });

          const isNew = !user;

          user = await prisma.user.upsert({
            where: { email: payload.email },
            update: {
              name: user?.name ?? payload.name,
              image: user?.image ?? payload.picture,
            },
            create: {
              email: payload.email,
              name: payload.name ?? null,
              image: payload.picture ?? null,
            },
          });

          if (isNew) {
            await createNotification({
              userId: user.id,
              type: "SYSTEM",
              title: "Bine ai venit! 👋",
              message: "Ne bucurăm că te-ai alăturat comunității Recash!",
              link: "/map",
            }).catch((err) =>
              console.error("[auth] Welcome notification error:", err),
            );
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
          };
        } catch (err) {
          console.error("[googleonetap] Token verification failed:", err);
          return null;
        }
      },
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
      await createNotification({
        userId: user.id,
        type: "SYSTEM",
        title: "Bine ai venit! 👋",
        message: "Ne bucurăm că te-ai alăturat comunității Recash!",
        link: "/map",
      }).catch((err) =>
        console.error("[auth] Welcome notification error:", err),
      );
    },
  },

  pages: { error: "/" },
  trustHost: true,
});
