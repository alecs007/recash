"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

interface LoadingContextValue {
  show: (message?: string) => void;
  hide: () => void;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("Se încarcă...");
  const [visible, setVisible] = useState(false);

  const show = useCallback((msg = "Se încarcă...") => {
    setMessage(msg);
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <LoadingContext.Provider value={{ show, hide }}>
      {children}
      <LoadingScreen visible={visible} message={message} />
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error("useLoading must be used inside LoadingProvider");
  return ctx;
}

function LoadingScreen({
  visible,
  message,
}: {
  visible: boolean;
  message: string;
}) {
  const [rendered, setRendered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (visible) {
      setRendered(true);
    } else {
      timerRef.current = setTimeout(() => setRendered(false), 400);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  if (!rendered) return null;

  return (
    <>
      <style>{`
        @keyframes loading-spin {
          to { transform: rotate(360deg); }
        }
        .loading-spinner {
          animation: loading-spin 0.8s linear infinite;
        }
      `}</style>

      <div
        role="status"
        aria-live="polite"
        aria-busy={visible}
        aria-label={message}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          background: "white",
          transition: "opacity 0.4s ease, visibility 0.4s ease",
          opacity: visible ? 1 : 0,
          visibility: visible ? "visible" : "hidden",
          pointerEvents: visible ? "auto" : "none",
        }}
      >
        <svg
          className="loading-spinner"
          width="56"
          height="56"
          viewBox="0 0 56 56"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="28" cy="28" r="22" stroke="#e5e7eb" strokeWidth="3.5" />
          <circle
            cx="28"
            cy="28"
            r="22"
            stroke="#1a4d36"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="138"
            strokeDashoffset="104"
          />
        </svg>

        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "#6b7280",
          }}
        >
          {message}
        </p>
      </div>
    </>
  );
}
