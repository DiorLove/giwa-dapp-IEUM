"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const EASE = [0.23, 1, 0.32, 1] as const;
const VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4";

export function PhilosophySection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="overflow-hidden bg-black px-6 py-28 md:py-40">
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: EASE }}
          className="mb-16 text-5xl tracking-tight text-white md:mb-24 md:text-7xl lg:text-8xl"
        >
          전통 <span className="font-display italic text-white/40">×</span> 체인
        </motion.h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
            className="aspect-[4/3] overflow-hidden rounded-3xl"
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
            className="flex flex-col justify-center"
          >
            <div>
              <p className="mb-4 text-xs uppercase tracking-widest text-white/40">
                순번은 하늘이 정한다
              </p>
              <p className="text-base leading-relaxed text-white/70 md:text-lg">
                전통 계의 제비뽑기를 온체인 추첨으로 되살렸습니다. 계주도,
                족보도 순번을 바꿀 수 없습니다. 원하면 계주가 순번을 제안하고
                전원이 지갑으로 서명하는 방식도 선택할 수 있습니다.
              </p>
            </div>
            <div className="my-8 h-px w-full bg-white/10" />
            <div>
              <p className="mb-4 text-xs uppercase tracking-widest text-white/40">
                약속은 보증금이 지킨다
              </p>
              <p className="text-base leading-relaxed text-white/70 md:text-lg">
                먼저 곗돈을 타고 잠적하는 문제, 물레는 보증금으로 풉니다. 미납은
                보증금에서 자동 차감되고, 그마저 바닥나면 남은 사람들에게
                납입액 비례로 정산됩니다. 감정이 아니라 코드가 계를 끝까지
                책임집니다.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
