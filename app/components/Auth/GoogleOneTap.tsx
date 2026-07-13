"use client";

import { useEffect, useRef } from "react";
import { useSession, signIn } from "next-auth/react";

export function GoogleOneTap() {
  const { status } = useSession();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (status !== "unauthenticated" || initializedRef.current) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const init = () => {
      if (initializedRef.current || !window.google) return;
      initializedRef.current = true;

      window.google.accounts.id.initialize({
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
        use_fedcm_for_prompt: true,
      });
      window.google.accounts.id.prompt(
        process.env.NODE_ENV === "development"
          ? (notification) => {
              if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                console.warn(
                  "[GoogleOneTap] prompt not shown:",
                  notification.getMomentType(),
                  "- check that this origin is registered as an Authorized JavaScript origin for the OAuth client, and that the browser is signed in to a Google account",
                );
              }
            }
          : undefined,
      );
    };

    if (window.google?.accounts?.id) {
      init();
      return;
    }

    if (!document.querySelector('script[src*="gsi/client"]')) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = init;
      document.body.appendChild(script);
    }
  }, [status]);

  return null;
}
