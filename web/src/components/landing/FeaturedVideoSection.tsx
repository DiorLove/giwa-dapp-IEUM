"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { explorerUrl } from "@/lib/contracts";

const EASE = [0.23, 1, 0.32, 1] as const;
const VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260402_054547_9875cfc5-155a-4229-8ec8-b7ba7125cbf8.mp4";

export function FeaturedVideoSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="how"
      ref={ref}
      className="overflow-hidden bg-black px-6 pt-6 pb-20 md:pt-10 md:pb-32"
    >
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9, ease: EASE }}
        className="relative mx-auto aspect-video max-w-6xl overflow-hidden rounded-3xl"
      >
        <video
          src={VIDEO}
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute right-0 bottom-0 left-0 flex flex-col items-start justify-between gap-6 p-6 md:flex-row md:items-end md:p-10">
          <div className="liquid-glass max-w-md rounded-2xl p-6 md:p-8">
            <p className="mb-3 text-xs uppercase tracking-widest text-white/50">
              작동 방식
            </p>
            <p className="text-sm leading-relaxed text-white md:text-base">
              매달 납입하면 컨트랙트가 보관하고, 회차가 끝나면 정해진 순번에게
              곗돈이 자동 지급됩니다. 미납은 보증금에서 차감되고, 모든 기록은
              GIWA 체인에 영구히 남습니다.
            </p>
          </div>
          <motion.a
            href={explorerUrl("address/0x9409Ec65128f5Dd9686F6e739f1520170F87D85A")}
            target="_blank"
            rel="noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="liquid-glass rounded-full px-8 py-3 text-sm font-medium text-white"
          >
            온체인 기록 보기 ↗
          </motion.a>
        </div>
      </motion.div>
    </section>
  );
}
