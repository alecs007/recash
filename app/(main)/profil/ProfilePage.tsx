"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useCallback } from "react";
import { User, Trophy, Calendar, Camera, Pencil, Check, X } from "lucide-react";
import { FaWineBottle, FaBan } from "react-icons/fa";
import { ProfileSummary } from "@/types";
import { StarRating } from "@/app/components/Profile/StarRating";
import { StatsGrid } from "@/app/components/Profile/StatsGrid";
import { PostsSection } from "@/app/components/Profile/PostsSection";
import { TransactionsSection } from "@/app/components/Profile/TransactionsSection";
import { BadgesSection } from "@/app/components/Profile/BadgesSection";

const API = process.env.NEXT_PUBLIC_API_VERSION ?? "v1";

// ─── Cover photo upload ───────────────────────────────────────────────────────

const COVER_STORAGE_KEY = "recash:profile:cover";

function useCoverPhoto() {
  const [coverUrl, setCoverUrl] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(COVER_STORAGE_KEY);
  });

  const setAndStore = useCallback((url: string | null) => {
    setCoverUrl(url);
    if (url) localStorage.setItem(COVER_STORAGE_KEY, url);
    else localStorage.removeItem(COVER_STORAGE_KEY);
  }, []);

  return { coverUrl, setAndStore };
}

// ─── Inline name editor ───────────────────────────────────────────────────────

function NameEditor({
  initialName,
  onSave,
}: {
  initialName: string;
  onSave: (name: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialName);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === initialName) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await onSave(trimmed);
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
          maxLength={100}
          className="bg-white/20 border border-white/40 text-white placeholder:text-white/50 rounded-lg px-3 py-1.5 text-xl font-extrabold tracking-tight outline-none focus:border-lime-400 backdrop-blur-sm w-48 sm:w-64"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-8 h-8 rounded-full bg-lime-400 flex items-center justify-center text-black hover:bg-lime-300 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setValue(initialName);
            setEditing(false);
          }}
          className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center gap-2 cursor-pointer"
    >
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
        {value}
      </h1>
      <Pencil className="w-4 h-4 text-white/50 group-hover:text-lime-400 transition-colors shrink-0" />
    </button>
  );
}

// ─── Cover photo button ───────────────────────────────────────────────────────

function CoverButton({ onFile }: { onFile: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === "string") onFile(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-full transition-all cursor-pointer"
      >
        <Camera className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Schimbă coperta</span>
        <span className="sm:hidden">Copertă</span>
      </button>
    </>
  );
}

// ─── Profile hero ─────────────────────────────────────────────────────────────

