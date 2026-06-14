import Hero from "@/components/main/Hero";
import GoogleGeminiEffectLazy from "@/components/main/GoogleGeminiEffectLazy";
import About from "@/components/main/About";
import Skills from "@/components/main/Skills";


export default function Home() {
  return (
    <main className="h-full w-full">
      <div className="flex flex-col gap-14">
        <Hero />
        <GoogleGeminiEffectLazy />
        <About />
        <Skills />
      </div>
    </main>
  );
}
