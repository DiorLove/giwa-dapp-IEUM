"use client";
import { motion } from "framer-motion";
import { explorerUrl } from "@/lib/contracts";
import { useLang } from "@/lib/i18n";

const EASE = [0.23, 1, 0.32, 1] as const;
const VIDEO = "/videos/v2.mp4";

export function FeaturedVideoSection() {
  const { t } = useLang();

  const caption = (
    <>
      <div className="liquid-glass max-w-md rounded-2xl p-5 md:p-8">
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
        className="liquid-glass inline-flex shrink-0 rounded-full px-6 py-3 text-sm font-medium text-white"
      >
        {t("온체인 기록 보기 ↗", "View on-chain ↗")}
      </motion.a>
    </>
  );

  return (
    <section
      id="how"
      className="overflow-hidden bg-black px-4 pt-6 pb-20 md:px-6 md:pt-10 md:pb-32"
    >
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.9, ease: EASE }}
        className="mx-auto max-w-6xl"
      >
        {/* 영상 */}
        <div className="relative aspect-video overflow-hidden rounded-3xl bg-white/[0.03]">
          <video
            src={VIDEO}
            muted
            autoPlay
            loop
            playsInline
            preload="auto"
            className="h-full w-full object-cover"
            onLoadedData={(e) => {
              const v = e.currentTarget;
              v.play().catch(() => {});
            }}
          />
          {/* 데스크톱: 영상 위 오버레이 캡션 */}
          <div className="absolute inset-0 hidden bg-gradient-to-t from-black/60 via-transparent to-transparent md:block" />
          <div className="absolute right-0 bottom-0 left-0 hidden items-end justify-between gap-6 p-10 md:flex">
            {caption}
          </div>
        </div>

        {/* 모바일: 영상 아래에 캡션을 정상 배치 (겹치지 않게) */}
        <div className="mt-4 flex flex-col items-start gap-4 md:hidden">{caption}</div>
      </motion.div>
    </section>
  );
}
