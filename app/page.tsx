import HomeHero from "@/components/home/HomeHero";
import Navbar from "@/components/layout/Navbar";

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020617] text-zinc-100">
      <Navbar />
      <HomeHero />
    </main>
  );
}