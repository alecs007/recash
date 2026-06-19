import { Hero } from "../components/Home/Hero";
import { Steps } from "../components/Home/Steps";
import { CTA } from "../components/Home/CTA";
import { LeaderboardSection } from "../components/Home/Leaderboard";
import { FAQ } from "../components/Home/FAQ";
import { Footer } from "../components/Layout/Footer";
import { SectionDivider } from "../components/Home/SectionDivider";

export const revalidate = 3600;

export default function Homepage() {
  return (
    <div className="w-full pt-4 md:pt-8">
      <div className="px-4 sm:px-6 lg:px-8 space-y-0">
        <Hero />
        <Steps />
        <SectionDivider variant={1} />
        <LeaderboardSection />
        <SectionDivider variant={2} />
        <FAQ />
        <SectionDivider variant={3} />
        <CTA />
      </div>
      <Footer />
    </div>
  );
}
