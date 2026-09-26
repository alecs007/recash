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
import { BADGE_CONFIG } from "@/lib/constants/badges";
import { useI18n } from "@/context/I18nContext";

const API = process.env.NEXT_PUBLIC_API_VERSION ?? "v1";

const OPEN_DELAY = 350;
const CLOSE_DELAY = 250;
const CARD_WIDTH = 272; // w-68
const CARD_EST_HEIGHT = 210;
const MARGIN = 8;
const ANCHOR_GAP = 10;

type Pos = {
  left: number;
  top?: number;
  bottom?: number;
  placement: "below" | "above";
};

/**
 * Position the card attached to `anchor`: below its bottom-left corner, or
 * above it when there isn't room underneath. `top`/`bottom` are the outer
 * layer's edge (flush with the anchor); the ANCHOR_GAP is added back as
 * transparent padding so the hover area stays continuous. Returns null when
 * the anchor isn't laid out (detached or zero-size).
 */
function computePos(anchor: Element): Pos | null {
  if (!anchor.isConnected) return null;
  const rect = anchor.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.min(Math.max(rect.left, MARGIN), vw - CARD_WIDTH - MARGIN);

  if (rect.bottom + ANCHOR_GAP + CARD_EST_HEIGHT <= vh - MARGIN) {
    return { left, top: rect.bottom, placement: "below" };
  }
  return { left, bottom: vh - rect.top, placement: "above" };
}

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

  // Parked: the stats row that consumes this is commented out in the JSX below.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-3"
    >
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
            return (
              <span
                key={b.id}
                title={t(cfg.label)}
                className="flex items-center justify-center shrink-0"
              >
                <Image
                  src={cfg.image}
                  alt={t(cfg.label)}
                  width={40}
                  height={40}
                  draggable={false}
                  className="w-6 h-6 object-contain"
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
    </motion.div>
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
  const [pos, setPos] = useState<Pos | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The element the card is pinned to, so it can follow on scroll/resize.
  const anchorRef = useRef<Element | null>(null);

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
      const p = computePos(anchor);
      if (!p) return;
      anchorRef.current = anchor;
      setPos(p);
      setOpen(true);
    }, OPEN_DELAY);
  };

  const scheduleClose = () => {
    cancelTimers();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  };

  const keepOpen = () => cancelTimers();

  useEffect(() => cancelTimers, []);

  // While open, keep the card pinned to its anchor as the page scrolls
  // instead of closing on the first scroll tick — that made the card flicker
  // away on trackpads. Only close once the anchor scrolls out of view.
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const sync = () => {
      raf = 0;
      const anchor = anchorRef.current;
      if (!anchor || !anchor.isConnected) {
        setOpen(false);
        return;
      }
      const rect = anchor.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false);
        return;
      }
      const p = computePos(anchor);
      if (p) setPos(p);
    };
    const onScrollResize = () => {
      if (!raf) raf = requestAnimationFrame(sync);
    };
    window.addEventListener("scroll", onScrollResize, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", onScrollResize);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScrollResize, { capture: true });
      window.removeEventListener("resize", onScrollResize);
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
              // Outer layer owns positioning + hover intent. Its transparent
              // padding bridges the gap to the anchor so moving the cursor
              // onto the card never crosses dead space (the old flicker).
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
                  paddingTop: pos.placement === "below" ? ANCHOR_GAP : undefined,
                  paddingBottom:
                    pos.placement === "above" ? ANCHOR_GAP : undefined,
                  transformOrigin:
                    pos.placement === "below" ? "top left" : "bottom left",
                }}
                className="fixed z-[1300]"
                onMouseEnter={keepOpen}
                onMouseLeave={scheduleClose}
              >
                <div className="bg-white rounded-2xl border border-slate-200 shadow shadow-slate-200/60 p-3.5">
                  <CardContent userId={userId} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
