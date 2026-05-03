import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const POST_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; Icon: LucideIcon }
> = {
  OPEN: {
    label: "Activ",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    Icon: AlertCircle,
  },
  CLAIMED: {
    label: "Revendicat",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    Icon: Clock,
  },
  IN_PROGRESS: {
    label: "În desfășurare",
    color: "text-amber-600 bg-amber-50 border-amber-200",
    Icon: Loader2,
  },
  COMPLETED: {
    label: "Finalizat",
    color: "text-lime-700 bg-lime-50 border-lime-200",
    Icon: CheckCircle,
  },
  CANCELLED: {
    label: "Anulat",
    color: "text-red-500 bg-red-50 border-red-200",
    Icon: XCircle,
  },
  EXPIRED: {
    label: "Expirat",
    color: "text-slate-500 bg-slate-50 border-slate-200",
    Icon: Clock,
  },
};
