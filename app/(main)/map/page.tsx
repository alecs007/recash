import { Metadata } from "next";
import MapClient from "./MapClient";

export const metadata: Metadata = {
  title: "Hartă colectare | Recash",
  description: "Găsește sticle de colectat în zona ta.",
};

export default async function MapPage() {
  return <MapClient />;
}
