import { HiBadgeCheck } from "react-icons/hi";

export function VerifiedBadge({
  className = "w-4 h-4",
}: {
  className?: string;
}) {
  return <HiBadgeCheck className={className} style={{ color: "#1D9BF0" }} />;
}
