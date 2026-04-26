import Link from "next/link";
import Image from "next/image";
import { LuBike } from "react-icons/lu";
import { FaWineBottle } from "react-icons/fa";

export default function Homepage() {
  const steps = [
    {
      number: "01",
      title: "Postează anunțul",
      subtext:
        "Introduci numărul aproximativ de sticle, locația și procentajul oferit colectorului.",
      image: "/post-mascot.webp",
    },
    {
      number: "02",
      title: "Așteaptă colectorul",
      subtext:
        "Cineva din zonă îți va prelua cererea și te va scăpa de drumul la aparat.",
      image: "/colector-mascot.webp",
    },
    {
      number: "03",
      title: "Realizează schimbul",
      subtext:
        "Colectorul îți oferă suma convenită, iar tu îi predai sticlele gata de reciclat.",
      image: "/eco-mascot.webp",
    },
  ];

  return (
    <div className="w-full pt-4 md:pt-8 pb-12 space-y-12 lg:space-y-20">
      <section className="relative">
        <div className="bg-gradient-to-br from-[#123524] to-[#1a4d36] rounded-[2rem] lg:rounded-[3rem] px-8 lg:px-14 py-8 lg:py-10 relative overflow-hidden shadow-xl">
          <div className="absolute -top-16 -right-12 w-56 h-56 rounded-full bg-lime-400/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-12 w-48 h-48 rounded-full bg-emerald-500/20 blur-3xl" />

          <div className="relative flex flex-col lg:flex-row items-center justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 bg-lime-400/15 text-lime-400 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider mb-6 backdrop-blur border border-lime-400/20">
                <span className="flex items-center gap-1">
                  <span className="flex -space-x-px w-4.5 h-3">
                    <div className="w-1.5 h-3 bg-[#002B7F] rounded-l-xs" />
                    <div className="w-1.5 h-3 bg-[#FCD116]" />
                    <div className="w-1.5 h-3 bg-[#CE1126] rounded-r-xs" />
                  </span>
                </span>
                Pulsul României Verzi
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
                  <span className="grid place-items-center w-9 h-9 rounded-full bg-lime-400 border-2 border-[#123524] text-base">
                    🧑‍🌾
                  </span>
                  <span className="grid place-items-center w-9 h-9 rounded-full bg-emerald-500 border-2 border-[#123524] text-base">
                    👩
                  </span>
                  <span className="grid place-items-center w-9 h-9 rounded-full bg-lime-300 border-2 border-[#123524] text-base">
                    🧔
                  </span>
                </div>
                <span>2451 reciclatori activi azi</span>
              </div>
            </div>

            <div className="hidden lg:block relative w-full max-w-[500px] aspect-square">
              <Image
                src="/hero-mascot-2.avif"
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

      <section className="py-12">
        <div className="grid md:grid-cols-3 gap-20 md:gap-12">
          {steps.map((step) => (
            <div key={step.number} className="group">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl font-black text-lime-500">
                  {step.number.replace(/^0/, "")}.
                </span>
                <h3 className="font-bold text-2xl text-slate-900 tracking-tight">
                  {step.title}
                </h3>
              </div>

              <p className="text-slate-700 text-base leading-snug mb-6 h-auto md:h-12">
                {step.subtext}
              </p>

              <div className="relative aspect-square w-full rounded-[2rem] bg-slate-50 border border-slate-100 overflow-hidden transition-all duration-300 group-hover:border-slate-200">
                <Image
                  src={step.image}
                  alt={step.title}
                  fill
                  className="object-contain p-5"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative bg-white rounded-[2rem] lg:rounded-[3rem] overflow-hidden ">
        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <h2 className="font-sans font-extrabold text-slate-900 text-4xl lg:text-6xl leading-tight tracking-tight sm:text-nowrap">
            <span className="text-nowrap">Bani din reciclare,</span>
            <br className="sm:hidden" />
            <span className="text-nowrap">
              <span className="text-lime-500 italic"> fără cozi</span> la aparat
            </span>
          </h2>

          <p className="text-slate-700 text-lg lg:text-2xl mt-4 max-w-4xl mx-auto leading-relaxed">
            Uită de drumul la magazin printr-o simplă postare. Tu îți salvezi
            timpul, colectorul câștigă bani, mediul îți mulțumește.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4 px-4">
            <Link
              href="/post"
              className="inline-flex items-center justify-center gap-2 bg-[#123524] text-white font-bold py-4 px-10 rounded-full text-lg shadow-lg hover:bg-[#1a4d36] hover:scale-105 transition-all w-full sm:w-auto"
            >
              <FaWineBottle className="w-5 h-5 text-lime-400" /> Postează
              sticlele
            </Link>

            <Link
              href="/map"
              className="inline-flex items-center justify-center gap-2 bg-lime-400/10 text-[#123524] border-2 border-[#123524]/20 font-bold py-4 px-10 rounded-full text-lg hover:bg-lime-100 hover:border-lime-300 transition-all w-full sm:w-auto"
            >
              <LuBike className="w-5 h-5" /> Colectează sticle
            </Link>
          </div>
        </div>

        <div className="relative mt-4 w-full h-[150px] md:h-[250px] lg:h-[360px]">
          <Image
            src="/bottles.webp"
            alt="Recash Bottles"
            fill
            sizes="100%"
            draggable={false}
            className="object-contain object-bottom scale-110 lg:scale-125"
            priority
          />
        </div>
      </section>
    </div>
  );
}
