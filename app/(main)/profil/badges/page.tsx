import { Metadata } from "next";
import AllBadgesPage from "./AllBadgesPage";

export const metadata: Metadata = {
  title: "Badge-urile mele | Recash",
  description: "Toate badge-urile disponibile și cele câștigate.",
};

export default function BadgesRoute() {
  return <AllBadgesPage />;
}
