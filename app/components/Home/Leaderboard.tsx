import Image from "next/image";
import Link from "next/link";
import { FaWineBottle, FaMedal, FaArrowRight } from "react-icons/fa";
import { GrTrophy } from "react-icons/gr";

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string | null;
  image: string | null;
  totalBottles: number;
}

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.NEXTAUTHa_URL
        ? `https://${process.env.NEXTAUTHa_URL}`
        : "http://localhost:3000");
    const res = await fetch(`${baseUrl}/api/v1/leaderboard?limit=10`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.entries ?? [];
  } catch {
    return [];
  }
}

const MEDAL_COLORS: Record<
  number,
  {
    bg: string;
    text: string;
    border: string;
    icon: string;
    rowBg: string;
    rowBorder: string;
  }
> = {
  1: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: "text-amber-500",
    rowBg: "bg-amber-50",
    rowBorder: "border-amber-200",
  },
  2: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
    icon: "text-slate-400",
    rowBg: "bg-slate-50",
    rowBorder: "border-slate-200",
  },
  3: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    icon: "text-orange-400",
    rowBg: "bg-orange-50",
    rowBorder: "border-orange-200",
  },
};

function RankBadge({ rank }: { rank: number }) {
  const m = MEDAL_COLORS[rank];
  if (m) {
    return (
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${m.bg} ${m.border}`}
      >
        <FaMedal className={`w-4 h-4 ${m.icon}`} />
      </div>
    );
  }
  return (
    <div className="shrink-0 w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
      <span className="text-xs font-black text-slate-500">#{rank}</span>
    </div>
  );
}

export async function LeaderboardSection() {
  const entries = await getLeaderboard();

  return (
    <section>
      {" "}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-12 lg:mb-16" />
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start">
        {/* ── Left: heading + CTA + image ── */}
        <div className="lg:w-[420px] shrink-0 text-center lg:text-left flex flex-col items-center gap-8">
          <h2 className="font-sans font-extrabold text-slate-900 text-[2.9rem] lg:text-6xl mb-4 gap-0 leading-[1.05] tracking-tight">
            Cei mai activi{" "}
            <span className="text-lime-500 italic">reciclatori</span>
          </h2>

          {/* Image fills the remaining left-side space on desktop */}
          <div className="hidden lg:block relative w-full aspect-square max-w-[400px]">
            <Image
              src="/images/champion.jpg"
              alt="Leaderboard"
              fill
              sizes="340px"
              className="object-contain object-bottom"
              draggable={false}
            />
          </div>

          {/* Desktop CTA */}
          <Link
            href="/leaderboard"
            className="hidden lg:flex items-center justify-center gap-3 text-[#14532d] font-extrabold py-4 px-12 rounded-full text-lg hover:bg-lime-50 hover:-translate-y-0.5 transition-all border-2 border-lime-600/30 group"
            style={{
              background: "#fafaf5",
            }}
          >
            <GrTrophy className="w-5 h-5 text-lime-500 shrink-0" />
            Vezi clasamentul complet
            <FaArrowRight className="w-4 h-4 shrink-0 text-lime-500" />
          </Link>
        </div>

        {/* ── Right: leaderboard list ── */}
        <div className="flex-1 w-full min-w-0">
          {entries.length === 0 ? (
            <div className="text-slate-400 text-sm py-8 text-center">
              Niciun participant găsit.
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => {
                const m = MEDAL_COLORS[entry.rank];
                return (
                  <Link
                    key={entry.id}
                    href={`/user/${entry.id}`}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all hover:shadow-sm group ${
                      m
                        ? `${m.rowBg} ${m.rowBorder}`
                        : "bg-white border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <RankBadge rank={entry.rank} />

                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      {entry.image ? (
                        <Image
                          src={entry.image}
                          alt={entry.name ?? ""}
                          width={36}
                          height={36}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-500">
                          {entry.name?.[0] ?? "?"}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate group-hover:text-slate-700">
                        {entry.name ?? "Utilizator"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {entry.totalBottles.toLocaleString("ro-RO")} sticle
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <FaWineBottle className="w-3 h-3 text-lime-500" />
                      <span className="text-sm font-black tabular-nums text-slate-800">
                        {entry.totalBottles.toLocaleString("ro-RO")}
                      </span>
                    </div>
                  </Link>
                );
              })}

              {/* Mobile CTA — appears below the list, full width */}
              <Link
                href="/leaderboard"
                className="lg:hidden flex items-center justify-center gap-3 w-full text-[#14532d] font-extrabold py-4 px-6 rounded-2xl text-base hover:bg-lime-50 active:scale-[0.98] transition-all border border-lime-600/20 group"
                style={{
                  background: "#fafaf5",
                }}
              >
                <GrTrophy className="w-5 h-5 text-lime-500 shrink-0" />
                Vezi clasamentul complet
                <FaArrowRight className="w-4 h-4 text-lime-500 shrink-0" />
              </Link>
            </div>
          )}
        </div>
      </div>{" "}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mt-12 lg:mt-16" />
    </section>
  );
}
