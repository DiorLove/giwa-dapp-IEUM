"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Code2, AtSign, Globe } from "lucide-react";
import { explorerUrl } from "@/lib/contracts";
import { LangToggle, useLang } from "@/lib/i18n";

const EASE = [0.23, 1, 0.32, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
const riseBlur = {
  hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: EASE },
  },
};

const HERO_VIDEO = "/videos/v1.mp4";

export function Hero() {
  const { t } = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const fadeTo = (target: number, duration: number, done?: () => void) => {
      cancelAnimationFrame(rafRef.current);
      const from = parseFloat(video.style.opacity || "0");
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        video.style.opacity = String(from + (target - from) * t);
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
        else done?.();
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    const onCanPlay = () => {
      video.play().catch(() => {});
      fadeTo(1, 500);
    };
    const onTimeUpdate = () => {
      if (video.duration && video.duration - video.currentTime <= 0.55) {
        fadeTo(0, 500);
      }
    };
    const onEnded = () => {
      video.style.opacity = "0";
      setTimeout(() => {
        video.currentTime = 0;
        video.play().catch(() => {});
        fadeTo(1, 500);
      }, 100);
    };

    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    return () => {
      cancelAnimationFrame(rafRef.current);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden">
      <video
        ref={videoRef}
        src={HERO_VIDEO}
        muted
        autoPlay
        playsInline
        preload="auto"
        style={{ opacity: 0 }}
        className="absolute inset-0 h-full w-full object-cover object-bottom"
      />
      <div className="absolute inset-0 bg-black/30" />

      {/* Navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="relative z-20 px-6 py-6"
      >
        <div className="liquid-glass mx-auto flex max-w-5xl items-center justify-between rounded-full px-6 py-3">
          <div className="flex items-center">
            <span className="flex items-center gap-2.5 font-display text-lg text-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="h-7 w-7 rounded-full" />
              이음 <span className="text-white/40">IEUM</span>
            </span>
            <div className="ml-8 hidden gap-8 md:flex">
              <a href="#about" className="text-sm font-medium text-white/80 transition-colors hover:text-white">{t("소개", "About")}</a>
              <a href="#how" className="text-sm font-medium text-white/80 transition-colors hover:text-white">{t("작동 방식", "How it works")}</a>
              <a href="#products" className="text-sm font-medium text-white/80 transition-colors hover:text-white">{t("프로덕트", "Products")}</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={explorerUrl("address/0xeec2bc9B6B9E281b2FafDEB38D40719547a95eC2")}
              target="_blank"
              rel="noreferrer"
              className="hidden text-sm font-medium text-white/80 transition-colors hover:text-white sm:block"
            >
              {t("컨트랙트", "Contracts")}
            </a>
            <LangToggle className="hidden sm:flex" />
            <Link
              href="/jeonse"
              className="liquid-glass glass-hover pressable rounded-full px-6 py-2 text-sm font-medium text-white"
            >
              {t("앱 실행", "Launch App")}
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero content */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-1 -translate-y-[12%] flex-col items-center justify-center gap-8 px-6 py-12 text-center"
      >
        <h1 className="font-display text-5xl leading-[1.12] tracking-tight text-white sm:text-6xl md:text-8xl lg:text-9xl">
          <motion.span variants={riseBlur} className="inline-block">
            {t("목돈의", "Big money,")}
          </motion.span>{" "}
          <motion.span variants={riseBlur} className="inline-block">
            {t("길을,", "finally")}
          </motion.span>{" "}
          <motion.span variants={riseBlur} className="inline-block">
            <em className="italic">{t("잇다", "linked")}</em>
          </motion.span>
        </h1>
        <motion.p
          variants={riseBlur}
          className="max-w-lg text-sm leading-relaxed text-white/80 md:text-base"
        >
          {t(
            "전세금 반환, 이사 잔금, 곗돈 — 한국인의 목돈이 움직이는 길을 스마트 컨트랙트로 잇습니다. 날짜가 어긋나도, 사람이 사라져도, 정산은 약속대로 실행됩니다.",
            "Jeonse deposits, moving-day balances, savings circles — IEUM links the paths where Korea's big money moves, with smart contracts. Even when dates slip or people vanish, settlement executes as promised."
          )}
        </motion.p>
        <motion.div
          variants={riseBlur}
          className="flex w-full max-w-xl flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <Link
            href="/jeonse"
            className="cta pressable flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black"
          >
            {t("전세 에스크로 시작하기", "Start a Jeonse Escrow")}
            <ArrowRight size={18} className="cta-arrow" />
          </Link>
          <a
            href={explorerUrl("address/0x8a29Eaae4441289482D100aEE428d1DCa99D589c")}
            target="_blank"
            rel="noreferrer"
            className="liquid-glass glass-hover pressable rounded-full px-8 py-3.5 text-sm font-medium text-white"
          >
            {t("실제 정산 기록, 온체인으로 보기", "See a real settlement on-chain")}
          </a>
        </motion.div>
      </motion.div>

      {/* Socials */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.7, ease: EASE }}
        className="relative z-10 flex justify-center gap-4 pb-12"
      >
        {[
          { Icon: Code2, href: "https://github.com/DiorLove/giwa-dapp-IEUM", label: "GitHub" },
          { Icon: AtSign, href: "https://x.com/IEUM_GIWA", label: "X" },
          { Icon: Globe, href: explorerUrl(""), label: "Explorer" },
        ].map(({ Icon, href, label }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={label}
            className="liquid-glass glass-hover pressable rounded-full p-4 text-white/80 transition-colors hover:text-white"
          >
            <Icon size={20} />
          </a>
        ))}
      </motion.div>
    </section>
  );
}
