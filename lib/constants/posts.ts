import {
  CheckCircle,
  Ban,
  Clock,
  AlarmClock,
  Loader2,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const MAX_PENDING_REQUESTS_PER_COLLECTOR = 5;

export const POST_STATUS_CONFIG: Record<
  string,
  { label: { ro: string; en: string }; color: string; Icon: LucideIcon }
> = {
  OPEN: {
    label: { ro: "Activ", en: "Active" },
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    Icon: AlarmClock,
  },
  CLAIMED: {
    label: { ro: "Revendicat", en: "Claimed" },
    color: "text-blue-600 bg-blue-50 border-blue-200",
    Icon: Clock,
  },
  IN_PROGRESS: {
    label: { ro: "În desfășurare", en: "In progress" },
    color: "text-amber-600 bg-amber-50 border-amber-200",
    Icon: Loader2,
  },
  COMPLETED: {
    label: { ro: "Finalizat", en: "Completed" },
    color: "text-lime-700 bg-lime-50 border-lime-200",
    Icon: CheckCircle,
  },
  CANCELLED: {
    label: { ro: "Anulat", en: "Cancelled" },
    color: "text-red-500 bg-red-50 border-red-200",
    Icon: XCircle,
  },
  EXPIRED: {
    label: { ro: "Expirat", en: "Expired" },
    color: "text-slate-500 bg-slate-50 border-slate-200",
    Icon: Ban,
  },
};
