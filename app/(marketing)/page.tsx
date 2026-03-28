/**
 * Landing page for JobBoost AI.
 * Uses section-by-section TDD approach (Task 1.2).
 */
import { HeroSection } from "./_components/hero-section";
import { HowItWorksSection } from "./_components/how-it-works";
import { FeaturesSection } from "./_components/features-section";
import { StatsBar } from "./_components/stats-bar";
import { SignupCTA } from "./_components/signup-cta";
import { FAQSection } from "./_components/faq-section";
import { Footer } from "./_components/footer";

export default function MarketingPage() {
  return (
    <main className="flex flex-col flex-1">
      <HeroSection />
      <StatsBar />
      <HowItWorksSection />
      <FeaturesSection />
      <SignupCTA />
      <FAQSection />
      <Footer />
    </main>
  );
}
