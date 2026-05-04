import { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Hartă colectare | Recash",
  description: "Găsește postări de sticle din zona ta.",
};

const MapClient = dynamic(() => import("./MapClient"), {
  loading: () => (
    <div
      className="flex items-center justify-center bg-slate-50"
      style={{ height: "calc(100vh - 64px)" }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-lime-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Se încarcă harta…</p>
      </div>
    </div>
  ),
});

export default async function MapPage() {
  return (
    <div className="relative">
      <MapClient />
    </div>
  );
}
