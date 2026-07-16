"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Code2, AtSign, Globe } from "lucide-react";
import { explorerUrl } from "@/lib/contracts";

const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_074625_a81f018a-956b-43fb-9aee-4d1508e30e6a.mp4";

export function Hero() {
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
      <nav className="relative z-20 px-6 py-6">
        <div className="liquid-glass mx-auto flex max-w-5xl items-center justify-between rounded-full px-6 py-3">
          <div className="flex items-center">
            <span className="text-lg font-semibold text-white">🏺 물레</span>
            <div className="ml-8 hidden gap-8 md:flex">
              <a href="#about" className="text-sm font-medium text-white/80 transition-colors hover:text-white">소개</a>
              <a href="#how" className="text-sm font-medium text-white/80 transition-colors hover:text-white">작동 방식</a>
              <a href="#roadmap" className="text-sm font-medium text-white/80 transition-colors hover:text-white">로드맵</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={explorerUrl("address/0x41e70B75eE359A86F54daE3B342C5b876b0Cdd2e")}
              target="_blank"
              rel="noreferrer"
              className="hidden text-sm font-medium text-white/80 transition-colors hover:text-white sm:block"
            >
              컨트랙트
            </a>
            <Link
              href="/app"
              className="liquid-glass glass-hover pressable rounded-full px-6 py-2 text-sm font-medium text-white"
            >
              앱 실행
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero content */}
      <div className="relative z-10 flex flex-1 -translate-y-[12%] flex-col items-center justify-center gap-8 px-6 py-12 text-center">
        <h1 className="font-display text-6xl tracking-tight text-white md:text-8xl lg:text-9xl">
          돌려라, <em className="italic">목돈</em>이 온다
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-white/80 md:text-base">
          800년을 이어온 한국의 저축 문화 &lsquo;계&rsquo;를 GIWA 체인 위에 다시
          지었습니다. 계주 없이, 장부 없이 — 신뢰는 스마트 컨트랙트가 대신합니다.
        </p>
        <div className="flex w-full max-w-xl flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/app"
            className="pressable flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black"
          >
            내 첫 계모임 열기
            <ArrowRight size={18} />
          </Link>
          <a
            href={explorerUrl("address/0x9409Ec65128f5Dd9686F6e739f1520170F87D85A")}
            target="_blank"
            rel="noreferrer"
            className="liquid-glass glass-hover pressable rounded-full px-8 py-3.5 text-sm font-medium text-white"
          >
            완주한 계, 온체인으로 보기
          </a>
        </div>
      </div>

      {/* Socials */}
      <div className="relative z-10 flex justify-center gap-4 pb-12">
        {[
          { Icon: Code2, href: "https://github.com", label: "GitHub" },
          { Icon: AtSign, href: "https://x.com", label: "X" },
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
      </div>
    </section>
  );
}
