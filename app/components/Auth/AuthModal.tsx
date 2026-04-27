"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useAuthModal } from "@/context/AuthModalContext";
import { X } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";

export function AuthModal() {
  const { isOpen, close } = useAuthModal();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, close]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSignIn = (provider: "google" | "facebook") => {
    signIn(provider, { callbackUrl: "/" });
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && close()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
        <button
          onClick={close}
          className="absolute top-4 right-4 grid place-items-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          aria-label="Închide"
        >
          <X className="w-4 h-4 text-slate-600" />
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-18 h-18 rounded-2xl mb-4">
            <Image
              src="/images/recash-icon.avif"
              alt="Recash Icon"
              width={128}
              height={128}
              priority
              className="w-18 h-18"
            />
          </div>
          <h2 className="font-extrabold text-2xl text-slate-900 tracking-tight">
            Gata să reciclezi?
          </h2>
          <p className="text-slate-700 text-sm mt-1">Începe acum cu Recash</p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleSignIn("google")}
            className="flex items-center justify-center gap-3 w-full py-3.5 px-4 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all font-semibold text-slate-800 shadow-sm cursor-pointer"
          >
            <FcGoogle className="w-5 h-5 shrink-0" />
            Continuă cu Google
          </button>

          <button
            onClick={() => handleSignIn("facebook")}
            className="flex items-center justify-center gap-3 w-full py-3.5 px-4 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all font-semibold text-slate-800 shadow-sm cursor-pointer"
          >
            <FaFacebook className="w-5 h-5 shrink-0 text-[#1877F2]" />
            Continuă cu Facebook
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6 leading-relaxed">
          Prin conectare, sunteți de acord cu{" "}
          <a href="/termeni" className="underline hover:text-slate-600">
            Termenii
          </a>{" "}
          și{" "}
          <a
            href="/confidentialitate"
            className="underline hover:text-slate-600"
          >
            Politica de confidențialitate
          </a>
          .
        </p>
      </div>
    </div>
  );
}
