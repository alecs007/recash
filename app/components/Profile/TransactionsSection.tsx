import Image from "next/image";
import { MapPin } from "lucide-react";
import { Transaction } from "@/types";
import { SectionHeader } from "./SectionHeader";

export function TransactionsSection({
  transactions,
  totalTransactions,
  userId,
}: {
  transactions: Transaction[];
  totalTransactions: number;
  userId: string;
}) {
  if (transactions.length === 0) return null;
  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mb-8">
      <SectionHeader
        title="Tranzacții recente"
        href="/profil/tranzactii"
        hrefLabel={
          totalTransactions > 3
            ? `Vezi istoric (${totalTransactions})`
            : "Vezi istoric"
        }
      />
      <div className="space-y-3">
        {transactions.map((t) => {
          const isPoster = t.posterId === userId;
          const other = isPoster ? t.collector : t.poster;
          const earning = isPoster ? t.posterEarning : t.collectorEarning;
          const myRating = isPoster ? t.collectorRating : t.posterRating;
          return (
            <div
              key={t.id}
              className="bg-white rounded-2xl border border-slate-100 p-4 hover:border-lime-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-lime-50 border border-lime-200 flex items-center justify-center overflow-hidden shrink-0">
                    {other?.image ? (
                      <Image
                        src={other.image}
                        alt={other.name ?? ""}
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold text-lime-700">
                        {other?.name?.[0] ?? "?"}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-900">
                      {other?.name ?? "Utilizator necunoscut"}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {t.post.locationName ?? "Locație necunoscută"}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {new Date(t.completedAt).toLocaleDateString("ro-RO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-black text-lime-600">
                    +{earning.toFixed(2)} RON
                  </div>
                  <div className="text-xs text-slate-500">
                    {t.bottleCount} sticle · {t.actualValue.toFixed(2)} RON
                    total
                  </div>
                  {myRating && (
                    <div className="flex items-center justify-end gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <svg key={i} className="w-3 h-3" viewBox="0 0 20 20">
                          <path
                            fill={i <= myRating ? "#a3e635" : "#e2e8f0"}
                            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                          />
                        </svg>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 italic truncate mt-2 px-1">
                &quot;{t.post.description}&quot;
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
