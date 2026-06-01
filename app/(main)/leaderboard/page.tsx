import { Metadata } from "next";
import LeaderboardPage from "./LeaderboardPage";

export const metadata: Metadata = {
  title: "Clasament reciclatori | Recash",
  description: "Cei mai activi reciclatori din comunitatea Recash.",
};

export default function LeaderboardRoute() {
  return <LeaderboardPage />;
}
