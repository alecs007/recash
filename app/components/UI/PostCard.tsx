import { MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Post } from "@/types";
import { POST_STATUS_CONFIG } from "@/lib/constants/posts";

function MiniStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className="w-2.5 h-2.5" viewBox="0 0 20 20">
          <path
            fill={i <= rating ? "#FFDF00" : "#e2e8f0"}
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      ))}
    </div>
  );
}

export function PostCard({ post }: { post: Post }) {
  const cfg = POST_STATUS_CONFIG[post.status] ?? POST_STATUS_CONFIG.OPEN;
  const Icon = cfg.Icon;
  const ratingReceived = post.transaction?.collectorRating ?? null;
  const ratingGiven = post.transaction?.posterRating ?? null;

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
              {cfg.label}
            </span>
            <span className="text-xs text-slate-400">
              {new Date(post.createdAt).toLocaleDateString("ro-RO")}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate">
            {post.description}
          </p>
          {post.locationName && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-500">
                {post.locationName}
              </span>
            </div>
          )}

          {post.status === "COMPLETED" && (ratingReceived || ratingGiven) && (
            <div className="flex items-center flex-wrap gap-1 sm:gap-2 mt-2">
              {ratingReceived && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-slate-400 font-medium">
                    Rating-ul primit
                  </span>
                  <MiniStars rating={ratingReceived} />
                </div>
              )}
              {ratingGiven && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-slate-400 font-medium">
                    Rating-ul tău
                  </span>
                  <MiniStars rating={ratingGiven} />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-black text-slate-900">
            {post.bottleCount}
          </div>
          <div className="text-xs text-slate-400">sticle</div>
          {post.transaction ? (
            <div className="text-sm font-bold text-lime-600 mt-1">
              +{post.transaction.posterEarning.toFixed(2)} RON
            </div>
          ) : (
            <div className="text-sm text-slate-400 mt-1">
              ~{post.estimatedValue.toFixed(0)} RON
            </div>
          )}
        </div>
      </Link>
      {post.collector && (
        <div className="border-t border-slate-50 flex items-center gap-2 py-3 px-4">
          <div className="w-6 h-6 rounded-full bg-lime-100 flex items-center justify-center overflow-hidden border border-lime-200">
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
          <span className="text-xs text-slate-500">
            Colectat de{" "}
            <span className="font-semibold text-slate-700">
              {post.collector.name}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
