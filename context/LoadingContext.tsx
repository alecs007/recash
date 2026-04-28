"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface LoadingContextValue {
  show: (message?: string) => void;
  hide: () => void;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "Se încarcă...",
  });

  const show = useCallback((message = "Se încarcă...") => {
    setState({ visible: true, message });
  }, []);

  const hide = useCallback(() => {
    setState((s) => ({ ...s, visible: false }));
  }, []);

  return (
    <LoadingContext.Provider value={{ show, hide }}>
      {children}
      <LoadingScreen visible={state.visible} />
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error("useLoading must be used inside LoadingProvider");
  return ctx;
}

function LoadingScreen({ visible }: { visible: boolean }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 99999 }}
      className={`flex items-center justify-center bg-white transition-opacity duration-300 ${
        visible
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      <style>{`
        @keyframes big-bounce {
          0%, 100% { transform: translateY(0); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
          50% { transform: translateY(-28px); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
        }
        .dot-bounce {
          animation: big-bounce 0.7s infinite;
        }
      `}</style>
      <div className="flex items-center gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="dot-bounce w-4 h-4 rounded-full bg-[#1a4d36]"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
