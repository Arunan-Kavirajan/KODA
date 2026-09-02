import { LandingNav } from "@/components/landing/nav";
import { HeroSection } from "@/components/landing/hero";
import { HowItWorksSection } from "@/components/landing/how-it-works";
import { AgentSection } from "@/components/agents/preview";
import { LandingFooter } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingNav />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <AgentSection />
      </main>
      <LandingFooter />
    </div>
  );
}
