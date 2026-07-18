"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import useSWR, { preload } from "swr";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronRight } from "lucide-react";
import { FaWineBottle } from "react-icons/fa";
import { TbTruckDelivery } from "react-icons/tb";
import { HiOutlineArrowsRightLeft } from "react-icons/hi2";
import { VerifiedBadge } from "@/app/components/UI/VerifiedBadge";
import { BADGE_CONFIG, BADGE_COLORS } from "@/lib/constants/badges";
import { useI18n } from "@/context/I18nContext";

const API = process.env.NEXT_PUBLIC_API_VERSION ?? "v1";

const OPEN_DELAY = 350;
const CLOSE_DELAY = 250;
const CARD_WIDTH = 272; // w-68
const CARD_EST_HEIGHT = 210;
const MARGIN = 8;
const ANCHOR_GAP = 10;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type HoverProfile = {
  user?: {
    id: string;
    name: string | null;
    image: string | null;
    certified: boolean;
    createdAt: string;
    totalBottlesGiven: number;
    totalBottlesCollected: number;
    totalTransactions: number;
    reputationScore: number;
    ratingCount: number;
    _count: { posts: number; claimedPosts: number; badges: number };
  };
  badges?: { id: string; type: string; earnedAt: string }[];
  error?: string;
};

function Stars({ score }: { score: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className="w-3.5 h-3.5" viewBox="0 0 20 20">
          <path
            fill={i <= Math.round(score) ? "#FFDF00" : "#e2e8f0"}
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      ))}
    </span>
  );
}

function CardSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-28 bg-slate-100 rounded-lg" />
          <div className="h-3 w-20 bg-slate-100 rounded-lg" />
        </div>
      </div>
      {/* <div className="h-12 bg-slate-100 rounded-xl" /> */}
      <div className="h-8 bg-slate-100 rounded-xl" />
    </div>
  );
}

