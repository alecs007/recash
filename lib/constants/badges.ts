export type BadgeCfg = {
  image: string;
  label: { ro: string; en: string };
  desc: { ro: string; en: string };
  group: { ro: string; en: string };
};

export const BADGE_GROUPS = {
  posts: { ro: "Postări", en: "Posts" },
  collections: { ro: "Colectări", en: "Collections" },
  eco: { ro: "Eco", en: "Eco" },
  activity: { ro: "Activitate", en: "Activity" },
  special: { ro: "Speciale", en: "Special" },
} as const;

export type BadgeGroupKey = keyof typeof BADGE_GROUPS;

const GROUPS = BADGE_GROUPS;

export const BADGE_CONFIG: Record<string, BadgeCfg> = {
  FIRST_POST: {
    image: "/images/badges/prima-postare.avif",
    label: { ro: "Prima Postare", en: "First Post" },
    desc: { ro: "Ai postat pentru prima dată", en: "You posted for the first time" },
    group: GROUPS.posts,
  },
  POST_VETERAN_10: {
    image: "/images/badges/10-postari.avif",
    label: { ro: "10 Postări", en: "10 Posts" },
    desc: { ro: "Ai publicat 10 anunțuri", en: "You published 10 listings" },
    group: GROUPS.posts,
  },
  POST_VETERAN_50: {
    image: "/images/badges/50-postari.avif",
    label: { ro: "50 Postări", en: "50 Posts" },
    desc: { ro: "Ai publicat 50 de anunțuri", en: "You published 50 listings" },
    group: GROUPS.posts,
  },
  POST_VETERAN_100: {
    image: "/images/badges/100-postari.avif",
    label: { ro: "100 Postări", en: "100 Posts" },
    desc: { ro: "Maestru al postărilor", en: "Master of posting" },
    group: GROUPS.posts,
  },
  FIRST_COLLECTION: {
    image: "/images/badges/prima-colectare.avif",
    label: { ro: "Prima Colectare", en: "First Collection" },
    desc: {
      ro: "Ai colectat pentru prima dată",
      en: "You collected for the first time",
    },
    group: GROUPS.collections,
  },
  COLLECTOR_STARTER_10: {
    image: "/images/badges/10-colectari.avif",
    label: { ro: "10 Colectări", en: "10 Collections" },
    desc: { ro: "10 colectări finalizate", en: "10 completed collections" },
    group: GROUPS.collections,
  },
  COLLECTOR_PRO_50: {
    image: "/images/badges/50-colectari.avif",
    label: { ro: "50 Colectări", en: "50 Collections" },
    desc: { ro: "Colector profesionist", en: "Professional collector" },
    group: GROUPS.collections,
  },
  COLLECTOR_ELITE_100: {
    image: "/images/badges/100-colectari.avif",
    label: { ro: "100 Colectări", en: "100 Collections" },
    desc: { ro: "Colector de elită", en: "Elite collector" },
    group: GROUPS.collections,
  },
  ECO_STARTER: {
    image: "/images/badges/50-sticle.avif",
    label: { ro: "Eco Starter", en: "Eco Starter" },
    desc: { ro: "50 sticle reciclate", en: "50 bottles recycled" },
    group: GROUPS.eco,
  },
  ECO_WARRIOR: {
    image: "/images/badges/prima-postare.avif",
    label: { ro: "Eco Warrior", en: "Eco Warrior" },
    desc: { ro: "250 sticle reciclate", en: "250 bottles recycled" },
    group: GROUPS.eco,
  },
  ECO_CHAMPION: {
    image: "/images/badges/prima-postare.avif",
    label: { ro: "Eco Champion", en: "Eco Champion" },
    desc: { ro: "1.000 sticle reciclate", en: "1,000 bottles recycled" },
    group: GROUPS.eco,
  },
  ECO_LEGEND: {
    image: "/images/badges/prima-postare.avif",
    label: { ro: "Eco Legend", en: "Eco Legend" },
    desc: { ro: "5.000 sticle reciclate", en: "5,000 bottles recycled" },
    group: GROUPS.eco,
  },
  SPEED_DEMON: {
    image: "/images/badges/prima-postare.avif",
    label: { ro: "Speed Demon", en: "Speed Demon" },
    desc: { ro: "Finalizat în sub 30 minute", en: "Completed in under 30 minutes" },
    group: GROUPS.special,
  },
  FIRST_WEEK: {
    image: "/images/badges/prima-postare.avif",
    label: { ro: "Newbie", en: "Newbie" },
    desc: { ro: "Activ în prima săptămână", en: "Active in the first week" },
    group: GROUPS.activity,
  },
  MONTHLY_ACTIVE: {
    image: "/images/badges/prima-postare.avif",
    label: { ro: "Activ Lunar", en: "Monthly Active" },
    desc: { ro: "Activ luna aceasta", en: "Active this month" },
    group: GROUPS.activity,
  },
  VETERAN_1_YEAR: {
    image: "/images/badges/prima-postare.avif",
    label: { ro: "Veteran", en: "Veteran" },
    desc: { ro: "1 an de activitate", en: "1 year of activity" },
    group: GROUPS.activity,
  },
  CENTURION: {
    image: "/images/badges/prima-postare.avif",
    label: { ro: "Centurion", en: "Centurion" },
    desc: { ro: "100 tranzacții finalizate", en: "100 completed transactions" },
    group: GROUPS.special,
  },
  PERFECT_RATING: {
    image: "/images/badges/prima-postare.avif",
    label: { ro: "Rating Perfect", en: "Perfect Rating" },
    desc: { ro: "Media 5/5 după 10 tranzacții", en: "5/5 average after 10 transactions" },
    group: GROUPS.special,
  },
};

export const BADGE_COLORS: Record<string, string> = {
  FIRST_POST: "#2563EB",
  POST_VETERAN_10: "#2563EB",
  POST_VETERAN_50: "#1D4ED8",
  POST_VETERAN_100: "#1E3A8A",
  FIRST_COLLECTION: "#EA580C",
  COLLECTOR_STARTER_10: "#EA580C",
  COLLECTOR_PRO_50: "#C2410C",
  COLLECTOR_ELITE_100: "#9A3412",
  ECO_STARTER: "#16A34A",
  ECO_WARRIOR: "#15803D",
  ECO_CHAMPION: "#166534",
  ECO_LEGEND: "#14532D",
  SPEED_DEMON: "#9333EA",
  FIRST_WEEK: "#0D9488",
  MONTHLY_ACTIVE: "#0891B2",
  VETERAN_1_YEAR: "#0369A1",
  CENTURION: "#1E293B",
  PERFECT_RATING: "#D97706",
};
