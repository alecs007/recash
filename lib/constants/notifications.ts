import {
  FaWineBottle,
  FaRecycle,
  FaStar,
  FaTruck,
  FaBan,
  FaClock,
  FaBell,
  FaShieldAlt,
} from "react-icons/fa";
import { NotificationType } from "@/types";

type NotifConfig = {
  Icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
};

export const NOTIF_CONFIG: Record<NotificationType, NotifConfig> = {
  POST_CLAIMED: {
    Icon: FaTruck,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  POST_COMPLETED: {
    Icon: FaRecycle,
    color: "text-lime-700",
    bg: "bg-lime-50",
    border: "border-lime-200",
  },
  POST_CANCELLED: {
    Icon: FaBan,
    color: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  POST_EXPIRED: {
    Icon: FaClock,
    color: "text-slate-500",
    bg: "bg-slate-50",
    border: "border-slate-200",
  },
  COLLECTOR_ARRIVED: {
    Icon: FaWineBottle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  BADGE_EARNED: {
    Icon: FaShieldAlt,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  RATING_RECEIVED: {
    Icon: FaStar,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
  },
  SYSTEM: {
    Icon: FaBell,
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
  },
};
