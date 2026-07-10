"use client";

import { useState } from "react";
import { SectionHeader } from "./SectionHeader";
import { BadgeCard, BadgeData } from "../UI/BadgeCard";
import { BADGE_CONFIG } from "@/lib/constants/badges";
import { useI18n } from "@/context/I18nContext";

export function BadgesSection({ badges }: { badges: BadgeData[] }) {
  const { t } = useI18n();
  // Local optimistic state: track which badge IDs have been marked seen this session
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set());

  const earnedBadges = badges.filter((b) => BADGE_CONFIG[b.type]);
  if (earnedBadges.length === 0) return null;

  const handleSeen = (id: string) => {
    setSeenIds((prev) => new Set([...prev, id]));
  };

  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mb-10 p-4 sm:p-6 bg-slate-50 border border-slate-100 rounded-2xl">
      <SectionHeader
        title={t({ ro: "Badge-urile mele", en: "My badges" })}
        href="/profil/badges"
        hrefLabel={t({ ro: "Vezi toate", en: "See all" })}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {earnedBadges.map((badge) => (
          <BadgeCard
            key={badge.id}
            badge={{ ...badge, seen: badge.seen || seenIds.has(badge.id) }}
            earned
            onSeen={handleSeen}
          />
        ))}
      </div>
    </div>
  );
}
