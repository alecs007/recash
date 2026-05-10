"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  session: Session | null;
}

export function SessionProvider({ children, session }: Props) {
  const apiVersion = process.env.NEXT_PUBLIC_API_VERSION || "v1";
  const basePath = `/api/${apiVersion}/auth`;

  return (
    <NextAuthSessionProvider basePath={basePath} session={session}>
      {children}
    </NextAuthSessionProvider>
  );
}
