import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NotificationsPage from "./NotificationsPage";

export const metadata: Metadata = {
  title: "Notificări | Recash",
  description: "Notificările tale de pe Recash.",
};

export default async function NotificariRoute() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  return <NotificationsPage />;
}
