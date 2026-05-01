import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AllTransactionsPage from "./AllTransactionsPage";

export const metadata: Metadata = {
  title: "Tranzacțiile mele | Recash",
  description: "Istoricul complet al tranzacțiilor tale.",
};

export default async function TransactionsRoute() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  return <AllTransactionsPage userId={session.user.id} />;
}
