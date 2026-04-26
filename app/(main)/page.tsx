import { Hero } from "../components/Home/Hero";
import { Steps } from "../components/Home/Steps";
import { CTA } from "../components/Home/CTA";

export default function Homepage() {
  return (
    <div className="w-full pt-4 md:pt-8 pb-12 space-y-12 lg:space-y-20">
      <Hero />
      <Steps />
      <CTA />
    </div>
  );
}
