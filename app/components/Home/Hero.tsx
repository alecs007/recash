import Image from "next/image";
import Link from "next/link";
import { LuBike, LuMousePointerClick } from "react-icons/lu";

export const Hero = () => {
  return (
    <section className="relative bg-white">
      {/* 3D shadow layers */}
      <div
        className="absolute inset-0 rounded-[2rem] lg:rounded-[3rem] bg-lime-400/30"
        style={{ transform: "translate(5px, 5px)" }}
      />
      <div
        className="absolute inset-0 rounded-[2rem] lg:rounded-[3rem] bg-lime-400/15"
        style={{ transform: "translate(10px, 10px)" }}
      />

      {/* Main card */}
      <div className="relative bg-gradient-to-br from-[#123524] to-[#1a4d36] rounded-[2rem] lg:rounded-[3rem] px-8 lg:px-14 py-8 lg:py-10 overflow-hidden">
        <div className="absolute -top-16 -right-12 w-52 h-52 rounded-full bg-lime-400/30 blur-3xl" />
        <div className="absolute -bottom-16 -left-12 w-44 h-44 rounded-full bg-emerald-500/20 blur-3xl" />

        {/* Counter-rotate content so text stays straight */}
        <div
          className="relative flex flex-col lg:flex-row items-center justify-between"
          style={{ transform: "rotate(1deg)" }}
        >
          <div className="max-w-2xl">
            <div className="flex items-center gap-2.5 text-white/90 text-[0.9em] font-semibold tracking-wide mb-4">
              <Image
                src="/images/returo-logo2.svg"
                alt="RetuRO Logo"
                width={100}
                height={100}
                priority
                className="w-14 h-auto"
                draggable={false}
              />
              <span>Be smart & earn with RetuRO</span>
            </div>
            <h1
              className="font-sans font-extrabold text-white text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight sm:text-nowrap"
              style={{
                // Tighter, punchier shadow using only 2 layers for a crisp "pressed" look
                textShadow: `
      2px 2px 0px #0a2016,
      3px 3px 0px #04100a
    `,
              }}
            >
              Reciclează.
              <br />
              <span
                className="text-lime-400 italic"
                style={{
                  // Tighter shadow for the lime text to keep it legible against the dark background
                  textShadow: `
        2px 2px 0px #2a4708,
        3px 3px 0px #152204
      `,
                }}
              >
                <span className="text-[0.9em] sm:text-[0.95em]">Î</span>
                ncasează.
              </span>{" "}
              Repetă.
            </h1>
            <p className="text-white/80 text-lg mt-6 max-w-md">
              Cea mai simplă cale de a face bani prin reciclare. Postezi
              sticlele, un colector le preia, banii ajung la tine.
            </p>

            <div className="flex flex-wrap gap-6 mt-8">
              <Link
                href="/post"
                className="inline-flex items-center justify-center gap-2 bg-lime-400 text-black font-bold py-4 px-8 w-full sm:w-auto rounded-full text-lg transition-all active:translate-y-[4px] active:shadow-none"
                style={{
                  boxShadow: "4px 4px 0px #365a0a",
                }}
              >
                <LuMousePointerClick className="w-6 h-6" /> Creează un anunț
              </Link>

              <Link
                href="/map"
                className="inline-flex items-center justify-center gap-2 bg-white/10 text-white border border-white/20 font-bold py-4 px-8 w-full sm:w-auto rounded-full text-lg backdrop-blur transition-all active:translate-y-[4px] active:shadow-none"
                style={{
                  // Using a semi-transparent dark emerald instead of pure dark
                  boxShadow: "4px 4px 0px rgba(12, 53, 36, 0.8)",
                }}
              >
                <LuBike className="w-5 h-5" /> Colectează sticle
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-4 text-white/70 text-sm">
              <div className="flex -space-x-2">
                <span className="grid place-items-center w-9 h-9 relative rounded-full bg-lime-400 border border-lime-400 text-base overflow-hidden">
                  <Image
                    src="/images/persons/person-2.svg"
                    alt="Recycler 1"
                    fill
                    sizes="100%"
                    priority
                    draggable={false}
                  />
                </span>
                <span className="grid place-items-center w-9 h-9 relative rounded-full bg-emerald-500 border border-lime-400 text-base overflow-hidden">
                  <Image
                    src="/images/persons/person-1.svg"
                    alt="Recycler 2"
                    fill
                    sizes="100%"
                    priority
                    draggable={false}
                  />
                </span>
                <span className="grid place-items-center w-9 h-9 relative rounded-full bg-lime-300 border border-lime-400 text-base overflow-hidden">
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
