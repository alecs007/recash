import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Bike, Coins } from "lucide-react";
import { FaWineBottle } from "react-icons/fa";

export default function Homepage() {
  return (
    <div className="w-full pt-4 pb-12 space-y-12 lg:space-y-20">
      <section className="relative">
        <div className="bg-gradient-to-br from-[#123524] to-[#1a4d36] rounded-[2rem] lg:rounded-[3rem] px-8 lg:px-14 py-8 lg:py-10 relative overflow-hidden shadow-xl">
          <div className="absolute -top-16 -right-12 w-56 h-56 rounded-full bg-lime-400/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-12 w-48 h-48 rounded-full bg-emerald-500/20 blur-3xl" />

          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 bg-lime-400/15 text-lime-400 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider mb-6 backdrop-blur border border-lime-400/20">
                <span className="flex items-center gap-1">
                  <span className="flex -space-x-px">
                    <div className="w-1.5 h-3 bg-[#002B7F] rounded-l-xs" />{" "}
                    <div className="w-1.5 h-3 bg-[#FCD116]" />
                    <div className="w-1.5 h-3 bg-[#CE1126] rounded-r-xs" />{" "}
                  </span>
                </span>
                Pulsul României Verzi
              </span>
              <h1 className="font-sans font-extrabold text-white text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight sm:text-nowrap">
                Reciclează.
                <br />
                <span className="text-lime-400 italic">Câștigă.</span> Repetă.
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
                  <FaWineBottle className="w-5 h-5" /> Postează
                </Link>
                <Link
                  href="/map"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 text-white border border-white/20 font-bold py-4 px-8 w-full sm:w-auto rounded-full text-lg backdrop-blur hover:bg-white/20 transition-colors"
                >
                  <Bike className="w-5 h-5" /> Colectează
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

            <div className="hidden lg:block relative w-full max-w-[500px] aspect-square mr-5">
              <Image
                src="/hero-mascot-2.avif"
                alt="Recash Mascot"
                fill
                priority
                className="object-contain drop-shadow-2xl animate-in fade-in zoom-in duration-700"
              />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="text-center mb-8 lg:mb-12">
          <h2 className="font-extrabold text-3xl lg:text-5xl text-slate-900 tracking-tight">
            Cum funcționează?
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Postează sticlele",
              desc: "Adaugi numărul de sticle, locația și alegi cât oferi colectorului. Minim 80% rămâne la tine.",
              icon: FaWineBottle,
              color: "bg-gradient-to-br from-lime-400 to-lime-500 text-black",
            },
            {
              title: "Un colector preia",
              desc: "Colectorii din zona ta văd postarea pe hartă și o rezervă. Ai timer de 30 min să confirmi.",
              icon: Bike,
              color:
                "bg-gradient-to-br from-amber-400 to-orange-400 text-black",
            },
            {
              title: "Scanezi QR & primești bani",
              desc: "La preluare, scanezi un cod QR. Banii ajung instant în portofelul tău Recash.",
              icon: Coins,
              color: "bg-emerald-800 text-white",
            },
          ].map((s) => (
            <div
              key={s.title}
              className="bg-white rounded-3xl p-6 shadow-md border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              <div
                className={`inline-grid place-items-center w-14 h-14 rounded-2xl mb-4 shadow-sm ${s.color}`}
              >
                <s.icon className="w-7 h-7" strokeWidth={2.4} />
              </div>
              <h3 className="font-bold text-xl text-slate-900 mb-2">
                {s.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-br from-lime-400 to-lime-500 rounded-[2rem] lg:rounded-[3rem] p-8 lg:p-14 text-center relative overflow-hidden">
        <div className="relative">
          <h2 className="font-extrabold text-3xl lg:text-5xl text-black tracking-tight">
            Gata să reciclezi azi?
          </h2>
          <p className="text-black/70 mt-3 lg:text-lg max-w-md mx-auto">
            Adaugă prima ta postare în mai puțin de 30 de secunde.
          </p>
          <Link
            href="/posteaza"
            className="inline-flex items-center gap-2 bg-emerald-900 text-white font-bold py-4 px-8 rounded-full text-lg mt-6 shadow-xl hover:scale-105 transition-transform"
          >
            Începe acum <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
