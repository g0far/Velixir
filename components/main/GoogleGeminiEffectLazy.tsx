"use client";
import dynamic from "next/dynamic";

// Heavy below-the-fold scroll SVG effect — loaded client-only after hydration.
// Placeholder preserves the 250vh height so there is no layout shift.
const GoogleGeminiEffectDemo = dynamic(
  () => import("./GoogleGeminiEffectDemo").then((m) => m.GoogleGeminiEffectDemo),
  { ssr: false, loading: () => <div className="h-[250vh] w-full" aria-hidden /> }
);

export default function GoogleGeminiEffectLazy() {
  return <GoogleGeminiEffectDemo />;
}
