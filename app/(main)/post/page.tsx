import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PostCreationClient from "./PostCreationPage";

export const metadata: Metadata = {
  title: "Postează sticle | Recash",
  description: "Postează sticlele tale pentru a câștiga bani prin reciclare.",
};

export default async function PostPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/?auth=1");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { phone: true },
  });

  return <PostCreationClient userPhone={user?.phone ?? null} />;
}
