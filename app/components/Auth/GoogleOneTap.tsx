"use client";

import { useEffect, useRef } from "react";
import { useSession, signIn } from "next-auth/react";

export function GoogleOneTap() {
  const { status } = useSession();
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!mountedRef.current || status !== "unauthenticated") return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          await signIn("googleonetap", {
            credential: response.credential,
            redirect: false,
          });
        },
        ux_mode: "popup",
        auto_select: true,
        cancel_on_tap_outside: false,
        use_fedcm_for_prompt: false,
      });
      window.google?.accounts.id.prompt();
    };

    return () => {
      window.google?.accounts.id.cancel();
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, [status]);

  return null;
}
