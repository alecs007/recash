import Image from "next/image";
import { UserProfile } from "@/types";

export function StatsGrid({ user }: { user: UserProfile }) {
  const totalBottles = user.totalBottlesGiven + user.totalBottlesCollected;
  const totalEarning = user.totalEarned + user.totalSaved;
  const stats = [
    {
      icon: "/images/icons/bottles-recycled.svg",
      label: "Sticle reciclate",
      value: totalBottles.toLocaleString("ro-RO"),
      unit: "buc",
    },
    {
      icon: "/images/icons/total-earnings.svg",
      label: "Încasări totale",
      value: totalEarning.toFixed(2),
      unit: "RON",
    },
    {
      icon: "/images/icons/plastic.svg",
      label: "Plastic recuperat",
      value: `${totalBottles > 0 ? "~" : ""}${(totalBottles * 0.033).toFixed(1)}`,
      unit: "kg",
    },
    {
      icon: "/images/icons/co2-footprint.svg",
      label: "Amprentă CO₂",
      value: `${totalBottles > 0 ? "~" : ""}${(totalBottles * 0.12).toFixed(1)}`,
      unit: "kg CO₂ redus",
    },
  ];
  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mb-6">
      <div className="bg-white rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-4">
          {stats.map(({ icon, label, value, unit }, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 border-b border-slate-100 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
            >
              <div className="flex items-center gap-3">
                <Image
                  src={icon}
                  alt={label}
                  width={24}
                  height={24}
                  priority
                  draggable={false}
                  className="w-8 h-8 shrink-0"
                />
                <span className="text-sm font-medium text-slate-600">
                  {label}
                </span>
              </div>
              <div className="flex items-baseline gap-1 md:flex-col md:items-start md:gap-0 lg:flex-row lg:items-baseline lg:gap-1">
                <span className="text-lg font-black text-slate-900">
                  {value}
                </span>
                <span className="text-[10px] font-bold text-slate-600">
                  {unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
