"use client";

import React from "react";
import Projects from "@/components/main/Projects";
import Architects from "@/components/main/Architects";
import VelixirFooter from "@/components/main/VelixirFooter";

export default function ProjectPage() {
    return (
        <div className="min-h-screen bg-[#030014] overflow-x-hidden flex flex-col justify-between relative">
            {/* Background blackhole video */}
            <div className="absolute top-0 left-0 w-full h-[600px] z-0 overflow-hidden pointer-events-none">
                <video
                    autoPlay
                    muted
                    loop
                    className="rotate-180 absolute top-0 -translate-y-[45%] left-0 w-full h-full object-cover opacity-45"
                >
                    <source src="/blackhole.webm" type="video/webm" />
                </video>
                {/* Visual fade-out mask to blend video to dark page body */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030014]/60 to-[#030014]" />
            </div>

            <main className="flex-grow pt-[100px] md:pt-[120px] pb-10 flex flex-col items-center justify-center relative z-10">
                <Projects />
            </main>
            <div className="relative z-10">
                <Architects />
            </div>
            <div className="relative z-10">
                <VelixirFooter />
            </div>
        </div>
    );
}
