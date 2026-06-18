export type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  phone: string | null;
  certified: boolean;
  createdAt: Date;
  totalBottlesGiven: number;
  totalBottlesCollected: number;
  totalTransactions: number;
  totalEarned: number;
  totalSaved: number;
  reputationScore: number;
  ratingCount: number;
  cancelledCount: number;
  _count: { posts: number; claimedPosts: number; badges: number };
};

export type ProfileReview = {
  id: string;
  rating: number;
  review: string | null;
  reviewer: {
    id: string | undefined;
    name: string | null | undefined;
    image: string | null | undefined;
    certified: boolean | undefined;
  };
  role: "poster" | "collector";
  bottleCount: number;
  locationName: string | null;
  completedAt: string;
};

export type ProfileSummary = {
  user: UserProfile;
  posts: Post[];
  totalPosts: number;
  transactions: Transaction[];
  totalTransactions: number;
  badges: Badge[];
  hasUnseenBadges: boolean;
  reviews: ProfileReview[];
};

export interface DaySchedule {
  day: number;
  start: string;
  end: string;
}

export type PostStatus =
  | "OPEN"
  | "CLAIMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export interface Post {
  id: string;
  status: PostStatus;
  description: string;
  bottleCount: number;
  estimatedValue: number;
  collectorSharePercent: number;
  latitude: number;
  longitude: number;
  locationName: string | null;
  address: string | null;
  images: string[];
  createdAt: string;
  expiresAt: string | null;
  availabilitySchedule: DaySchedule[] | null;
  claimedAt: string | null;
  completedAt: string | null;
  isAuthor?: boolean;
  isCollector?: boolean;
  author: {
    id: string;
    name: string | null;
    image: string | null;
    certified: boolean;
    reputationScore: number;
    ratingCount: number;
    phone: string | null;
  };
  collector: {
    id: string;
    name: string | null;
    image: string | null;
    certified: boolean;
    reputationScore: number;
    ratingCount: number;
    phone: string | null;
  } | null;
  transaction: {
    id: string;
    actualValue: number;
    collectorEarning: number;
    posterEarning: number;
    collectorRating: number | null;
    posterRating: number | null;
    collectorReview: string | null;
    posterReview: string | null;
    completedAt: string;
    posterRatedAt: string | null;
    collectorRatedAt: string | null;
  } | null;
}

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
  poster: {
    id: string;
    name: string | null;
    image: string | null;
    certified: boolean | undefined;
  };
  collector: {
    id: string;
    name: string | null;
    image: string | null;
    certified: boolean | undefined;
  };
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
  | "RADAR_ALERT"
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
