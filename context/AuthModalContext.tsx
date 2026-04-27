"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

interface AuthModalContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const authTrigger = searchParams.get("auth");

    if (authTrigger === "1") {
      const handleAuthParam = () => {
        setIsOpen(true);

        const params = new URLSearchParams(searchParams.toString());
        params.delete("auth");
        const query = params.toString() ? `?${params.toString()}` : "";
        router.replace(`${pathname}${query}`, { scroll: false });
      };

      const timeoutId = setTimeout(handleAuthParam, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [searchParams, router, pathname]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  return (
    <AuthModalContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx)
    throw new Error("useAuthModal must be used inside AuthModalProvider");
  return ctx;
}
