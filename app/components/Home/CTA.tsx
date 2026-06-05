import Image from "next/image";
import Link from "next/link";
import { LuBike, LuMousePointerClick } from "react-icons/lu";

export const CTA = () => {
  return (
    <section className="relative bg-white rounded-[2rem] lg:rounded-[3rem] overflow-hidden mt-12 mb-16 sm:mb-12">
      <div className="relative z-10 max-w-6xl mx-auto text-center">
        <h2 className="font-sans font-extrabold text-slate-900 text-[2.5rem] lg:text-6xl leading-tight tracking-tight sm:text-nowrap">
          <span className="text-nowrap">Bani din reciclare,</span>
          <br className="sm:hidden" />
          <span className="text-nowrap">
            <span className="text-lime-500 italic"> fără cozi</span> la aparat
          </span>
        </h2>

        <p className="text-slate-700 text-xl lg:text-2xl mt-4 max-w-4xl mx-auto leading-relaxed">
          Uită de drumul la magazin printr-o simplă postare. Tu îți salvezi
          timpul, colectorul câștigă bani, mediul îți mulțumește.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4 px-4">
          <Link
            href="/post"
            className="inline-flex items-center justify-center gap-2 bg-[#123524] text-white font-bold py-4 px-10 rounded-full text-lg shadow-lg hover:bg-[#1a4d36] hover:scale-105 transition-all w-full sm:w-auto"
          >
            <LuMousePointerClick className="w-6 h-6 text-lime-400" />
            Creează un anunț
          </Link>

          <Link
            href="/map"
            className="inline-flex items-center justify-center gap-2 bg-lime-400/10 text-[#123524] border-2 border-[#123524]/20 font-bold py-4 px-10 rounded-full text-lg hover:bg-lime-100 hover:border-lime-300 transition-all w-full sm:w-auto"
          >
            <LuBike className="w-5 h-5" /> Colectează sticle
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
