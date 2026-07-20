"use client";

import { MapPin } from "lucide-react";
import { FaWineBottle } from "react-icons/fa";
import Image from "next/image";
import Link from "next/link";
import { Post } from "@/types";
import { POST_STATUS_CONFIG } from "@/lib/constants/posts";
import { useI18n } from "@/context/I18nContext";

export function PostCard({ post }: { post: Post }) {
  const { t, fmt, locale } = useI18n();
  const cfg = POST_STATUS_CONFIG[post.status] ?? POST_STATUS_CONFIG.OPEN;
  const Icon = cfg.Icon;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 hover:border-lime-200 hover:shadow-sm transition-all">
      <Link
        href={`/post/${post.id}`}
        className="flex items-start justify-between gap-3 p-4"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}
            >
              <Icon className="w-3 h-3" />
              {t(cfg.label)}
            </span>
            <span className="text-xs text-slate-400">
              {new Date(post.createdAt).toLocaleDateString(
                locale === "ro" ? "ro-RO" : "en-GB",
              )}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate">
            {post.description}
          </p>
          {post.locationName && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-500 truncate">
                {post.locationName}
              </span>
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-black text-slate-900 flex items-center justify-end gap-1">
            {post.bottleCount}
            <FaWineBottle className="w-4 h-4 text-[#7EC3E5]" />
          </div>
          {post.transaction ? (
            <div className="text-sm font-bold text-lime-600 mt-1">
              {fmt(post.transaction.posterEarning, { sign: true })}
            </div>
          ) : (
            <div className="text-sm text-slate-400 mt-1">
              {fmt(post.estimatedValue)}
            </div>
          )}
        </div>
      </Link>
      {post.collector && (
        <div className="border-t border-slate-50 flex items-center gap-2 py-3 px-4 min-w-0">
          <div className="w-6 h-6 rounded-full bg-lime-100 flex items-center justify-center overflow-hidden border border-lime-200 shrink-0">
            {post.collector.image ? (
              <Image
                src={post.collector.image}
                alt={post.collector.name ?? ""}
                width={24}
                height={24}
                className="object-cover"
              />
            ) : (
              <span className="text-[10px] font-bold text-lime-700">
                {post.collector.name?.[0]}
              </span>
            )}
          </div>

          <span className="text-xs text-slate-500 truncate">
            {post.status === "CLAIMED"
              ? t({ ro: "Revendicat de ", en: "Claimed by " })
              : t({ ro: "Colectat de ", en: "Collected by " })}
            <span className="font-semibold text-slate-700">
              {post.collector.name}
            </span>
          </span>
        </div>
      )}

      {/* CLAIMED has no bound collector yet — show the pending requesters. */}
      {!post.collector &&
        post.status === "CLAIMED" &&
        (post.pendingRequestCount ?? post.claimRequests?.length ?? 0) > 0 && (
          <div className="border-t border-slate-50 flex items-center gap-2 py-3 px-4 min-w-0">
            <div className="flex -space-x-2 shrink-0">
              {(post.claimRequests ?? []).slice(0, 3).map(({ collector }) => (
                <div
                  key={collector.id}
                  className="w-6 h-6 rounded-full bg-lime-100 flex items-center justify-center overflow-hidden border border-white ring-1 ring-lime-200"
                >
                  {collector.image ? (
                    <Image
                      src={collector.image}
                      alt={collector.name ?? ""}
                      width={24}
                      height={24}
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-[10px] font-bold text-lime-700">
                      {collector.name?.[0] ?? "?"}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <span className="text-xs text-slate-500 truncate">
              {(() => {
                const count =
                  post.pendingRequestCount ?? post.claimRequests?.length ?? 0;
                return count === 1
                  ? t({
                      ro: "1 cerere de colectare în așteptare",
                      en: "1 pending collect request",
                    })
                  : t({
                      ro: `${count} cereri de colectare în așteptare`,
                      en: `${count} pending collect requests`,
                    });
              })()}
            </span>
          </div>
        )}
    </div>
  );
}
