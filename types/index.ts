export type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  phone: string | null;
  createdAt: Date;
  totalBottlesGiven: number;
  totalBottlesCollected: number;
  totalTransactions: number;
  totalEarned: number;
  totalSaved: number;
  reputationScore: number;
  ratingCount: number;
  _count: { posts: number; claimedPosts: number; badges: number };
};

export type ProfileSummary = {
  user: UserProfile;
  posts: Post[];
  totalPosts: number;
  transactions: Transaction[];
  totalTransactions: number;
  badges: Badge[];
  hasUnseenBadges: boolean;
};

export type Post = {
  id: string;
  status: string;
  description: string;
  bottleCount: number;
  estimatedValue: number;
  collectorSharePercent: number;
  locationName: string | null;
  createdAt: Date;
  collector?: { id: string; name: string | null; image: string | null } | null;
  transaction?: { actualValue: number; posterEarning: number } | null;
};

export type Transaction = {
  id: string;
  bottleCount: number;
  actualValue: number;
  collectorEarning: number;
  posterEarning: number;
  collectorRating: number | null;
  posterRating: number | null;
  completedAt: string;
  posterId: string;
  post: { id: string; description: string; locationName: string | null };
  poster: { id: string; name: string | null; image: string | null };
  collector: { id: string; name: string | null; image: string | null };
};

export type Badge = {
  id: string;
  type: string;
  earnedAt: string;
  seen: boolean;
};

export type NotificationType =
  | "POST_CLAIMED"
  | "POST_COMPLETED"
  | "POST_CANCELLED"
  | "POST_EXPIRED"
  | "COLLECTOR_ARRIVED"
  | "BADGE_EARNED"
  | "RATING_RECEIVED"
  | "SYSTEM";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: Date;
};
