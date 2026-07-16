"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { explorerUrl } from "@/lib/contracts";
import { useLang } from "@/lib/i18n";

const EASE = [0.23, 1, 0.32, 1] as const;
const VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260402_054547_9875cfc5-155a-4229-8ec8-b7ba7125cbf8.mp4";

export function FeaturedVideoSection() {
  const { t } = useLang();
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
              {t("작동 방식", "How it works")}
            </p>
            <p className="text-sm leading-relaxed text-white md:text-base">
              {t(
                "다음 세입자의 전세금이 온체인에 락되면, 정산일에 단 하나의 트랜잭션이 보증금 반환과 잔금 지급을 동시에 실행합니다. 하루가 어긋나 거래가 깨지던 시대를 코드로 끝냅니다.",
                "Once the next tenant's deposit is locked on-chain, a single transaction on settlement day executes the old deposit refund and the landlord's balance simultaneously. Deals no longer break because a date slipped by one day."
              )}
            </p>
          </div>
          <motion.a
            href={explorerUrl("address/0x8a29Eaae4441289482D100aEE428d1DCa99D589c")}
            target="_blank"
            rel="noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="liquid-glass rounded-full px-8 py-3 text-sm font-medium text-white"
          >
            {t("온체인 기록 보기 ↗", "View on-chain ↗")}
          </motion.a>
        </div>
      </motion.div>
    </section>
  );
}
