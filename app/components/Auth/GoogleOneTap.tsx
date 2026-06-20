"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

export function GoogleOneTap() {
  const { status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || status !== "unauthenticated") return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId) {
      console.warn("Google One Tap: Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID");
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          await signIn("google", {
            credential: response.credential,
            redirect: false,
          });
        },
        ux_mode: "popup",
        auto_select: true,
        cancel_on_tap_outside: false,
        context: "signin",
      });
      window.google?.accounts.id.prompt();
    };

    return () => {
      window.google?.accounts.id.cancel();

      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [status, mounted]);

  return null;
}
