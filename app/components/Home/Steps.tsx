import Image from "next/image";

export const Steps = () => {
  const steps = [
    {
      number: "01",
      title: "Postează anunțul",
      subtext:
        "Introdu numărul aproximativ de sticle, locația și procentajul oferit colectorului.",
      image: "/images/steps/post-mascot.svg",
    },
    {
      number: "02",
      title: "Așteaptă colectorul",
      subtext:
        "Cineva din zonă îți va prelua cererea și te va scăpa de drumul la aparat.",
      image: "/images/steps/colector-mascot.svg",
    },
    {
      number: "03",
      title: "Realizează schimbul",
      subtext:
        "Colectorul îți oferă suma convenită, iar tu îi predai sticlele gata de reciclat.",
      image: "/images/steps/eco-mascot.svg",
    },
  ];

  return (
    <section className="py-12">
      <div className="grid md:grid-cols-3 gap-20 md:gap-12 px-3 md:px-0">
        {steps.map((step) => (
          <div key={step.number} className="group">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl font-black text-lime-500">
                {step.number.replace(/^0/, "")}.
              </span>
              <h3 className="font-bold text-3xl text-slate-900 tracking-tight text-nowrap">
                {step.title}
              </h3>
            </div>

            <p className="text-slate-700 text-lg leading-snug mb-6 h-auto md:h-12">
              {step.subtext}
            </p>

            <div className="relative aspect-square w-full rounded-[2rem] bg-slate-50 border border-slate-100 overflow-hidden transition-all duration-300 group-hover:border-slate-200">
              <Image
                src={step.image}
                alt={step.title}
                fill
                sizes="100%"
                draggable={false}
                priority
                className="object-contain p-5"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
