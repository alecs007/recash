"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Plus } from "lucide-react";
import { Post } from "@/types";
import { PostCard } from "../UI/PostCard";
import { useI18n } from "@/context/I18nContext";

export function PostsSection({
  posts,
  totalPosts,
}: {
  posts: Post[];
  totalPosts: number;
}) {
  const { t } = useI18n();
  const hasMore = totalPosts > 3;
  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mb-8 p-4 sm:p-6 bg-slate-50 border border-slate-100 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
          {t({ ro: "Postările mele", en: "My posts" })}
        </h2>
        <div className="flex items-center gap-2">
          {hasMore && (
            <Link
              href="/profil/postari"
              className="hidden sm:flex items-center gap-1 text-sm font-semibold text-lime-700 hover:text-lime-800 transition-colors"
            >
              {t({ ro: "Vezi toate", en: "See all" })} ({totalPosts})
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
          {posts.length > 0 && (
            <Link
              href="/post"
              className="flex items-center gap-1.5 text-sm font-semibold bg-[#123424] text-white px-3 py-1.5 rounded-xl hover:bg-[#1a4d36] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {t({ ro: "Adaugă", en: "Add" })}
            </Link>
          )}
        </div>
      </div>
      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
          <Image
            src="/images/bottle-sad.svg"
            alt={t({ ro: "Nicio postare", en: "No posts" })}
            width={64}
            height={64}
            className="mx-auto h-24 w-24"
          />
          <p className="text-sm text-slate-900 mb-4">
            {t({
              ro: "Încă nu ai creat nicio postare.",
              en: "You haven't created any posts yet.",
            })}
          </p>
          <Link
            href="/post"
            className="inline-flex items-center gap-2 bg-[#123424] text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-[#1a4d36] transition-colors"
          >
            <Plus className="w-4 h-4" />{" "}
            {t({ ro: "Postează acum", en: "Post now" })}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          {hasMore && (
            <Link
              href="/profil/postari"
              className="sm:hidden flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-slate-100 bg-white text-sm font-semibold text-slate-500 hover:border-lime-200 hover:text-lime-700 transition-all"
            >
              {t({ ro: "Vezi toate postările", en: "See all posts" })}{" "}
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
