import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PostDetailClient from "./PostDetailPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    select: { description: true, bottleCount: true, locationName: true },
  });
  return {
    title: post
      ? `${post.bottleCount} sticle${post.locationName ? ` — ${post.locationName}` : ""} | Recash`
      : "Anunț | Recash",
    description: post?.description ?? "Detalii anunț Recash",
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/?auth=1`);

  return <PostDetailClient postId={id} userId={session.user.id} />;
}
