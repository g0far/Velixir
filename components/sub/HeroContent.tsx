"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    slideInFromLeft,
    slideInFromRight,
    slideInFromTop,
} from "@/utils/motion";
import { BsStars } from "react-icons/bs";
import Image from "next/image";
import { InView } from "react-intersection-observer";

const HeroContent = () => {
    return (
        <InView triggerOnce={true}>
            {({ inView, ref }) => (
                <motion.div
                    ref={ref}
                    initial="hidden"
                    animate={inView ? "visible" : "hidden"}
                    className="flex md:flex-row flex-col-reverse items-center justify-center gap-10 md:gap-0 md:px-20 px-5 mt-28 w-full z-20"
                >
                    <div className="h-full w-full md:w-3/6 flex flex-col gap-5 justify-center text-start">
                        <div className="hidden md:flex flex-row items-center md:gap-5 gap-1">
                            <InView triggerOnce={true}>
                                {({ inView, ref }) => (
                                    <motion.div
                                        ref={ref}
                                        initial="hidden"
                                        animate={inView ? "visible" : "hidden"}
                                        variants={slideInFromTop}
                                        className="Welcome-box py-[8px] px-[16px] border border-[#7042f8b0] bg-[#7042f815] backdrop-blur-sm opacity-[0.9] hover:bg-[#7042f825] transition-all duration-300"
                                    >
                                        <BsStars className="text-[#b49bff] mr-[10px] h-5 w-5" />
                                        <h1 className="Welcome-text text-[13px] font-semibold">
                                            TRUST
                                        </h1>
                                    </motion.div>
                                )}
                            </InView>

                            <InView triggerOnce={true}>
                                {({ inView, ref }) => (
                                    <motion.div
                                        ref={ref}
                                        initial="hidden"
                                        animate={inView ? "visible" : "hidden"}
                                        variants={slideInFromTop}
                                        className="Welcome-box py-[8px] px-[16px] border border-[#7042f8b0] bg-[#7042f815] backdrop-blur-sm opacity-[0.9] hover:bg-[#7042f825] transition-all duration-300"
                                    >
                                        <BsStars className="text-[#b49bff] mr-[10px] h-5 w-5" />
                                        <h1 className="Welcome-text text-[13px] font-semibold">
                                            UNLOCK
                                        </h1>
                                    </motion.div>
                                )}
                            </InView>
                            <InView triggerOnce={true}>
                                {({ inView, ref }) => (
                                    <motion.div
                                        ref={ref}
                                        initial="hidden"
                                        animate={inView ? "visible" : "hidden"}
                                        variants={slideInFromTop}
                                        className="Welcome-box py-[8px] px-[16px] border border-[#7042f8b0] bg-[#7042f815] backdrop-blur-sm opacity-[0.9] hover:bg-[#7042f825] transition-all duration-300"
                                    >
                                        <BsStars className="text-[#b49bff] mr-[10px] h-5 w-5" />
                                        <h1 className="Welcome-text text-[13px] font-semibold">
                                            CAPITAL
                                        </h1>
                                    </motion.div>
                                )}
                            </InView>
                        </div>

                        <InView triggerOnce={true}>
                            {({ inView, ref }) => (
                                <motion.div
                                    ref={ref}
                                    initial="hidden"
                                    animate={inView ? "visible" : "hidden"}
                                    variants={slideInFromLeft(0.5)}
                                    className="flex flex-col gap-4 mt-4 md:text-5xl text-4xl font-bold text-white max-w-[600px] w-auto h-auto z-20"
                                >
                                    <span className="flex flex-col items-center gap-2 text-center w-full">
                                        <span className="md:text-6xl text-5xl leading-tight">
                                            YOUR{" "}
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500">
                                                REPUTATION
                                            </span>
                                        </span>
                                        <span className="text-gray-400 text-lg md:text-xl font-light tracking-[0.4em] uppercase">
                                            — is —
                                        </span>
                                        <span className="md:text-6xl text-5xl leading-tight">
                                            YOUR{" "}
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500">
                                                COLLATERAL
                                            </span>
                                        </span>
                                    </span>
                                </motion.div>
                            )}
                        </InView>

                        <InView triggerOnce={true}>
                            {({ inView, ref }) => (
                                <motion.div
                                    ref={ref}
                                    initial="hidden"
                                    animate={inView ? "visible" : "hidden"}
                                    variants={slideInFromLeft(0.8)}
                                    className="my-3 max-w-[650px] z-30"
                                >
                                    <p className="text-gray-300 text-[14px] md:text-[15px] font-medium leading-relaxed mb-3 tracking-wide">
                                        Unlock Borrowing Power Up To{" "}
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                                            110%
                                        </span>{" "}
                                        Through{" "}
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                                            Verified Reputation
                                        </span>
                                    </p>
                                    <ul className="flex flex-col gap-2.5 text-slate-300 text-[13px] md:text-[14px] font-medium tracking-wide">
                                        <li className="flex items-center gap-3 hover:text-white transition-colors duration-200">
                                            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 shadow-[0_0_8px_rgba(168,85,247,0.7)]" />
                                            Credit Score
                                        </li>
                                        <li className="flex items-center gap-3 hover:text-white transition-colors duration-200">
                                            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 shadow-[0_0_8px_rgba(168,85,247,0.7)]" />
                                            KYC / Identity Verified
                                        </li>
                                        <li className="flex items-center gap-3 hover:text-white transition-colors duration-200">
                                            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 shadow-[0_0_8px_rgba(168,85,247,0.7)]" />
                                            Banking Verification
                                        </li>
                                        <li className="flex items-center gap-3 hover:text-white transition-colors duration-200">
                                            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 shadow-[0_0_8px_rgba(168,85,247,0.7)]" />
                                            On-chain Reputation
                                        </li>
                                        <li className="flex items-center gap-3 hover:text-white transition-colors duration-200">
                                            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 shadow-[0_0_8px_rgba(168,85,247,0.7)]" />
                                            Credit Reporting Consent
                                        </li>
                                    </ul>
                                </motion.div>
                            )}
                        </InView>
                        <InView triggerOnce={true}>
                            {({ inView, ref }) => (
                                <motion.div
                                    ref={ref}
                                    initial="hidden"
                                    animate={inView ? "visible" : "hidden"}
                                    variants={slideInFromLeft(1)}
                                    className="flex flex-row gap-4 z-40"
                                >
                                    <a
                                        href="/borrow"
                                        className="py-2 button-primary text-center text-white cursor-pointer rounded-lg max-w-[200px] w-[200px] animate-pulse-purple"
                                    >
                                        Launch App
                                    </a>
                                    <a
                                        href="#about"
                                        className="py-2 button-primary text-center text-white cursor-pointer rounded-lg max-w-[200px] w-[200px]"
                                    >
                                        Learn More!
                                    </a>
                                </motion.div>
                            )}
                        </InView>
                    </div>

                    <InView triggerOnce={true}>
                        {({ inView, ref }) => (
                            <motion.div
                                ref={ref}
                                initial="hidden"
                                animate={inView ? "visible" : "hidden"}
                                variants={slideInFromRight(0.8)}
                                className="w-full md:w-3/6 h-full flex justify-center items-center z-40"
                            >
                                <Image
                                    src="/mainIconsdark.svg"
                                    alt="work icons"
                                    height={650}
                                    width={650}
                                />
                            </motion.div>
                        )}
                    </InView>
                </motion.div>
            )}
        </InView>
    );
};

export default HeroContent;