import Link from "next/link";
import {
  FaWineBottle,
  FaFacebook,
  FaInstagram,
  FaLinkedin,
} from "react-icons/fa";

export const Footer = () => {
  return (
    <footer className="mt-20 bg-[#123524] rounded-t-[2rem] lg:rounded-t-[3rem] text-white/90 overflow-hidden">
      <div className="max-w-7xl mx-auto px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="bg-lime-400 p-2 rounded-lg">
                <FaWineBottle className="text-[#123524] w-6 h-6" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-white">
                RECASH<span className="text-lime-400">.</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-white/70">
              Transformăm reciclarea într-o oportunitate pentru toată lumea. Mai
              puțin timp pierdut, mai mult impact verde.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Navigare</h4>
            <ul className="space-y-4 text-sm">
              <li>
                <Link
                  href="/post"
                  className="hover:text-lime-400 transition-colors"
                >
                  Postează sticle
                </Link>
              </li>
              <li>
                <Link
                  href="/map"
                  className="hover:text-lime-400 transition-colors"
                >
                  Harta colectare
                </Link>
              </li>
              <li>
                <Link
                  href="/despre"
                  className="hover:text-lime-400 transition-colors"
                >
                  Cum funcționează
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Suport</h4>
            <ul className="space-y-4 text-sm">
              <li>
                <Link
                  href="/termeni"
                  className="hover:text-lime-400 transition-colors"
                >
                  Termeni și condiții
                </Link>
              </li>
              <li>
                <Link
                  href="/confidentialitate"
                  className="hover:text-lime-400 transition-colors"
                >
                  Confidențialitate
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-lime-400 transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Social</h4>
            <div className="flex gap-4 mb-6">
              <a
                href="#"
                className="p-3 bg-white/5 rounded-full hover:bg-lime-400 hover:text-[#123524] transition-all"
              >
                <FaFacebook />
              </a>
              <a
                href="#"
                className="p-3 bg-white/5 rounded-full hover:bg-lime-400 hover:text-[#123524] transition-all"
              >
                <FaInstagram />
              </a>
              <a
                href="#"
                className="p-3 bg-white/5 rounded-full hover:bg-lime-400 hover:text-[#123524] transition-all"
              >
                <FaLinkedin />
              </a>
            </div>
            <p className="text-xs text-white/50 italic">
              Alătură-te mișcării sustenabile din România.
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/40">
          <p>
            © {new Date().getFullYear()} RECASH. Toate drepturile rezervate.
          </p>
        </div>
      </div>
    </footer>
  );
};
