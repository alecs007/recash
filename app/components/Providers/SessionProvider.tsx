"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export function SessionProvider({ children }: { children: ReactNode }) {
  const apiVersion = process.env.NEXT_PUBLIC_API_VERSION;
  const basePath = `/api/${apiVersion}/auth`;

  return (
    <NextAuthSessionProvider basePath={basePath}>
      {children}
    </NextAuthSessionProvider>
  );
}
