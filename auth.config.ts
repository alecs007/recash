import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";

export default {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET,
    }),
  ],
} satisfies NextAuthConfig;