function CardContent({ userId }: { userId: string }) {
  const { t, locale } = useI18n();
  const { data } = useSWR<HoverProfile>(
    `/api/${API}/users/${userId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    },
  );

  if (!data) return <CardSkeleton />;

  const user = data.user;
  if (!user) {
    return (
      <p className="text-xs text-slate-400 text-center py-4">
        {t({ ro: "Profil indisponibil", en: "Profile unavailable" })}
      </p>
    );
  }

  const badges = (data.badges ?? []).filter((b) => BADGE_CONFIG[b.type]);
  const shownBadges = badges.slice(0, 6);
  const extraBadges = badges.length - shownBadges.length;

  const memberSince = new Date(user.createdAt).toLocaleDateString(
    locale === "ro" ? "ro-RO" : "en-GB",
    { month: "long", year: "numeric" },
  );

  const stats = [
    {
      icon: <FaWineBottle className="w-3 h-3 text-[#7EC3E5]" />,
      value: user.totalBottlesGiven,
      label: t({ ro: "date", en: "given" }),
    },
    {
      icon: <TbTruckDelivery className="w-3.5 h-3.5 text-lime-600" />,
      value: user.totalBottlesCollected,
      label: t({ ro: "colectate", en: "collected" }),
    },
    {
      icon: <HiOutlineArrowsRightLeft className="w-3.5 h-3.5 text-slate-400" />,
      value: user.totalTransactions,
      label: t({ ro: "tranzacții", en: "transactions" }),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-lime-50 border border-lime-200 flex items-center justify-center overflow-hidden shrink-0">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name ?? ""}
              width={48}
              height={48}
              draggable={false}
              className="object-cover w-full h-full"
            />
          ) : (
            <span className="text-base font-bold text-lime-700">
              {user.name?.[0] ?? "?"}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-900 truncate flex items-center gap-0.5">
            {user.name ?? t({ ro: "Utilizator", en: "User" })}
            {user.certified && <VerifiedBadge className="w-4 h-4 shrink-0" />}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Stars score={user.reputationScore} />
            <span className="text-[11px] font-semibold text-slate-500">
              {user.reputationScore.toFixed(1)}
            </span>
            {user.ratingCount > 0 && (
              <span className="text-[11px] text-slate-300">
                ({user.ratingCount})
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
            <Calendar className="w-3 h-3 shrink-0" />
            {t({ ro: "Membru din", en: "Member since" })} {memberSince}
          </p>
        </div>
      </div>

      {/* <div className="flex items-center justify-between bg-slate-50 rounded-lg px-2.5 py-1.5">
        {stats.map((s, i) => (
          <span
            key={i}
            className="flex items-center gap-1 text-[10px] text-slate-400"
          >
            {s.icon}
            <span className="font-bold text-slate-700 tabular-nums">
              {s.value.toLocaleString(locale === "ro" ? "ro-RO" : "en-GB")}
            </span>
            {s.label}
          </span>
        ))}
      </div> */}

      {shownBadges.length > 0 && (
        <div className="flex items-center gap-1.5">
          {shownBadges.map((b) => {
            const cfg = BADGE_CONFIG[b.type];
            const color = BADGE_COLORS[b.type] ?? "#64748B";
            return (
              <span
                key={b.id}
                title={t(cfg.label)}
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: color,
                  border: `1.5px solid color-mix(in srgb, ${color} 60%, black)`,
                }}
              >
                <Image
                  src={cfg.image}
                  alt={t(cfg.label)}
                  width={40}
                  height={40}
                  draggable={false}
                  className="w-4 h-4 object-contain"
                />
              </span>
            );
          })}
          {extraBadges > 0 && (
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-1.5 py-0.5">
              +{extraBadges}
            </span>
          )}
        </div>
      )}

      <Link
        href={`/user/${user.id}`}
        className="flex items-center justify-center gap-1 w-full py-2 rounded-xl bg-slate-50 hover:bg-lime-50 text-xs font-bold text-[#123424] hover:text-lime-700 transition-colors"
      >
        {t({ ro: "Vezi profilul", en: "View profile" })}
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

/**
 * Wraps any element showing a user (avatar, name, row) and shows a floating
 * profile summary when hovered. Renders children untouched (display: contents),
 * so it can wrap inline links or whole block rows alike. Inactive for the
 * authed user's own profile and on touch-only devices.
 */
export function UserHoverCard({
  userId,
  children,
  className = "contents",
}: {
  userId: string;
  children: ReactNode;
  /** Wrapper class. Default "contents" (no box); pass "block" when wrapping
   *  rows inside space-y-* lists so the margins still apply. */
  className?: string;
}) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    placement: "below" | "above";
  } | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSelf = session?.user?.id === userId;

  const cancelTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  };

  const scheduleOpen = (e: React.MouseEvent<HTMLSpanElement>) => {
    // Hover-only UI: skip on touch devices and on your own profile.
    if (isSelf) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;
    cancelTimers();

    // Warm the profile data during the hover delay, so the card usually
    // opens with content instead of a skeleton.
    preload(`/api/${API}/users/${userId}`, fetcher);

    // The wrapper span may have display:contents (no box) — anchor to the
    // element it wraps so the card always opens attached to it.
    const wrapper = e.currentTarget;
    openTimer.current = setTimeout(() => {
      const anchor = wrapper.firstElementChild ?? wrapper;
      if (!anchor.isConnected) return;
      const rect = anchor.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const left = Math.min(
        Math.max(rect.left, MARGIN),
        vw - CARD_WIDTH - MARGIN,
      );

      // Always attached to the element: below its bottom-left corner, or
      // above it when there's no room underneath.
      if (rect.bottom + ANCHOR_GAP + CARD_EST_HEIGHT <= vh - MARGIN) {
        setPos({ left, top: rect.bottom + ANCHOR_GAP, placement: "below" });
      } else {
        setPos({
          left,
          bottom: vh - rect.top + ANCHOR_GAP,
          placement: "above",
        });
      }
      setOpen(true);
    }, OPEN_DELAY);
  };

  const scheduleClose = () => {
    cancelTimers();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  };

  const keepOpen = () => cancelTimers();

  useEffect(() => cancelTimers, []);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { capture: true, passive: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <span
        className={className}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
      >
        {children}
      </span>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                data-user-hovercard
                initial={{
                  opacity: 0,
                  scale: 0.94,
                  y: pos.placement === "below" ? -10 : 10,
                }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.97,
                  y: pos.placement === "below" ? -6 : 6,
                }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  top: pos.top,
                  bottom: pos.bottom,
                  left: pos.left,
                  width: CARD_WIDTH,
                  transformOrigin:
                    pos.placement === "below" ? "top left" : "bottom left",
                }}
                className="fixed z-[1300] bg-white rounded-2xl border border-slate-200 shadow shadow-slate-200/60 p-3.5"
                onMouseEnter={keepOpen}
                onMouseLeave={scheduleClose}
              >
                <CardContent userId={userId} />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
