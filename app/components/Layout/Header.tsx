"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { useAuthModal } from "@/context/AuthModalContext";
import { useLoading } from "@/context/LoadingContext";
import { FaWineBottle, FaRegUser, FaRegBell, FaRecycle } from "react-icons/fa";
import { IoChevronDown } from "react-icons/io5";
import { MdLogout } from "react-icons/md";
import { LuBike } from "react-icons/lu";

export default function Header({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { open: openAuthModal } = useAuthModal();
  const { show } = useLoading();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAuthPage = pathname?.startsWith("/auth");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (isAuthPage) return <>{children}</>;

  const unreadCount = 3;
  const isAuthenticated = status === "authenticated" && !!session?.user;

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/recash-logo.webp"
              alt="Recash Logo"
              width={643}
              height={138}
              className="h-8 w-auto object-contain"
              priority
              draggable={false}
            />
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  href="/notificari"
                  className="relative grid place-items-center w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                  aria-label="Notificări"
                >
                  <FaRegBell className="w-5 h-5 text-slate-700" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>

                <div ref={dropdownRef} className="relative">
                  <button
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label="Meniu profil"
                  >
                    {session!.user!.image ? (
                      <Image
                        src={session!.user!.image}
                        alt={session!.user!.name ?? "Profil"}
                        width={36}
                        height={36}
                        className="w-9 h-9 rounded-full object-cover border-2 border-lime-400"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center text-black font-bold text-sm border-2 border-lime-300">
                        {initials ?? <FaRegUser className="w-4 h-4" />}
                      </div>
                    )}
                    <IoChevronDown
                      className={`w-3.5 h-3.5 text-slate-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-3xl border border-slate-200 p-2 animate-in fade-in zoom-in-95 duration-150">
                      {/* <div className="px-4 py-2 border-b border-slate-100 mb-1">
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {session!.user!.name}
                        </p>
                        <p className="text-slate-400 text-xs truncate">
                          {session!.user!.email}
                        </p>
                      </div> */}
                      <Link
                        href="/profil"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <FaRegUser className="w-4 h-4 text-slate-600" />
                        Profilul meu
                      </Link>
                      <Link
                        href="/post"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <FaWineBottle className="w-4 h-4 text-slate-600" />
                        Postează sticle
                      </Link>
                      <Link
                        href="/map"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <LuBike className="w-4 h-4 text-slate-600" />
                        Colectează sticle
                      </Link>
                      <div className="border-t border-slate-100 mt-1 pt-1">
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            show("Se deconectează...");
                            signOut({ callbackUrl: "/" });
                          }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm rounded-xl text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <MdLogout className="w-4 h-4" />
                          Deconectează-te
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={openAuthModal}
                  className="hidden sm:flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Intră în cont
                </button>
                <button
                  onClick={openAuthModal}
                  className="flex items-center justify-center gap-1 text-white bg-[#1a4d36] font-bold py-2.5 px-4 rounded-full text-sm hover:scale-105 transition-all duration-200 cursor-pointer group"
                >
                  <FaRecycle className="w-4 h-4 text-lime-400 group-hover:rotate-360 translate-y-px transition-transform duration-700 ease-in-out" />
                  <span className="tracking-tight">
                    Conectează-te
                    <span className="text-lime-400 ml-0.75 inline-block rotate-3 text-[16px] translate-y-[1px]">
                      !
                    </span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
