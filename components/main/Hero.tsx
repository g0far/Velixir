import React from "react";
import HeroContent from "../sub/HeroContent";

const Hero = () => {
    return (
        <div className="relative h-full w-full" id="home">
            <video
                autoPlay
                muted
                loop
                className="rotate-100 absolute top-0 -translate-y-1/2 left-0 z-[0] w-full h-full object-cover"
            >
                <source src="/blackhole.webm" type="video/webm" />
            </video>
            <HeroContent />
        </div>
    );
};

export default Hero;
