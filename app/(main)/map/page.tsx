import { Metadata } from "next";
import MapPage from "./MapPage";

export const metadata: Metadata = {
  title: "Hartă | Recash",
  description: "Găsește sticle de colectat în zona ta.",
};

export default function MapRoute() {
  return <MapPage />;
}
