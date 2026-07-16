import { Hero } from "@/components/landing/Hero";
import { Marquee } from "@/components/landing/Marquee";
import { AboutSection } from "@/components/landing/AboutSection";
import { FeaturedVideoSection } from "@/components/landing/FeaturedVideoSection";
import { PhilosophySection } from "@/components/landing/PhilosophySection";
import { ServicesSection } from "@/components/landing/ServicesSection";

export default function Landing() {
  return (
    <main className="bg-black">
      <Hero />
      <Marquee />
      <AboutSection />
      <FeaturedVideoSection />
      <PhilosophySection />
      <ServicesSection />
    </main>
  );
}
