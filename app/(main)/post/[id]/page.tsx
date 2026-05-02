import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ActivePostClient from "./ActivePostPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    select: { description: true, bottleCount: true },
  });
  return {
    title: post
      ? `${post.bottleCount} sticle — ${post.description.slice(0, 40)} | Recash`
      : "Anunț | Recash",
  };
}

export default async function ActivePostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/?auth=1`);

  return <ActivePostClient postId={id} userId={session.user.id} />;
}
