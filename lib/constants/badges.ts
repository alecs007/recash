export type BadgeCfg = {
  image: string;
  label: { ro: string; en: string };
  desc: { ro: string; en: string };
  /** How the badge is unlocked, shown in the badge modal. */
  howTo: { ro: string; en: string };
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
    image: "/images/badges/prima-postare.webp",
    label: { ro: "Prima Postare", en: "First Post" },
    desc: {
      ro: "Primele sticle intră în joc",
      en: "First bottles in play",
    },
    howTo: {
      ro: "O postare publicată",
      en: "One post published",
    },
    group: GROUPS.posts,
  },
  POST_VETERAN_10: {
    image: "/images/badges/10-postari.webp",
    label: { ro: "10 Postări", en: "10 Posts" },
    desc: {
      ro: "Zece anunțuri, zero risipă",
      en: "Ten posts, zero waste",
    },
    howTo: {
      ro: "10 postări publicate",
      en: "10 posts published",
    },
    group: GROUPS.posts,
  },
  POST_VETERAN_50: {
    image: "/images/badges/50-postari.webp",
    label: { ro: "50 Postări", en: "50 Posts" },
    desc: {
      ro: "Reciclare pe bandă rulantă",
      en: "Recycling on a roll",
    },
    howTo: {
      ro: "50 de postări publicate",
      en: "50 posts published",
    },
    group: GROUPS.posts,
  },
  POST_VETERAN_100: {
    image: "/images/badges/100-postari.webp",
    label: { ro: "100 Postări", en: "100 Posts" },
    desc: {
      ro: "O fabrică de reciclare",
      en: "A recycling machine",
    },
    howTo: {
      ro: "100 de postări publicate",
      en: "100 posts published",
    },
    group: GROUPS.posts,
  },
  FIRST_COLLECTION: {
    image: "/images/badges/prima-colectare.webp",
    label: { ro: "Prima Colectare", en: "First Collection" },
    desc: {
      ro: "Reciclarea a început",
      en: "Recycling begins",
    },
    howTo: {
      ro: "O colectare finalizată",
      en: "One collection completed",
    },
    group: GROUPS.collections,
  },
  COLLECTOR_STARTER_10: {
    image: "/images/badges/10-colectari.webp",
    label: { ro: "10 Colectări", en: "10 Collections" },
    desc: {
      ro: "Sticle strânse, bani câștigați",
      en: "Bottles in, cash out",
    },
    howTo: {
      ro: "10 colectări finalizate",
      en: "10 collections completed",
    },
    group: GROUPS.collections,
  },
  COLLECTOR_PRO_50: {
    image: "/images/badges/50-colectari.webp",
    label: { ro: "50 Colectări", en: "50 Collections" },
    desc: {
      ro: "Vânător de sticle goale",
      en: "Empty-bottle hunter",
    },
    howTo: {
      ro: "50 de colectări finalizate",
      en: "50 collections completed",
    },
    group: GROUPS.collections,
  },
  COLLECTOR_ELITE_100: {
    image: "/images/badges/100-colectari.webp",
    label: { ro: "100 Colectări", en: "100 Collections" },
    desc: {
      ro: "Colector de neoprit",
      en: "Unstoppable collector",
    },
    howTo: {
      ro: "100 de colectări finalizate",
      en: "100 collections completed",
    },
    group: GROUPS.collections,
  },
  ECO_STARTER: {
    image: "/images/badges/eco-starter.webp",
    label: { ro: "Eco Starter", en: "Eco Starter" },
    desc: {
      ro: "Primele sticle reciclate",
      en: "First bottles recycled",
    },
    howTo: {
      ro: "50 de sticle reciclate",
      en: "50 bottles recycled",
    },
    group: GROUPS.eco,
  },
  ECO_WARRIOR: {
    image: "/images/badges/eco-warrior.webp",
    label: { ro: "Eco Warrior", en: "Eco Warrior" },
    desc: {
      ro: "Mai puțin plastic, mai mult verde",
      en: "Less plastic, more green",
    },
    howTo: {
      ro: "250 de sticle reciclate",
      en: "250 bottles recycled",
    },
    group: GROUPS.eco,
  },
  ECO_CHAMPION: {
    image: "/images/badges/eco-champion.webp",
    label: { ro: "Eco Champion", en: "Eco Champion" },
    desc: {
      ro: "O mie de sticle reciclate",
      en: "A thousand bottles recycled",
    },
    howTo: {
      ro: "1.000 de sticle reciclate",
      en: "1,000 bottles recycled",
    },
    group: GROUPS.eco,
  },
  ECO_LEGEND: {
    image: "/images/badges/eco-legend.webp",
    label: { ro: "Eco Legend", en: "Eco Legend" },
    desc: {
      ro: "Munți de sticle reciclate",
      en: "Mountains of bottles recycled",
    },
    howTo: {
      ro: "5.000 de sticle reciclate",
      en: "5,000 bottles recycled",
    },
    group: GROUPS.eco,
  },
  SPEED_DEMON: {
    image: "/images/badges/speed.webp",
    label: { ro: "Speed Demon", en: "Speed Demon" },
    desc: {
      ro: "Colectare fulger",
      en: "Lightning pickup",
    },
    howTo: {
      ro: "O colectare finalizată în sub 30 de minute de la preluare",
      en: "A collection completed within 30 minutes of claiming it",
    },
    group: GROUPS.special,
  },
  FIRST_WEEK: {
    image: "/images/badges/newbie.webp",
    label: { ro: "Newbie", en: "Newbie" },
    desc: {
      ro: "Primii pași verzi",
      en: "First green steps",
    },
    howTo: {
      ro: "Activ în prima săptămână de la înregistrare",
      en: "Active within the first week of signing up",
    },
    group: GROUPS.activity,
  },
  MONTHLY_ACTIVE: {
    image: "/images/badges/monthly-active.webp",
    label: { ro: "Activ Lunar", en: "Monthly Active" },
    desc: {
      ro: "Lună de lună, tot mai verde",
      en: "Month after month, ever greener",
    },
    howTo: {
      ro: "Activitate în fiecare lună",
      en: "Active every month",
    },
    group: GROUPS.activity,
  },
  VETERAN_1_YEAR: {
    image: "/images/badges/veteran.webp",
    label: { ro: "Veteran", en: "Veteran" },
    desc: {
      ro: "Un an de reciclare",
      en: "A year of recycling",
    },
    howTo: {
      ro: "Un an de la înregistrare",
      en: "One year since signing up",
    },
    group: GROUPS.activity,
  },
  CENTURION: {
    image: "/images/badges/centurion.webp",
    label: { ro: "Centurion", en: "Centurion" },
    desc: {
      ro: "O sută de misiuni verzi",
      en: "A hundred green missions",
    },
    howTo: {
      ro: "100 de tranzacții finalizate",
      en: "100 transactions completed",
    },
    group: GROUPS.special,
  },
  PERFECT_RATING: {
    image: "/images/badges/perfect-rating.webp",
    label: { ro: "Rating Perfect", en: "Perfect Rating" },
    desc: {
      ro: "Reciclare impecabilă",
      en: "Flawless recycling",
    },
    howTo: {
      ro: "Medie 5.0 din minim 10 evaluări",
      en: "5.0 average from at least 10 ratings",
    },
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
  FIRST_WEEK: "#22a7c9",
  MONTHLY_ACTIVE: "#0891B2",
  VETERAN_1_YEAR: "#0369A1",
  CENTURION: "#1E293B",
  PERFECT_RATING: "#D97706",
};
