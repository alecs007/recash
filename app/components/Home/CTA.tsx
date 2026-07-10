"use client";

import Image from "next/image";
import Link from "next/link";
import { LuMousePointerClick } from "react-icons/lu";
import { FaSackDollar } from "react-icons/fa6";
import { useI18n } from "@/context/I18nContext";

export const CTA = () => {
  const { t } = useI18n();
  return (
    <section className="relative bg-white rounded-[2rem] lg:rounded-[3rem] overflow-hidden mt-12 mb-12">
      <div className="relative z-10 max-w-6xl mx-auto text-center">
        <h2 className="font-sans font-extrabold text-slate-900 text-[2.5rem] lg:text-[3.3rem] leading-tight tracking-tight sm:text-nowrap">
          {t({
            ro: (
              <>
                <span className="text-nowrap">Bani din reciclare,</span>
                <br className="sm:hidden" />
                <span className="text-nowrap">
                  <span className="text-lime-500 italic"> fără cozi</span> la
                  aparat
                </span>
              </>
            ),
            en: (
              <>
                <span>Easy money &</span>

                <span>
                  <span className="text-lime-500 italic"> no queues</span> at
                  the machine
                </span>
              </>
            ),
          })}
        </h2>

        <p className="text-slate-700 text-xl lg:text-[1.2rem] mt-4 max-w-3xl mx-auto leading-relaxed">
          {t({
            ro: "Uită de drumul la magazin printr-o simplă postare. Tu îți salvezi timpul, colectorul câștigă bani, mediul îți mulțumește.",
            en: "Skip the trip to the store with a simple post. You save time, the collector earns money, and the environment thanks you.",
          })}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4 px-4">
          <Link
            href="/post"
            className="inline-flex items-center justify-center gap-2 bg-[#123524] text-white font-bold py-4 px-10 rounded-full text-lg transition-all shadow-[3px_3px_0px_#75a08c] active:translate-y-[3px] active:shadow-none w-full sm:w-auto"
          >
            <LuMousePointerClick className="w-6 h-6 text-lime-400" />
            {t({ ro: "Creează un anunț", en: "Create a listing" })}
          </Link>

          <Link
            href="/map"
            className="inline-flex items-center justify-center gap-2.5 bg-lime-400/10 text-[#123524] border-2 border-[#123524]/20 font-bold py-4 px-10 rounded-full text-lg transition-all shadow-[3px_3px_0px_#cde8b8] active:translate-y-[3px] active:shadow-none w-full sm:w-auto"
          >
            <FaSackDollar className="w-5 h-5" />{" "}
            {t({ ro: "Colectează sticle", en: "Collect bottles" })}
          </Link>
        </div>
      </div>

      <div className="relative mt-6 w-full h-[150px] md:h-[250px] lg:h-[360px]">
        <Image
          src="/images/bottles.svg"
          alt="Recash Bottles"
          fill
          sizes="100%"
          draggable={false}
          className="object-contain object-bottom scale-110 lg:scale-125"
          priority
        />
      </div>
    </section>
  );
};
