"use client";

import { useState } from "react";
import { SectionHeader } from "./SectionHeader";
import { BadgeCard, BadgeData } from "../UI/BadgeCard";
import { BADGE_CONFIG } from "@/lib/constants/badges";

export function BadgesSection({ badges }: { badges: BadgeData[] }) {
  // Local optimistic state: track which badge IDs have been marked seen this session
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set());

  const earnedBadges = badges.filter((b) => BADGE_CONFIG[b.type]);
  if (earnedBadges.length === 0) return null;

  const handleSeen = (id: string) => {
    setSeenIds((prev) => new Set([...prev, id]));
  };

  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mb-10">
      <SectionHeader
        title="Badge-urile mele"
        href="/profil/badges"
        hrefLabel="Vezi toate"
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
