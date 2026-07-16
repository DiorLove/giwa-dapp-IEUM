"use client";
import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useLang } from "@/lib/i18n";

const EASE = [0.23, 1, 0.32, 1] as const;

const CARDS = [
  {
    video:
      "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4",
    tag: ["메인 프로덕트", "Main Product"],
    title: ["전세 에스크로 — 원자적 연쇄 정산", "Jeonse Escrow — Atomic Chain Settlement"],
    desc: [
      "신규 세입자의 전세금을 락하고, 정산일에 보증금 반환과 잔금 지급을 한 트랜잭션으로 실행합니다. 날짜가 어긋나면 브리지 풀이 그 며칠을 잇습니다.",
      "Lock the incoming tenant's deposit, then execute the refund and the balance in a single transaction on settlement day. When dates misalign, the bridge pool links the gap.",
    ],
    href: "/jeonse",
  },
  {
    video:
      "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4",
    tag: ["에스크로 패밀리", "Escrow Family"],
    title: ["계모임 — 계주 없는 계", "Gye — Savings Circles Without an Organizer"],
    desc: [
      "같은 에스크로 프리미티브로 만든 온체인 계. 온체인 제비뽑기로 순번을 정하고, 미납은 보증금에서 차감하며, 모두가 목돈을 탈 때까지 코드가 계주 역할을 합니다.",
      "Korea's traditional rotating savings, rebuilt on the same escrow primitive. An on-chain lottery sets the order, missed payments are slashed from deposits, and code plays organizer until everyone gets paid.",
    ],
    href: "/app",
  },
];

export function ServicesSection() {
  const { t } = useLang();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="products"
      ref={ref}
      className="relative overflow-hidden bg-black px-6 py-28 md:py-40"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.02)_0%,_transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: EASE }}
          className="mb-12 flex items-end justify-between md:mb-16"
        >
          <h2 className="text-3xl tracking-tight text-white md:text-5xl">
            {t("이음이 하는 일", "What IEUM does")}
          </h2>
          <p className="hidden text-sm text-white/40 md:block">
            {t(
              "전세 정산에서 계모임까지, 하나의 에스크로 프리미티브",
              "From jeonse settlement to savings circles — one escrow primitive"
            )}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {CARDS.map((card, i) => (
            <motion.div
              key={card.title[0]}
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: i * 0.15, ease: EASE }}
              className="liquid-glass group overflow-hidden rounded-3xl"
            >
              <div className="aspect-video overflow-hidden">
                <video
                  src={card.video}
                  muted
                  autoPlay
                  loop
                  playsInline
                  preload="auto"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
              <div className="p-6 md:p-8">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-white/40">
                    {t(card.tag[0], card.tag[1])}
                  </span>
                  <Link
                    href={card.href}
                    className="liquid-glass glass-hover pressable rounded-full p-2 text-white"
                    aria-label={card.title[0]}
                  >
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
                <h3 className="mb-3 text-xl tracking-tight text-white md:text-2xl">
                  {t(card.title[0], card.title[1])}
                </h3>
                <p className="text-sm leading-relaxed text-white/50">
                  {t(card.desc[0], card.desc[1])}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <footer className="mt-24 flex flex-col items-center gap-2 text-center">
          <span className="font-display text-2xl italic text-white/60">
            {t("목돈의 길을, 잇다.", "Big money, finally linked.")}
          </span>
          <p className="text-xs text-white/30">
            {t(
              "이음 IEUM · GIWA Sepolia 테스트넷에서 실제로 동작 중 · 모의 원화(mKRW) 데모",
              "IEUM · Live on GIWA Sepolia testnet · Mock KRW (mKRW) demo"
            )}
          </p>
        </footer>
      </div>
    </section>
  );
}
