export type BadgeCfg = {
  image: string;
  label: string;
  desc: string;
  group: string;
};

export const BADGE_CONFIG: Record<string, BadgeCfg> = {
  FIRST_POST: {
    image: "/images/badges/prima-postare.avif",
    label: "Prima Postare",
    desc: "Ai postat pentru prima dată",
    group: "Postări",
  },
  POST_VETERAN_10: {
    image: "/images/badges/10-postari.avif",
    label: "10 Postări",
    desc: "Ai publicat 10 anunțuri",
    group: "Postări",
  },
  POST_VETERAN_50: {
    image: "/images/badges/50-postari.avif",
    label: "50 Postări",
    desc: "Ai publicat 50 de anunțuri",
    group: "Postări",
  },
  POST_VETERAN_100: {
    image: "/images/badges/100-postari.avif",
    label: "100 Postări",
    desc: "Maestru al postărilor",
    group: "Postări",
  },
  FIRST_COLLECTION: {
    image: "/images/badges/prima-colectare.avif",
    label: "Prima Colectare",
    desc: "Ai colectat pentru prima dată",
    group: "Colectări",
  },
  COLLECTOR_STARTER_10: {
    image: "/images/badges/10-colectari.avif",
    label: "10 Colectări",
    desc: "10 colectări finalizate",
    group: "Colectări",
  },
  COLLECTOR_PRO_50: {
    image: "/images/badges/50-colectari.avif",
    label: "50 Colectări",
    desc: "Colector profesionist",
    group: "Colectări",
  },
  COLLECTOR_ELITE_100: {
    image: "/images/badges/100-colectari.avif",
    label: "100 Colectări",
    desc: "Colector de elită",
    group: "Colectări",
  },
  ECO_STARTER: {
    image: "/images/badges/50-sticle.avif",
    label: "Eco Starter",
    desc: "50 sticle reciclate total",
    group: "Eco",
  },
  ECO_WARRIOR: {
    image: "/images/badges/250-sticle.avif",
    label: "Eco Warrior",
    desc: "250 sticle reciclate total",
    group: "Eco",
  },
  ECO_CHAMPION: {
    image: "/images/badges/1000-sticle.avif",
    label: "Eco Champion",
    desc: "1.000 sticle reciclate",
    group: "Eco",
  },
  ECO_LEGEND: {
    image: "/images/badges/5000-sticle.avif",
    label: "Eco Legend",
    desc: "5.000 sticle reciclate",
    group: "Eco",
  },
  SPEED_DEMON: {
    image: "/images/badges/prima-postare.avif",
    label: "Speed Demon",
    desc: "Finalizat în sub 30 minute",
    group: "Speciale",
  },
  FIRST_WEEK: {
    image: "/images/badges/prima-postare.avif",
    label: "Prima Săptămână",
    desc: "Activ în prima săptămână",
    group: "Activitate",
  },
  MONTHLY_ACTIVE: {
    image: "/images/badges/prima-postare.avif",
    label: "Activ Lunar",
    desc: "Activ luna aceasta",
    group: "Activitate",
  },
  VETERAN_1_YEAR: {
    image: "/images/badges/prima-postare.avif",
    label: "Veteran 1 An",
    desc: "1 an de activitate",
    group: "Activitate",
  },
  CENTURION: {
    image: "/images/badges/prima-postare.avif",
    label: "Centurion",
    desc: "100 tranzacții finalizate",
    group: "Speciale",
  },
  PERFECT_RATING: {
    image: "/images/badges/prima-postare.avif",
    label: "Rating Perfect",
    desc: "Media 5/5 după 10 tranzacții",
    group: "Speciale",
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
