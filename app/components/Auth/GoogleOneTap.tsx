"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";

export function GoogleOneTap() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "unauthenticated") return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        callback: async (response: { credential: string }) => {
          await signIn("google", {
            credential: response.credential,
            redirect: false,
          });
        },
        auto_select: true,
        cancel_on_tap_outside: false,
        context: "signin",
      });
      window.google?.accounts.id.prompt();
    };

    return () => {
      window.google?.accounts.id.cancel();
      document.body.removeChild(script);
    };
  }, [status]);

  return null;
}