function ProfileHero({
  user,
  coverUrl,
  onCoverChange,
  onNameSave,
}: {
  user: ProfileSummary["user"];
  coverUrl: string | null;
  onCoverChange: (url: string) => void;
  onNameSave: (name: string) => Promise<void>;
}) {
  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const memberSince = new Date(user.createdAt).toLocaleDateString("ro-RO", {
    month: "long",
    year: "numeric",
  });
  const totalBottles = user.totalBottlesGiven + user.totalBottlesCollected;

  return (
    /* -mt-16 pulls the section up flush against the fixed nav (which adds pt-16 to <main>) */
    <div className="-mt-16 w-full">
      {/*
        Cover div:
        - Height = 64px (nav) + visible cover band (11rem mobile / 14rem sm / 17rem lg)
        - overflow-visible so the avatar can bleed below the bottom edge
        - All absolute children anchor to this div
      */}
      <style>{`
        .cover-hero { height: calc(64px + 11rem); }
        @media (min-width: 640px)  { .cover-hero { height: calc(64px + 14rem); } }
        @media (min-width: 1024px) { .cover-hero { height: calc(64px + 17rem); } }
      `}</style>
      <div className="cover-hero relative w-full bg-[#0d2b1d] overflow-visible">
        {/* Clip the bg/image to just the cover area — avatar allowed to bleed below */}
        <div className="absolute inset-0 overflow-hidden">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt="Cover"
              fill
              sizes="100vw"
              priority
              className="object-cover object-center"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at 20% 50%, #1a5c3a 0%, #0d2b1d 50%, #071a10 100%)",
              }}
            >
              <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage:
                    "linear-gradient(#a3e635 1px, transparent 1px), linear-gradient(90deg, #a3e635 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />
              <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-lime-400/10 blur-3xl" />
              <div className="absolute top-10 left-1/4 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl" />
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        </div>

        {/* ── Cover change button — top-right, below the nav ── */}
        <div className="absolute top-20 right-4 z-10">
          <CoverButton onFile={onCoverChange} />
        </div>

        {/* ── Avatar + name/rating — absolute bottom of the cover ── */}
        {/*
          Avatar sits so its bottom half crosses the cover boundary (translate-y-1/2).
          Name/rating are positioned above the avatar centre, over the dark gradient.
        */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 sm:px-6 lg:px-8">
          {/* Name + rating: pb keeps them above the avatar overlap zone */}
          <div className="pb-3 mb-1">
            <NameEditor
              initialName={user.name ?? "Utilizator"}
              onSave={onNameSave}
            />
            <div className="mt-1.5">
              <StarRating
                score={user.reputationScore}
                count={user.ratingCount}
                cancelledCount={user.cancelledCount}
              />
            </div>
          </div>

          {/* Avatar — translate-y-1/2 makes it straddle the cover/white-strip boundary */}
          <div className="relative inline-block translate-y-1/2">
            <div
              className="relative rounded-2xl overflow-hidden border-4 border-white shadow-xl"
              style={{ width: 88, height: 88 }}
            >
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? "Profil"}
                  fill
                  sizes="88px"
                  priority
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center text-black font-black text-2xl">
                  {initials ?? <User className="w-8 h-8" />}
                </div>
              )}
            </div>
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-lime-400 border-2 border-white shadow-sm" />
          </div>
        </div>
      </div>

      {/* ── White info strip — pt-12 = avatar half-height (88/2=44px ≈ 3rem) + breathing room ── */}
      <div className="bg-white border-b border-slate-100 px-4 sm:px-6 lg:px-8 pt-12 pb-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center text-slate-500 text-sm">
            <Trophy className="w-4 h-4 text-lime-500 mr-1.5" />
            <span className="font-bold text-slate-800 mr-1">
              {user._count.badges}
            </span>
            {user._count.badges === 1 ? "badge" : "badge-uri"}
          </div>
          <div className="flex items-center text-slate-500 text-sm">
            <Calendar className="w-4 h-4 text-lime-500 mr-1.5" />
            <span className="mr-1">Membru din</span>
            <span className="font-bold text-slate-800">{memberSince}</span>
          </div>
          <div className="flex items-center text-slate-500 text-sm">
            <FaWineBottle className="w-4 h-4 text-lime-500 mr-1.5" />
            <span className="font-bold text-slate-800 mr-1">
              {totalBottles}
            </span>
            sticle reciclate
          </div>
          {user.cancelledCount > 0 && (
            <div className="flex items-center text-red-400 text-sm">
              <FaBan className="w-3.5 h-3.5 mr-1.5" />
              <span className="font-semibold">{user.cancelledCount}</span>
              <span className="ml-1">
                {user.cancelledCount === 1 ? "anulare" : "anulări"}
              </span>
            </div>
          )}

          {/* Edit settings link — pushed to the right on sm+ */}
          <Link
            href="/setari"
            className="sm:ml-auto flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-lime-700 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editează profilul
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ProfilePage({ summary }: { summary: ProfileSummary }) {
  const { user, posts, totalPosts, transactions, totalTransactions, badges } =
    summary;
  const [displayName, setDisplayName] = useState(user.name ?? "Utilizator");
  const { coverUrl, setAndStore } = useCoverPhoto();

  const handleNameSave = async (name: string) => {
    setDisplayName(name);
    try {
      await fetch(`/api/${API}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    } catch {
      // non-fatal
    }
  };

  const patchedUser = { ...user, name: displayName };

  return (
    <div className="w-full min-h-[100dvh] pb-12 bg-slate-50">
      <ProfileHero
        user={patchedUser}
        coverUrl={coverUrl}
        onCoverChange={setAndStore}
        onNameSave={handleNameSave}
      />

      {/* Content — normal max-width container, top padding accounts for the info strip */}
      <div className="max-w-7xl mx-auto mt-6">
        <StatsGrid user={patchedUser} />
        <PostsSection posts={posts} totalPosts={totalPosts} />
        <BadgesSection badges={badges} />
        <TransactionsSection
          transactions={transactions}
          totalTransactions={totalTransactions}
          userId={user.id}
        />
      </div>
    </div>
  );
}
