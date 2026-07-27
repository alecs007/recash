"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { useAuthModal } from "@/context/AuthModalContext";
import { useLoading } from "@/context/LoadingContext";
import { FaWineBottle, FaRegUser, FaRecycle } from "react-icons/fa";
import { TbTruckDelivery, TbClockHour4, TbLoader2 } from "react-icons/tb";
import { FiPlusSquare } from "react-icons/fi";
import { IoChevronDown, IoClose } from "react-icons/io5";
import { MdLogout } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import { mutate as globalMutate } from "swr";
import { useNotificationBell } from "@/hooks/useNotificationBell";
import { useActiveCounts, useSetActiveCounts } from "@/hooks/useActiveCounts";
import type { PendingRequestSummary } from "@/hooks/useActiveCounts";
import { MAX_PENDING_REQUESTS_PER_COLLECTOR } from "@/lib/constants/posts";
import { OverheaderAd } from "./OverheaderAd";
import { LocaleSwitcher, PreferenceSwitcherInline } from "./LocaleSwitcher";
import { FaRegBell } from "react-icons/fa";
import { useI18n } from "@/context/I18nContext";

function PendingRequestRows({
  list,
  onNavigate,
}: {
  list: PendingRequestSummary[];
  onNavigate: () => void;
}) {
  const { t } = useI18n();
  const setActiveCounts = useSetActiveCounts();
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  const handleWithdraw = async (postId: string) => {
    setWithdrawing(postId);
    try {
      const res = await fetch(`/api/v1/posts/${postId}/claim`, {
        method: "DELETE",
      });
      if (res.ok) {
        setActiveCounts((c) => {
          const rest = c.pendingRequestsList.filter((r) => r.postId !== postId);
          return {
            pendingRequests: Math.max(0, c.pendingRequests - 1),
            pendingRequestsList: rest,
            pendingRequestPostId: rest[0]?.postId ?? null,
          };
        });
        void globalMutate(`/api/v1/posts/${postId}`);
        void globalMutate("/api/v1/posts/active");
      }
    } catch {
      // Keep the row; the next revalidation reflects the truth.
    } finally {
      setWithdrawing(null);
    }
  };

  return (
    <AnimatePresence initial={false}>
      {list.map((r) => (
        <motion.div
          key={r.postId}
          layout
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="flex items-center rounded-xl hover:bg-slate-50 transition-colors">
            <Link
              href={`/post/${r.postId}`}
              onClick={onNavigate}
              className="flex items-center gap-3 p-2 flex-1 min-w-0"
            >
              <div className="grid place-items-center w-8 h-8 shrink-0 rounded-full bg-slate-100 border-2 border-slate-400">
                <TbClockHour4 className="w-4 h-4 text-slate-600" />
              </div>
              <div className="min-w-0 pr-1">
                <p className="text-xs font-bold text-slate-700 truncate">
                  {r.locationName ?? t({ ro: "Anunț", en: "Listing" })}
                </p>
                <p className="text-[10px] text-slate-400">
                  {r.bottleCount} {t({ ro: "sticle", en: "bottles" })}
                </p>
              </div>
            </Link>
            <button
              onClick={() => handleWithdraw(r.postId)}
              disabled={withdrawing === r.postId}
              aria-label={t({ ro: "Retrage cererea", en: "Withdraw request" })}
              title={t({ ro: "Retrage cererea", en: "Withdraw request" })}
              className="grid place-items-center w-7 h-7 mr-1.5 shrink-0 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {withdrawing === r.postId ? (
                <TbLoader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <IoClose className="w-4 h-4" />
              )}
            </button>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

function ActiveIndicator({
  activePosts,
  activeCollections,
  activePostId,
  activeCollectionId,
  pendingRequests,
  pendingRequestsList,
  onOpenChange,
}: {
  activePosts: number;
  activeCollections: number;
  activePostId: string | null;
  activeCollectionId: string | null;
  pendingRequests: number;
  pendingRequestsList: PendingRequestSummary[];
  onOpenChange?: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasPosts = activePosts > 0;
  // Bound collection (IN_PROGRESS) and pending request are mutually exclusive;
  // both drive the "collection side" but are labelled/badged differently.
  const hasBoundCollection = activeCollections > 0;
  const hasPending = !hasBoundCollection && pendingRequests > 0;
  const hasCollections = hasBoundCollection || hasPending;
  const collectionLabel = hasPending
    ? pendingRequests > 1
      ? t({ ro: "Cereri trimise", en: "Requests sent" })
      : t({ ro: "Cerere trimisă", en: "Request sent" })
    : t({ ro: "Colectare activă", en: "Active collection" });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const slideIn = {
    initial: { opacity: 0, scale: 0.8, x: 10 },
    animate: { opacity: 1, scale: 1, x: 0 },
    exit: { opacity: 0, scale: 0.8, x: 10, transition: { duration: 0.15 } },
  };

  const postHref = activePostId ? `/post/${activePostId}` : "/profil/postari";
  const collectionHref = activeCollectionId
    ? `/post/${activeCollectionId}`
    : "/map";

  return (
    <AnimatePresence mode="wait">
      {!hasPosts && !hasCollections ? null : hasPosts && hasCollections ? (
        <motion.div key="dual" {...slideIn} className="relative" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={t({ ro: "Activitate în curs", en: "Active activity" })}
            aria-expanded={open}
            className="relative w-10 h-10 flex items-center justify-center cursor-pointer"
          >
            <div className="absolute -top-1 -right-1.5 z-[50] pointer-events-none">
              <div className="bg-red-600 text-white text-[8px] font-black px-1 py-0.5 rounded-sm leading-none tracking-tighter border border-white flex items-center justify-center">
                LIVE
              </div>
            </div>
            <div className="absolute top-0 left-0 z-10 w-7 h-7 rounded-full bg-lime-50 border-2 border-lime-400 flex items-center justify-center">
              <FaWineBottle className="w-3.5 h-3.5 text-lime-600" />
            </div>
            <div
              className={`absolute bottom-0 right-0 z-0 w-7 h-7 rounded-full border-2 flex items-center justify-center ${
                hasPending
                  ? "bg-slate-100 border-slate-400"
                  : "bg-blue-50 border-blue-400"
              }`}
            >
              {hasPending ? (
                <TbClockHour4 className="w-3.5 h-3.5 text-slate-600" />
              ) : (
                <TbTruckDelivery className="w-3.5 h-3.5 text-blue-600" />
              )}
            </div>
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 5 }}
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-2xl p-1.5 flex flex-col gap-1 z-[1002] min-w-[230px] max-w-[290px]"
              >
                <Link
                  href={postHref}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 p-2 hover:bg-lime-50 rounded-xl transition-colors"
                >
                  <div className="grid place-items-center w-8 h-8 rounded-full bg-lime-50 border-2 border-lime-400">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <FaWineBottle className="w-4 h-4 text-lime-600" />
                    </motion.div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 pr-2 whitespace-nowrap">
                    {t({ ro: "Postare activă", en: "Active post" })}
                  </span>
                </Link>
                {hasPending ? (
                  <>
                    <div className="px-2 pt-1 pb-0.5 text-[11px] font-semibold text-slate-400">
                      {collectionLabel}
                    </div>
                    <PendingRequestRows
                      list={pendingRequestsList}
                      onNavigate={() => setOpen(false)}
                    />
                  </>
                ) : (
                  <Link
                    href={collectionHref}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 p-2 hover:bg-blue-50 rounded-xl transition-colors"
                  >
                    <div className="grid place-items-center w-8 h-8 rounded-full border-2 bg-blue-50 border-blue-400">
                      <motion.div
                        animate={{ x: [-1, 1, -1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        <TbTruckDelivery className="w-4 h-4 text-blue-600" />
                      </motion.div>
                    </div>
                    <span className="text-xs font-bold text-slate-700 pr-2 whitespace-nowrap">
                      {collectionLabel}
                    </span>
                  </Link>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div
          key="single"
          {...slideIn}
          className="relative flex items-center"
          ref={ref}
        >
          <div className="absolute -top-1 -right-1 z-[50] pointer-events-none">
            <div className="bg-red-600 text-white text-[8px] font-black px-1 py-0.5 rounded-sm leading-none tracking-tighter border border-white flex items-center justify-center">
              LIVE
            </div>
          </div>
          {hasPosts ? (
            <Link
              href={postHref}
              className="grid place-items-center w-10 h-10 rounded-full bg-lime-50 border-2 border-lime-400 hover:bg-lime-100 transition-colors"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <FaWineBottle className="w-5 h-5 text-lime-600" />
              </motion.div>
            </Link>
          ) : hasPending ? (
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={collectionLabel}
              aria-expanded={open}
              className="grid place-items-center w-10 h-10 rounded-full border-2 bg-slate-100 border-slate-400 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <TbClockHour4 className="w-5 h-5 text-slate-600" />
              </motion.div>
            </button>
          ) : (
            <Link
              href={collectionHref}
              aria-label={collectionLabel}
              className="grid place-items-center w-10 h-10 rounded-full border-2 bg-blue-50 border-blue-400 hover:bg-blue-100 transition-colors"
            >
              <motion.div
                animate={{ x: [-1, 1, -1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <TbTruckDelivery className="w-5 h-5 text-blue-600" />
              </motion.div>
            </Link>
          )}

          <AnimatePresence>
            {open && hasPending && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 5 }}
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-2xl p-1.5 flex flex-col gap-1 z-[1002] min-w-[230px] max-w-[290px]"
              >
                <div className="px-2 pt-1 pb-0.5 text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                  {collectionLabel}
                </div>
                <PendingRequestRows
                  list={pendingRequestsList}
                  onNavigate={() => setOpen(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const Shimmer = () => (
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
  const { t } = useI18n();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [indicatorOpen, setIndicatorOpen] = useState(false);
  const [localeOpen, setLocaleOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Any open header dropdown dims the rest of the page.
  const scrimOpen = dropdownOpen || indicatorOpen || localeOpen;

  const isAuthenticated = status === "authenticated" && !!session?.user;
  const isLoading = status === "loading";

  const { unreadCount } = useNotificationBell(isAuthenticated);

  const {
    activePosts,
    activeCollections,
    activePostId,
    activeCollectionId,
    pendingRequests,
    pendingRequestsList,
  } = useActiveCounts(isAuthenticated);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const updateVar = () => {
      document.documentElement.style.setProperty(
        "--header-height",
        `${el.offsetHeight}px`,
      );
    };
    updateVar();
    const ro = new ResizeObserver(updateVar);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (pathname?.startsWith("/auth")) return <>{children}</>;

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header
        ref={headerRef}
        className="fixed inset-x-0 top-0 z-[10001] bg-white"
        style={{ willChange: "transform" }}
      >
        <OverheaderAd headerRef={headerRef} />

        <AnimatePresence>
          {scrimOpen && (
            <motion.div
              key="header-scrim-top"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 z-[1000] bg-slate-900/25 backdrop-blur-[2px]"
              aria-hidden
            />
          )}
        </AnimatePresence>
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/images/recash-logo.webp"
              alt="Recash"
              width={643}
              height={138}
              className="h-8 w-auto object-contain"
              priority
              draggable={false}
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {isLoading ? (
              <Shimmer />
            ) : isAuthenticated ? (
              <>
                <ActiveIndicator
                  activePosts={activePosts}
                  activeCollections={activeCollections}
                  activePostId={activePostId}
                  activeCollectionId={activeCollectionId}
                  pendingRequests={pendingRequests}
                  pendingRequestsList={pendingRequestsList}
                  onOpenChange={setIndicatorOpen}
                />

                <Link
                  href="/notificari"
                  aria-label={t({ ro: "Notificări", en: "Notifications" })}
                  className="relative grid place-items-center w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
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
                    className="flex items-center gap-2 pl-1 pr-2 py-1 -translate-x-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label={t({ ro: "Meniu profil", en: "Profile menu" })}
                    aria-expanded={dropdownOpen}
                  >
                    {session.user.image ? (
                      <Image
                        src={session.user.image}
                        alt={session.user.name ?? "Profil"}
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
                        className="absolute right-0 top-full mt-0 pt-2 w-56 origin-top-right z-[1002]"
                      >
                        <div className="bg-white rounded-3xl border border-slate-200 p-2">
                          <Link
                            href="/profil"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <FaRegUser className="w-4 h-4 text-slate-600" />
                            {t({ ro: "Profilul meu", en: "My profile" })}
                          </Link>
                          {activePosts === 0 && (
                            <Link
                              href="/post"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              <FiPlusSquare className="w-4 h-4 text-slate-600" />
                              {t({
                                ro: "Creează un anunț",
                                en: "Create a listing",
                              })}
                            </Link>
                          )}
                          {activeCollections === 0 &&
                            pendingRequests <
                              MAX_PENDING_REQUESTS_PER_COLLECTOR && (
                              <Link
                                href="/map"
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                              >
                                <TbTruckDelivery className="w-4 h-4 text-slate-600" />
                                {t({
                                  ro: "Colectează sticle",
                                  en: "Collect bottles",
                                })}
                              </Link>
                            )}
                          <div className="border-t border-slate-100 mt-1 pt-1">
                            <PreferenceSwitcherInline />
                          </div>
                          <div className="border-t border-slate-100 mt-1 pt-1">
                            <button
                              onClick={() => {
                                setDropdownOpen(false);
                                show(
                                  t({
                                    ro: "Se deconectează...",
                                    en: "Signing out...",
                                  }),
                                );
                                signOut({ callbackUrl: "/" });
                              }}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm rounded-xl text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <MdLogout className="w-4 h-4" />
                              {t({ ro: "Deconectează-te", en: "Sign out" })}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <LocaleSwitcher onOpenChange={setLocaleOpen} />
                <button
                  onClick={openAuthModal}
                  className="hidden sm:flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  {t({ ro: "Intră în cont", en: "Sign in" })}
                </button>

                <button
                  onClick={openAuthModal}
                  className="relative p-[2px] overflow-hidden rounded-full flex items-center justify-center hover:scale-105 transition-transform duration-200 cursor-pointer group"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 4,
                      ease: "linear",
                    }}
                    className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#A3E635_0deg_45deg,transparent_45deg_180deg,#A3E635_180deg_225deg,transparent_225deg_360deg)]"
                  />

                  <div className="relative flex items-center justify-center gap-1 text-[#1a4d36] bg-slate-50 font-bold py-2.25 px-4 rounded-full text-sm">
                    <FaRecycle className="w-4 h-4 text-lime-600 translate-y-px" />
                    <span className="tracking-tight">
                      Start now
                      <span className="text-lime-600 ml-0.75 inline-block rotate-3 text-[16px] translate-y-[1px]">
                        !
                      </span>
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <AnimatePresence>
        {scrimOpen && (
          <motion.div
            key="header-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[10000] bg-slate-900/25 backdrop-blur-[2px]"
            aria-hidden
          />
        )}
      </AnimatePresence>

      <main
        className="flex-1"
        style={{
          paddingTop: "var(--header-height, 64px)",
          transition: "padding-top 0.28s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
