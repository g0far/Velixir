"use client";
import React from "react";

import { motion } from "framer-motion";
import { slideInFromBottom, slideInFromLeft, slideInFromRight, slideInFromTop } from "@/utils/motion";
import { InView } from "react-intersection-observer";

const About = () => {
    return (
        <section
            id="about"
            className="flex flex-col md:flex-row relative items-center justify-center min-h-[75vh] pt-12 pb-4 w-full h-full"
        >
            <div className="md:absolute w-auto h-auto md:top-[40px] z-[5]">
                <InView triggerOnce={false}>
                    {({ inView, ref }) => (
                        <motion.div
                            ref={ref}
                            initial="hidden"
                            animate={inView ? "visible" : "hidden"}
                            variants={slideInFromTop}
                            className="text-[40px] pt-[2.5rem] pb-3 md:p-0 font-medium text-center text-gray-200 z-50"
                        >
                            About
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500">
                                {" "}
                                VELIXIR{" "}
                            </span>
                        </motion.div>
                    )}
                </InView>
            </div>

            <div className="flex flex-col items-center justify-start relative md:mt-[50px] lg:mt-8 z-[20] w-auto h-auto">
                <InView triggerOnce={false}>
                    {({ inView, ref }) => (
                        <motion.div
                            ref={ref}
                            initial="hidden"
                            animate={inView ? "visible" : "hidden"}
                            variants={slideInFromLeft(0.5)}
                            className="flex flex-col items-center justify-center w-[250px] h-[250px]"
                            style={{ perspective: 1000 }}
                        >
                            <motion.img
                                src="/velixir_transparent.png?v=4"
                                alt="profile"
                                className="object-cover w-full h-full"
                                animate={{
                                    rotateY: [0, 360]
                                }}
                                transition={{
                                    duration: 15,
                                    repeat: Infinity,
                                    ease: "linear"
                                }}
                            />
                        </motion.div>
                    )}
                </InView>

                <InView triggerOnce={false}>
                    {({ inView, ref }) => (
                        <motion.div
                            ref={ref}
                            initial="hidden"
                            animate={inView ? "visible" : "hidden"}
                            variants={slideInFromBottom}
                            className="flex flex-col items-center mt-6 z-[20] w-full"
                        >
                            <div className="bg-transparent px-6 py-8 w-[90%] md:w-[500px] flex flex-col items-center gap-4 text-center transition-all duration-500">
                                <h1 className="text-4xl font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-400 to-cyan-400 font-sans drop-shadow-[0_0_20px_rgba(168,85,247,0.5)] uppercase">
                                    VELIXIR
                                </h1>
                                <p className="Welcome-text text-[13px] uppercase tracking-widest text-[#b49bff]">
                                    Verifiable Economic Layer for Identity &amp; Reputation
                                </p>
                                <div className="w-20 h-0.5 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full" />
                                <p className="Welcome-text text-[15px] md:text-[16px] font-medium leading-relaxed tracking-wide text-center">
                                    Building the trust layer for the next generation of digital finance, where lending, trading, and capital formation are powered by verifiable reputation instead of excessive collateral.
                                </p>
                                <div className="font-sans text-[15px] tracking-[0.18em] text-transparent bg-clip-text bg-gradient-to-r from-[#b49bff] via-purple-400 to-cyan-400 font-semibold text-center uppercase drop-shadow-[0_0_10px_rgba(168,85,247,0.3)] mt-6">
                                    Where Trust Becomes Borrowing Power
                                </div>
                            </div>
                        </motion.div>
                    )}
                </InView>
            </div>


            <div className="w-full h-full hidden md:flex items-center justify-center absolute top-0 left-0 z-[-1]">
                <video
                    loop
                    muted
                    autoPlay
                    playsInline
                    preload="false"
                    className="w-full h-full object-cover opacity-80"
                    src="/encryption.webm/"
                />
            </div>
        </section>
    );
};

export default About;