"use client";

import React from "react";

import VelixirFooter from "./VelixirFooter";

const Skills = () => {
    return (
        <section
            id="skills"
            className="flex flex-col items-center justify-center gap-3 relative pt-14 pb-0 w-full"
        >
            {/* Background Video */}
            <div className="absolute inset-0 z-0 opacity-30 flex items-center justify-center w-full h-full pointer-events-none">
                <video
                    className="w-full h-full object-cover"
                    preload="false"
                    playsInline
                    loop
                    muted
                    autoPlay
                    src="/cards-video.webm"
                />
            </div>
            
            {/* Foreground Footer */}
            <div className="relative z-10 w-full">
                <VelixirFooter />
            </div>
        </section>
    );
};

export default Skills;
