import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfileClient } from "./ProfileClient";
import { cached, CacheKey, TTL } from "@/lib/cache";

export const metadata: Metadata = {
  title: "Profilul meu | Recash",
  description: "Vezi activitatea, câștigurile și reputația ta pe Recash.",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const user = await cached(
    CacheKey.profile(session.user.id),
    TTL.profile,
    () =>
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          bio: true,
          phone: true,
          createdAt: true,
          totalBottlesGiven: true,
          totalBottlesCollected: true,
          totalTransactions: true,
          totalEarned: true,
          totalSaved: true,
          reputationScore: true,
          ratingCount: true,
          _count: {
            select: {
              posts: true,
              claimedPosts: true,
              badges: true,
            },
          },
        },
      }),
  );

  if (!user) redirect("/");

  return <ProfileClient user={user} />;
}
