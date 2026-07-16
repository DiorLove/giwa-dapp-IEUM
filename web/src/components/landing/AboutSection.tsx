"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const EASE = [0.23, 1, 0.32, 1] as const;

export function AboutSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="about"
      ref={ref}
      className="relative overflow-hidden bg-black px-6 pt-32 pb-10 md:pt-44 md:pb-14"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.03)_0%,_transparent_70%)]" />
      <div className="relative mx-auto max-w-5xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-8 text-sm uppercase tracking-widest text-white/40"
        >
          물레는
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
          className="text-4xl leading-[1.15] tracking-tight text-white md:text-6xl lg:text-7xl"
        >
          계주도, 총무도, 장부도 없이{" "}
          <span className="font-display italic text-white/60">곗돈</span>을
          <br className="hidden md:block" /> 지키는{" "}
          <span className="font-display italic text-white/60">
            온체인 계모임
          </span>
          입니다.
        </motion.h2>
      </div>
    </section>
  );
}
