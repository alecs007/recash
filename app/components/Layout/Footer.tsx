import { LuMail } from "react-icons/lu";
import { FaFacebook, FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import Image from "next/image";
import Link from "next/link";

export const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-[#123524] to-[#1a4d36] border-t border-white/10 py-12 rounded-t-[2rem] lg:rounded-t-[3rem]">
      <div className="w-full px-4 sm:px-12 md:px-16 lg:px-20 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <Image
              src="/images/recash-logo.webp"
              alt="Recash Logo"
              width={643}
              height={138}
              className="h-9 w-auto mx-auto md:mx-0 mb-4 brightness-0 invert"
            />
            <p className="text-white/80">
              Transformăm reciclarea într-o oportunitate pentru toți românii.
            </p>
          </div>

          <div className="flex gap-6">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-lime-400 transition-colors"
              aria-label="Instagram"
            >
              <FaInstagram size={24} />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-lime-400 transition-colors"
              aria-label="Facebook"
            >
              <FaFacebook size={24} />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-lime-400 transition-colors"
              aria-label="Twitter"
            >
              <FaXTwitter size={24} />
            </a>
            <a
              href="mailto:contact@recash.ro"
              className="text-white/80 hover:text-lime-400 transition-colors"
              aria-label="Email"
            >
              <LuMail size={24} />
            </a>
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
              {/* <span className="text-white/20">•</span>
              <Link
                href="/contact"
                className="hover:text-lime-400 transition-colors"
              >
                Contact
              </Link> */}
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
