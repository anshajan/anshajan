import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Studio from "@/components/Studio";
import PricingSection from "@/components/PricingSection";
import SecuritySection from "@/components/SecuritySection";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-ink-950">
      <Nav />
      <Hero />
      <HowItWorks />
      <Studio />
      <PricingSection />
      <SecuritySection />
      <Footer />
    </main>
  );
}
