import { HiBadgeCheck } from "react-icons/hi";

export function VerifiedBadge({
  className = "w-4 h-4",
}: {
  className?: string;
}) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div
        className="absolute bg-white rounded-full"
        style={{
          width: "50%",
          height: "50%",
          zIndex: 0,
        }}
      />

      <HiBadgeCheck
        className="w-full h-full relative"
        style={{ color: "#1D9BF0", zIndex: 1 }}
      />
    </div>
  );
}
