"use client";
import dynamic from "next/dynamic";

// Three.js star canvas loaded client-only, after hydration, as its own chunk
// so three/drei/maath stay out of every page's initial bundle (non-blocking).
const StarsCanvas = dynamic(() => import("./StarBackground"), { ssr: false });

export default function StarBackgroundClient() {
  return <StarsCanvas />;
}
