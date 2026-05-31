import Image from "next/image";
import { User, Trophy, Calendar } from "lucide-react";
import { FaWineBottle } from "react-icons/fa";
import { ProfileSummary } from "@/types";
import { StarRating } from "@/app/components/Profile/StarRating";
import { StatsGrid } from "@/app/components/Profile/StatsGrid";
import { PostsSection } from "@/app/components/Profile/PostsSection";
import { TransactionsSection } from "@/app/components/Profile/TransactionsSection";
import { BadgesSection } from "@/app/components/Profile/BadgesSection";
import { ReviewsSection } from "@/app/components/Profile/ReviewsSection";

export function ProfilePage({ summary }: { summary: ProfileSummary }) {
  const {
    user,
    posts,
    totalPosts,
    transactions,
    totalTransactions,
    badges,
    reviews,
  } = summary;

  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const memberSince = new Date(user.createdAt).toLocaleDateString("ro-RO", {
    month: "long",
    year: "numeric",
  });
  const totalBottles = user.totalBottlesGiven + user.totalBottlesCollected;

  return (
    <div className="w-full min-h-[100dvh] pb-12">
      <div className="bg-gradient-to-br from-[#123424] to-[#1a4d36] rounded-[2rem] mx-4 sm:mx-6 lg:mx-8 mt-4 mb-6 px-6 sm:px-10 py-6 sm:py-8 relative overflow-hidden shadow">
        <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-lime-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-row items-center gap-4 sm:gap-6">
          <div className="relative shrink-0">
            {user.image ? (
              <div className="relative w-18 h-18 sm:w-28 sm:h-28 shrink-0">
                <div className="absolute inset-0 rounded-full bg-slate-200" />
                <Image
                  src={user.image}
                  alt="Profile"
                  fill
                  sizes={"(min-width: 640px) 7rem, 4.5rem"}
                  priority
                  className="rounded-full object-cover border-3 border-lime-400/70 shadow-lg z-10"
                />
              </div>
            ) : (
              <div className="w-18 h-18 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center text-black font-black text-xl sm:text-3xl border-3 border-lime-400/60 shadow-lg">
                {initials ?? <User className="w-7 h-7 sm:w-10 sm:h-10" />}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-3xl font-extrabold text-white tracking-tight truncate mb-0.5">
              {user.name ?? "Utilizator"}
            </h1>
            <p className="text-white/60 text-xs sm:text-sm mb-2 sm:mb-3 truncate">
              {user.email}
            </p>
            <StarRating
              score={user.reputationScore}
              count={user.ratingCount}
              cancelledCount={user.cancelledCount}
            />
            <div className="hidden sm:flex flex-wrap gap-4 mt-4">
              <div className="flex items-center text-white/70 text-sm">
                <Trophy className="w-4 h-4 text-lime-400 mr-1.5" />
                <span className="font-bold text-white mr-1">
                  {user._count.badges}
                </span>{" "}
                {user._count.badges === 1 ? "badge" : "badge-uri"}
              </div>
              <div className="flex items-center text-white/70 text-sm">
                <Calendar className="w-4 h-4 text-lime-400 mr-1.5" />
                <span className="mr-1">Membru din</span>
                <span className="font-bold text-white">{memberSince}</span>
              </div>
              <div className="flex items-center text-white/70 text-sm">
                <FaWineBottle className="w-4 h-4 text-lime-400 mr-1.5" />
                <span className="font-bold text-white mr-1">
                  {totalBottles}
                </span>{" "}
                sticle reciclate
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex sm:hidden flex-wrap gap-3 mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center text-white/70 text-xs">
            <Trophy className="w-3.5 h-3.5 text-lime-400 mr-1.5" />
            <span className="font-bold text-white mr-1">
              {user._count.badges}
            </span>{" "}
            {user._count.badges === 1 ? "badge" : "badge-uri"}
          </div>
          <div className="flex items-center text-white/70 text-xs">
            <Calendar className="w-4 h-4 text-lime-400 mr-1.5" />
            <span className="mr-1">Membru din</span>
            <span className="font-bold text-white">{memberSince}</span>
          </div>
        </div>
      </div>

      <StatsGrid user={user} />
      <ReviewsSection reviews={reviews} userId={user.id} />
      <PostsSection posts={posts} totalPosts={totalPosts} />
      <BadgesSection badges={badges} />
      <TransactionsSection
        transactions={transactions}
        totalTransactions={totalTransactions}
        userId={user.id}
      />
    </div>
  );
}
