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
      <LoadingScreen visible={state.visible} message={state.message} />
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
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{ animationDelay: `${i * 0.15}s` }}
            className="w-3 h-3 rounded-full bg-[#1a4d36] animate-bounce"
          />
        ))}
      </div>
    </div>
  );
}
