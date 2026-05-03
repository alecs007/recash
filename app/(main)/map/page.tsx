import { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import MapClient from "./MapClient";

export const metadata: Metadata = {
  title: "Hartă colectare | Recash",
  description: "Găsește sticle de colectat în zona ta.",
};

export default async function MapPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  let hasActiveCollection = false;
  let hasActivePost = false;

  if (userId) {
    // Check if user already has a CLAIMED or IN_PROGRESS post as collector
    const activeCollecting = await prisma.post.findFirst({
      where: {
        collectorId: userId,
        status: { in: ["CLAIMED", "IN_PROGRESS"] },
      },
      select: { id: true },
    });
    hasActiveCollection = !!activeCollecting;

    // Check if user already has an OPEN/CLAIMED/IN_PROGRESS post as poster
    const activePost = await prisma.post.findFirst({
      where: {
        authorId: userId,
        status: { in: ["OPEN", "CLAIMED", "IN_PROGRESS"] },
      },
      select: { id: true },
    });
    hasActivePost = !!activePost;
  }

  return (
    <MapClient
      userId={userId}
      hasActiveCollection={hasActiveCollection}
      hasActivePost={hasActivePost}
    />
  );
}
