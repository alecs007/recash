"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/context/I18nContext";

export default function ConfidentialitiatePage() {
  const { t } = useI18n();
  return (
    <div className="max-w-lg mx-auto px-4 py-16 flex flex-col items-center justify-center">
      <div className="w-full bg-slate-50 rounded-3xl p-8 sm:p-10 flex flex-col items-center text-center">
        <Image
          src="/images/bottle-writing.svg"
          alt={t({ ro: "În lucru", en: "In progress" })}
          width={160}
          height={160}
          priority
          draggable={false}
          className="mb-2"
        />

        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
          {t({
            ro: "Politica de Confidențialitate",
            en: "Privacy Policy",
          })}
        </h1>

        <p className="text-sm text-slate-500 leading-relaxed mb-8 max-w-xs">
          {t({
            ro: "Momentan lucrăm la redactarea politicii de confidențialitate a platformei Recash.",
            en: "We're currently drafting the privacy policy of the Recash platform.",
          })}
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-[#123424] text-white font-bold py-3 px-6 rounded-full hover:bg-[#1a4d36] transition-all shadow-[3px_3px_0px_#75a08c] active:translate-y-[3px] active:shadow-none"
        >
          <ArrowLeft className="w-4 h-4" />
          {t({ ro: "Înapoi la pagina principală", en: "Back to homepage" })}
        </Link>
      </div>
    </div>
  );
}
