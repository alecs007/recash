import Image from "next/image";
import Link from "next/link";
import { FaWineBottle } from "react-icons/fa";
import { LuBike } from "react-icons/lu";

export const Hero = () => {
  return (
    <section className="relative">
      <div className="bg-gradient-to-br from-[#123524] to-[#1a4d36] rounded-[2rem] lg:rounded-[3rem] px-8 lg:px-14 py-8 lg:py-10 relative overflow-hidden shadow-xl">
        <div className="absolute -top-16 -right-12 w-56 h-56 rounded-full bg-lime-400/30 blur-3xl" />
        <div className="absolute -bottom-16 -left-12 w-48 h-48 rounded-full bg-emerald-500/20 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row items-center justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 bg-lime-400/15 text-lime-400 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider mb-6 backdrop-blur border border-lime-400/20">
              <span className="flex items-center gap-1">
                <span className="flex -space-x-px h-3">
                  <div className="w-[7px] h-3 bg-[#002B7F] rounded-l-xs" />
                  <div className="w-[7px] h-3 bg-[#FCD116]" />
                  <div className="w-[6px] h-3 bg-[#CE1126] rounded-r-xs" />
                </span>
              </span>
              Redăm pulsul României
            </span>
            <h1 className="font-sans font-extrabold text-white text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight sm:text-nowrap">
              Reciclează.
              <br />
              <span className="text-lime-400 italic">
                <span className="text-[0.9em] sm:text-[0.95em]">Î</span>
                ncasează.
              </span>{" "}
              Repetă.
            </h1>
            <p className="text-white/80 text-lg mt-6 max-w-md">
              Cea mai simplă cale de a face bani prin reciclare. Postezi
              sticlele, un colector le preia, banii ajung la tine.
            </p>

            <div className="flex flex-wrap gap-4 mt-8">
              <Link
                href="/post"
                className="inline-flex items-center justify-center gap-2 bg-lime-400 text-black font-bold py-4 px-8 w-full sm:w-auto rounded-full text-lg shadow-lg hover:scale-105 transition-transform"
              >
                <FaWineBottle className="w-5 h-5" /> Postează sticle
              </Link>
              <Link
                href="/map"
                className="inline-flex items-center justify-center gap-2 bg-white/10 text-white border border-white/20 font-bold py-4 px-8 w-full sm:w-auto rounded-full text-lg backdrop-blur hover:bg-white/20 transition-colors"
              >
                <LuBike className="w-5 h-5" /> Colectează sticle
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-4 text-white/70 text-sm">
              <div className="flex -space-x-2">
                <span className="grid place-items-center w-9 h-9 relative rounded-full bg-lime-400 border-2 border-[#123524] text-base overflow-hidden">
                  <Image
                    src="/images/persons/person-2.svg"
                    alt="Recycler 1"
                    fill
                    sizes="100%"
                    priority
                    draggable={false}
                  />
                </span>
                <span className="grid place-items-center w-9 h-9 relative rounded-full bg-emerald-500 border-2 border-[#123524] text-base overflow-hidden">
                  <Image
                    src="/images/persons/person-1.svg"
                    alt="Recycler 2"
                    fill
                    sizes="100%"
                    priority
                    draggable={false}
                  />
                </span>
                <span className="grid place-items-center w-9 h-9 relative rounded-full bg-lime-300 border-2 border-[#123524] text-base overflow-hidden">
                  <Image
                    src="/images/persons/person-3.svg"
                    alt="Recycler 3"
                    fill
                    sizes="100%"
                    priority
                    draggable={false}
                  />
                </span>
              </div>
              <span>Susținut de cetățeni din toate colțurile tării</span>
            </div>
          </div>

          <div className="hidden lg:block relative w-full max-w-[500px] aspect-square">
            <Image
              src="/images/hero-mascot.svg"
              alt="Recash Mascot"
              fill
              priority
              sizes="100%"
              draggable={false}
              className="object-contain drop-shadow-2xl animate-in fade-in zoom-in duration-700"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
