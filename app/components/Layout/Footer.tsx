import { LuMail } from "react-icons/lu";
import { FaFacebook, FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import Image from "next/image";
import Link from "next/link";

export const Footer = () => {
  return (
    <footer className="relative bg-gradient-to-br from-[#123524] to-[#1a4d36] border-t border-lime-400/20 py-12 rounded-t-[2rem] lg:rounded-t-[3rem] overflow-hidden">
      <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-lime-400/10 blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-lime-400/5 blur-[80px] pointer-events-none" />

      <div className="relative w-full px-4 sm:px-12 md:px-16 lg:px-20 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <Image
              src="/images/recash-logo.webp"
              alt="Recash Logo"
              width={643}
              height={138}
              draggable={false}
              className="h-9 w-auto mx-auto md:mx-0 mb-4 brightness-0 invert sepia-[.5] hue-rotate-[60deg] saturate-[2]"
            />
            <p className="text-white/80">
              Transformăm{" "}
              <span className="text-lime-400 font-medium">reciclarea</span>{" "}
              într-o oportunitate pentru toți românii.
            </p>
          </div>

          <div className="flex gap-4">
            {[
              {
                icon: <FaInstagram size={20} />,
                href: "https://instagram.com",
                label: "Instagram",
              },
              {
                icon: <FaFacebook size={20} />,
                href: "https://facebook.com",
                label: "Facebook",
              },
              {
                icon: <FaXTwitter size={20} />,
                href: "https://twitter.com",
                label: "Twitter",
              },
              {
                icon: <LuMail size={20} />,
                href: "mailto:contact@recash.ro",
                label: "Email",
              },
            ].map((social, index) => (
              <a
                key={index}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/80 hover:text-black hover:bg-lime-400 hover:border-lime-400 transition-all duration-300"
                aria-label={social.label}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10 text-sm text-white/60">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/termeni"
                className="hover:text-lime-400 transition-colors"
              >
                Termeni și Condiții
              </Link>
              <span className="text-white/20">•</span>
              <Link
                href="/confidentialitate"
                className="hover:text-lime-400 transition-colors"
              >
                Confidențialitate
              </Link>
            </div>
            <p className="text-center md:text-right">
              © {new Date().getFullYear()} RECASH. Toate drepturile rezervate.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
