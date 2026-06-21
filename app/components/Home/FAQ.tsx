"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const FAQS = [
  {
    q: "Cum funcționează Recash?",
    a: "Simplu: postezi un anunț cu numărul de sticle pe care vrei să le reciclezi, locația lor și partea oferită colectorului. Un colector din zona ta preia cererea, vine la locație, îți dă banii conveniți și pleacă cu sticlele. Astfel, nu mai pierzi timp cu drumul la aparat și salvezi spațiu în locuința ta.",
  },
  {
    q: "Cât primesc pentru sticlele mele?",
    a: "Valoarea SGR este de 0,50 RON per sticlă sau doză. Tu decizi ce procent din valoarea totală a sticlelor îi oferi colectorului. Cu cât oferi mai mult, cu atât va veni mai repede.",
  },
  {
    q: "Este sigur? Cum știu că vine cineva serios?",
    a: "Fiecare utilizator are un scor de reputație bazat pe recenziile primite de la tranzacțiile anterioare. Poți vedea rating-ul și istoricul colectorului înainte de a-i aproba cererea.",
  },
  {
    q: "Cât durează până vine colectorul?",
    a: "Odată ce aprobi cererea unui colector, acesta are 60 de minute să ajungă la tine. Dacă nu ajunge la timp, colectorul va primi o penalizare la scorul de reputație și anunțul tău devine din nou disponibil.",
  },
  {
    q: "Ce tipuri de sticle sunt acceptate?",
    a: "Toate ambalajele incluse în sistemul SGR/RetuRO sunt acceptate: ambalaje PET, de sticlă sau doze de aluminiu între 0,1L și 3L, marcate cu sigla RetuRO. Sticlele turtite, sparte sau murdare excesiv NU sunt acceptate.",
  },
];

export const FAQ = () => {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section>
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start mb-16">
        <div className="flex-1 min-w-0">
          <h2 className="font-sans font-extrabold text-slate-900 text-[2.3rem] lg:text-[3.2rem] leading-[1.15] tracking-tight mb-8 text-center lg:text-left">
            Întrebări <span className="text-lime-500 italic">frecvente</span>
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
