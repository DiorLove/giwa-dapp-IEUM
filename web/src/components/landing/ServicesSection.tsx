"use client";
import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const EASE = [0.23, 1, 0.32, 1] as const;

const CARDS = [
  {
    video:
      "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4",
    tag: "지금 바로",
    title: "친목계 — 링크 하나로 시작",
    desc: "인원·납입액·주기를 정하고 카톡으로 초대 링크만 보내면 끝. 정원이 차면 온체인 제비뽑기로 순번이 정해지고 물레가 돌기 시작합니다.",
    href: "/app",
    external: false,
  },
  {
    video:
      "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4",
    tag: "로드맵",
    title: "낙찰계 — 온체인 금리 시장",
    desc: "급한 사람은 수수료를 내고 앞 순번을, 여유 있는 사람은 이자를 받으며 뒷 순번을 가져갑니다. 전통 낙찰계를 그대로 옮긴 P2P 금리 시장으로 확장합니다.",
    href: "#roadmap",
    external: false,
  },
];

export function ServicesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="roadmap"
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
            물레가 하는 일
          </h2>
          <p className="hidden text-sm text-white/40 md:block">
            친목계에서 모임금고까지
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {CARDS.map((card, i) => (
            <motion.div
              key={card.title}
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
                    {card.tag}
                  </span>
                  <Link
                    href={card.href}
                    className="liquid-glass glass-hover pressable rounded-full p-2 text-white"
                    aria-label={card.title}
                  >
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
                <h3 className="mb-3 text-xl tracking-tight text-white md:text-2xl">
                  {card.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/50">
                  {card.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <footer className="mt-24 flex flex-col items-center gap-2 text-center">
          <span className="font-display text-2xl italic text-white/60">
            돌려라, 목돈이 온다.
          </span>
          <p className="text-xs text-white/30">
            물레 MULLE · GIWA Sepolia 테스트넷에서 실제로 동작 중 · 모의
            원화(mKRW) 데모
          </p>
        </footer>
      </div>
    </section>
  );
}
