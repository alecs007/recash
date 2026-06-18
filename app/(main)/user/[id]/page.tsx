import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import UserPublicPage from "./UserPublicPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      name: true,
      certified: true,
      reputationScore: true,
      totalBottlesGiven: true,
      totalBottlesCollected: true,
    },
  });

  if (!user) {
    return {
      title: "Profil utilizator | Recash",
      description: "Profil public Recash",
    };
  }

  const totalBottles = user.totalBottlesGiven + user.totalBottlesCollected;

  return {
    title: `${user.name ?? "Utilizator"} | Recash`,
    description: `Profilul public al utilizatorului ${user.name ?? "utilizator"} pe Recash. Rating: ${user.reputationScore.toFixed(1)}/5 • ${totalBottles} sticle reciclate.`,
  };
}

export default async function UserPublicRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (session?.user?.id === id) {
    redirect("/profil");
  }

  return <UserPublicPage userId={id} />;
}
