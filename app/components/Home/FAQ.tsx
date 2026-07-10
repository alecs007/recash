"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { useI18n } from "@/context/I18nContext";

export const FAQ = () => {
  const { t, fmt } = useI18n();
  const [open, setOpen] = useState<number | null>(null);

  const sgrValue = fmt(0.5);
  const FAQS = [
    {
      q: t({ ro: "Cum funcționează Recash?", en: "How does Recash work?" }),
      a: t({
        ro: "Simplu: postezi un anunț cu numărul de sticle pe care vrei să le reciclezi, locația lor și partea oferită colectorului. Un colector din zona ta preia cererea, vine la locație, îți dă banii conveniți și pleacă cu sticlele. Astfel, nu mai pierzi timp cu drumul la aparat și salvezi spațiu în locuința ta.",
        en: "Simple: you post a listing with the number of bottles you want to recycle, their location and the share offered to the collector. A collector in your area picks up the request, comes to the location, pays you the agreed amount and leaves with the bottles. You save the trip to the machine and free up space at home.",
      }),
    },
    {
      q: t({
        ro: "Cât primesc pentru sticlele mele?",
        en: "How much do I get for my bottles?",
      }),
      a: t({
        ro: `Valoarea SGR este de ${sgrValue} per sticlă sau doză. Tu decizi ce procent din valoarea totală a sticlelor îi oferi colectorului. Cu cât oferi mai mult, cu atât va veni mai repede.`,
        en: `The SGR deposit value is ${sgrValue} per bottle or can. You decide what share of the total value you offer the collector. The more you offer, the faster they'll come.`,
      }),
    },
    {
      q: t({
        ro: "Este sigur? Cum știu că vine cineva serios?",
        en: "Is it safe? How do I know a reliable person is coming?",
      }),
      a: t({
        ro: "Fiecare utilizator are un scor de reputație bazat pe recenziile primite de la tranzacțiile anterioare. Poți vedea rating-ul și istoricul colectorului înainte de a-i aproba cererea.",
        en: "Every user has a reputation score based on reviews from previous transactions. You can see a collector's rating and history before approving their request.",
      }),
    },
    {
      q: t({
        ro: "Cât durează până vine colectorul?",
        en: "How long until the collector arrives?",
      }),
      a: t({
        ro: "Odată ce aprobi cererea unui colector, acesta are 60 de minute să ajungă la tine. Dacă nu ajunge la timp, colectorul va primi o penalizare la scorul de reputație și anunțul tău devine din nou disponibil.",
        en: "Once you approve a collector's request, they have 60 minutes to reach you. If they don't arrive in time, their reputation score is penalized and your listing becomes available again.",
      }),
    },
    {
      q: t({
        ro: "Ce tipuri de sticle sunt acceptate?",
        en: "Which types of bottles are accepted?",
      }),
      a: t({
        ro: "Toate ambalajele incluse în sistemul SGR/RetuRO sunt acceptate: ambalaje PET, de sticlă sau doze de aluminiu între 0,1L și 3L, marcate cu sigla RetuRO. Sticlele turtite, sparte sau murdare excesiv NU sunt acceptate.",
        en: "All packaging included in the SGR/RetuRO system is accepted: PET, glass or aluminium cans between 0.1L and 3L, marked with the RetuRO logo. Crushed, broken or excessively dirty bottles are NOT accepted.",
      }),
    },
  ];

  return (
    <section>
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start mb-16">
        <div className="flex-1 min-w-0">
          <h2 className="font-sans font-extrabold text-slate-900 text-[2.3rem] lg:text-[3.2rem] leading-[1.15] tracking-tight mb-8 text-center lg:text-left">
            {t({
              ro: (
                <>
                  Întrebări{" "}
                  <span className="text-lime-500 italic">frecvente</span>
                </>
              ),
              en: (
                <>
                  Frequently asked{" "}
                  <span className="text-lime-500 italic">questions</span>
                </>
              ),
            })}
          </h2>

          <div className="space-y-2.5">
            {FAQS.map((faq, i) => {
              const isOpen = open === i;
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-100 bg-white overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer"
                  >
                    <span className="font-bold text-slate-800">{faq.q}</span>
                    <span
                      className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-200 ${
                        isOpen
                          ? "bg-[#123424] text-lime-400"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isOpen ? (
                        <Minus className="w-3 h-3" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          duration: 0.22,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="overflow-hidden"
                      >
                        <div className="mx-5 mb-4 border-t border-slate-100 pt-3">
                          <p className="text-slate-600 leading-relaxed">
                            {faq.a}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        <div className="hidden lg:flex lg:w-[450px] shrink-0 items-center justify-center">
          <Image
            src="/images/faq-bottle.svg"
            alt="Recash FAQ"
            width={450}
            height={450}
            draggable={false}
            className="object-contain object-bottom relative z-10 scale-110"
          />
        </div>
      </div>
    </section>
  );
};
