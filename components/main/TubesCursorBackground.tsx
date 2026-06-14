"use client";

import { TubesCursor } from "@/components/ui/tube-cursor";

export default function TubesCursorBackground() {
  return (
    <TubesCursor
      title=""
      subtitle=""
      caption=""
      initialColors={["#8b5cf6", "#a855f7", "#3b82f6"]}
      lightColors={["#22d3ee", "#0ea5e9", "#a855f7", "#8b5cf6"]}
      lightIntensity={200}
      enableRandomizeOnClick={false}
      className="!fixed inset-0 !h-screen !w-screen z-[1]"
    />
  );
}
