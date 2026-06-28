import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Politica de Confidențialitate | Recash",
  description: "Politica de confidențialitate a platformei Recash.",
};

export default function ConfidentialitiatePage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 flex flex-col items-center justify-center">
      <div className="w-full bg-slate-50 rounded-3xl p-8 sm:p-10 flex flex-col items-center text-center">
        <Image
          src="/images/bottle-writing.svg"
          alt="În lucru"
          width={160}
          height={160}
          priority
          draggable={false}
          className="mb-2"
        />

        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
          Politica de Confidențialitate
        </h1>

        <p className="text-sm text-slate-500 leading-relaxed mb-8 max-w-xs">
          Momentan lucrăm la redactarea politicii de confidențialitate a
          platformei Recash.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-[#123424] text-white font-bold py-3 px-6 rounded-full hover:bg-[#1a4d36] transition-all shadow-[3px_3px_0px_#75a08c] active:translate-y-[3px] active:shadow-none"
        >
          <ArrowLeft className="w-4 h-4" />
          Înapoi la pagina principală
        </Link>
      </div>
    </div>
  );
}
