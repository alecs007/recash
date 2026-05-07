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
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function useUnreadCount(authenticated: boolean) {
  const { data } = useSWR(
    authenticated ? "/api/v1/profile/notifications?page=1&limit=1" : null,
    fetcher,
    {
      refreshInterval: 20_000,
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
    },
  );
  return (data?.unreadCount as number) ?? 0;
}

function useActiveCounts(authenticated: boolean) {
  const { data } = useSWR(
    authenticated ? "/api/v1/profile/active-counts" : null,
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: true,
      dedupingInterval: 30_000,
    },
  );
  return {
    activePosts: (data?.activePosts as number) ?? 0,
    activeCollections: (data?.activeCollections as number) ?? 0,
  };
}

function ActiveIndicator({
  activePosts,
  activeCollections,
}: {
  activePosts: number;
  activeCollections: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasPosts = activePosts > 0;
  const hasCollections = activeCollections > 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const containerVariants = {
    initial: { opacity: 0, scale: 0.8, x: 10 },
    animate: { opacity: 1, scale: 1, x: 0 },
    exit: { opacity: 0, scale: 0.8, x: 10, transition: { duration: 0.2 } },
  };

  return (
    <AnimatePresence mode="wait">
      {hasPosts && hasCollections ? (
        <motion.div
          key="dual-indicator"
          variants={containerVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="relative"
          ref={containerRef}
        >
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative w-10 h-10 flex items-center justify-center cursor-pointer"
          >
            <div className="absolute top-0 left-0 z-10 w-7 h-7 rounded-full bg-lime-50 border-2 border-lime-400 flex items-center justify-center">
              <FaWineBottle className="w-3.5 h-3.5 text-lime-600" />
            </div>
            <div className="absolute bottom-0 right-0 z-0 w-7 h-7 rounded-full bg-blue-50 border-2 border-blue-400 flex items-center justify-center">
              <LuBike className="w-3.5 h-3.5 text-blue-600" />
            </div>
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 5 }}
                className="absolute top-full mt-2 right-0 bg-white border border-slate-200 rounded-2xl p-1.5 flex flex-col gap-1 z-[1002]"
              >
                <Link
                  href="/profil/postari?status=active"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-2 hover:bg-lime-50 rounded-xl transition-colors"
                >
                  <div className="relative grid place-items-center w-8.5 h-8.5 rounded-full bg-lime-50 border-2 border-lime-400">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <FaWineBottle className="w-4 h-4 text-lime-600" />
                    </motion.div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 pr-2 whitespace-nowrap">
                    Postare activă
                  </span>
                </Link>
                <Link
                  href="/map"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-2 hover:bg-blue-50 rounded-xl transition-colors"
                >
                  <div className="relative grid place-items-center w-8.5 h-8.5 rounded-full bg-blue-50 border-2 border-blue-400">
                    <motion.div
                      animate={{ x: [-1, 1, -1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      <LuBike className="w-4 h-4 text-blue-600" />
                    </motion.div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 pr-2 whitespace-nowrap">
                    Colectare activă
                  </span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ) : hasPosts || hasCollections ? (
        <motion.div
          key="single-indicator"
          variants={containerVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="flex items-center"
        >
          {hasPosts ? (
            <Link
              href="/profil/postari?status=active"
              className="relative grid place-items-center w-10 h-10 rounded-full bg-lime-50 border-2 border-lime-400 hover:bg-lime-100 transition-colors group"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <FaWineBottle className="w-5 h-5 text-lime-600" />
              </motion.div>
            </Link>
          ) : (
            <Link
              href="/map"
              className="relative grid place-items-center w-10 h-10 rounded-full bg-blue-50 border-2 border-blue-400 hover:bg-blue-100 transition-colors group"
            >
              <motion.div
                animate={{ x: [-1, 1, -1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <LuBike className="w-5 h-5 text-blue-600" />
              </motion.div>
            </Link>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

const ProfileShimmer = () => (
  <div className="flex items-center gap-3 pl-1 pr-2 py-1">
    <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
    <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
    <div className="w-3.5 h-3.5 rounded-full bg-slate-200 animate-pulse" />
  </div>
);

export default function Header({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { open: openAuthModal } = useAuthModal();
  const { show } = useLoading();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAuthPage = pathname?.startsWith("/auth");
  const isAuthenticated = status === "authenticated" && !!session?.user;
  const isLoading = status === "loading";

  const unreadCount = useUnreadCount(isAuthenticated);
  const { activePosts, activeCollections } = useActiveCounts(isAuthenticated);

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

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleMouseEnter = () => {
    if (window.matchMedia("(pointer: fine)").matches) setDropdownOpen(true);
  };
  const handleMouseLeave = () => {
    if (window.matchMedia("(pointer: fine)").matches) setDropdownOpen(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-[1001] backdrop-blur-md bg-white">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 shrink-0">
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

          <div className="flex items-center gap-2 sm:gap-3">
            {isLoading ? (
              <ProfileShimmer />
            ) : isAuthenticated ? (
              <>
                <ActiveIndicator
                  activePosts={activePosts}
                  activeCollections={activeCollections}
                />

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

                <div
                  ref={dropdownRef}
                  className="relative"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
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
                        className="w-9 h-9 rounded-full object-cover border border-lime-400"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center text-black font-bold text-sm border-2 border-lime-300">
                        {initials ?? <FaRegUser className="w-4 h-4" />}
                      </div>
                    )}
                    <IoChevronDown
                      className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-300 ${dropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute right-0 top-full mt-0 pt-2 w-56 origin-top-right"
                      >
                        <div className="bg-white rounded-3xl border border-slate-200 p-2">
                          <Link
                            href="/profil"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <FaRegUser className="w-4 h-4 text-slate-600" />
                            Profilul meu
                          </Link>
                          {activePosts == 0 && (
                            <Link
                              href="/post"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm rounded-xl text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-3">
                                <FaWineBottle className="w-4 h-4 text-slate-600" />
                                Postează sticle
                              </span>
                            </Link>
                          )}
                          {activeCollections == 0 && (
                            <Link
                              href="/map"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm rounded-xl text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-3">
                                <LuBike className="w-4 h-4 text-slate-600" />
                                Colectează sticle
                              </span>
                            </Link>
                          )}
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
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                  className="flex items-center justify-center gap-1 text-white bg-[#1a4d36] font-bold py-2.25 px-4 rounded-full text-sm hover:scale-105 transition-all duration-200 cursor-pointer group"
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
