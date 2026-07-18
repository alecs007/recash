import { Metadata } from "next";
import MapClient from "./MapClient";

export const metadata: Metadata = {
  title: "Harta sticlelor | Recash",
  description: "Găsește sticle gata de reciclat în zona ta.",
};

export default async function MapPage() {
  return (
    <div className="relative">
      <MapClient />
    </div>
  );
}
