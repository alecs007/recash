import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Plus } from "lucide-react";
import { Post } from "@/types";
import { PostCard } from "../UI/PostCard";

export function PostsSection({
  posts,
  totalPosts,
}: {
  posts: Post[];
  totalPosts: number;
}) {
  const hasMore = totalPosts > 3;
  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
          Postările mele
        </h2>
        <div className="flex items-center gap-2">
          {hasMore && (
            <Link
              href="/profil/postari"
              className="flex items-center gap-1 text-sm font-semibold text-lime-700 hover:text-lime-800 transition-colors"
            >
              Toate ({totalPosts})<ChevronRight className="w-4 h-4" />
            </Link>
          )}
          <Link
            href="/post"
            className="flex items-center gap-1.5 text-sm font-semibold bg-[#123424] text-white px-3 py-1.5 rounded-xl hover:bg-[#1a4d36] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Adaugă
          </Link>
        </div>
      </div>
      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
          <Image
            src="/images/bottle-sad.svg"
            alt="Nicio postare"
            width={64}
            height={64}
            className="mx-auto h-24 w-24"
          />
          <p className="text-sm text-slate-900 mb-4">
            Încă nu ai creat nicio postare.
          </p>
          <Link
            href="/post"
            className="inline-flex items-center gap-2 bg-[#123424] text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-[#1a4d36] transition-colors"
          >
            <Plus className="w-4 h-4" /> Postează acum
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          {!hasMore && (
            <Link
              href="/profil/postari"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-slate-100 bg-white text-sm font-semibold text-slate-500 hover:border-lime-200 hover:text-lime-700 transition-all"
            >
              Toate postările <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
