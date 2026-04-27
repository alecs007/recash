import { Hero } from "../components/Home/Hero";
import { Steps } from "../components/Home/Steps";
import { CTA } from "../components/Home/CTA";
import { Footer } from "../components/Layout/Footer";

export default function Homepage() {
  return (
    <div className="w-full pt-4 md:pt-8">
      <div className="px-4 sm:px-6 lg:px-8 space-y-12 lg:space-y-20">
        <Hero />
        <Steps />
        <CTA />
      </div>
      <Footer />
    </div>
  );
}
