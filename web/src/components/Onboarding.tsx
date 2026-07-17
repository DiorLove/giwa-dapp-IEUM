"use client";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useLang } from "@/lib/i18n";

const STORAGE_KEY = "ieum-tour-v2";
export const OPEN_TOUR_EVENT = "ieum:open-tour";

type Step = {
  /** data-tour 셀렉터 키. 없으면 화면 중앙에 표시 */
  target?: string;
  title: [string, string];
  desc: [string, string];
};

const STEPS: Step[] = [
  {
    title: ["이음에 오신 것을 환영해요", "Welcome to IEUM"],
    desc: [
      "이음은 전세금·곗돈처럼 한국인의 목돈이 움직이는 길을 스마트 컨트랙트로 잇는 온체인 에스크로입니다. 30초만에 핵심 기능을 안내해 드릴게요.",
      "IEUM is an on-chain escrow linking the paths where Korea's big money moves. Here's a 30-second tour of the essentials.",
    ],
  },
  {
    target: "wallet",
    title: ["지갑이 곧 로그인이에요", "Your wallet is your login"],
    desc: [
      "지갑을 연결하면 내가 당사자인 거래만 모아 보여드려요. 모든 서명과 자금은 이 지갑 기준으로 움직입니다.",
      "Connect a wallet to see only the deals you're a party to. Every signature and payment flows through this wallet.",
    ],
  },
  {
    target: "gas",
    title: ["테스트 자금 받기", "Get test funds"],
    desc: [
      "여기서 GIWA Sepolia 가스 ETH를 받고, 대시보드의 '테스트 원화 발급'으로 mKRW ₩10,000,000을 무료로 받으세요. 실제 돈이 아니에요.",
      "Grab GIWA Sepolia gas ETH here, then mint ₩10,000,000 of free mock KRW from the dashboard. It's not real money.",
    ],
  },
  {
    target: "nav-jeonse",
    title: ["전세 에스크로", "Jeonse Escrow"],
    desc: [
      "메인 기능. 신규 세입자의 전세금을 락하고, 정산일에 보증금 반환과 잔금 지급을 한 트랜잭션으로 동시에 실행합니다.",
      "The main product. Lock the incoming deposit, then refund and balance execute simultaneously in one transaction on settlement day.",
    ],
  },
  {
    target: "nav-pool",
    title: ["브리지 풀", "Bridge Pool"],
    desc: [
      "이사 날짜 사이 며칠이 급하면 보증금을 미리 받고(수수료 0.5%), 누구나 예치해서 그 수수료를 수익으로 가져갑니다.",
      "Need the deposit early? The pool advances it (0.5% fee) — and anyone can deposit to earn those fees.",
    ],
  },
  {
    target: "nav-gye",
    title: ["계모임", "Gye Circles"],
    desc: [
      "같은 에스크로 기술로 만든 온체인 계. 초대 링크로 모이고 온체인 제비뽑기로 순번을 정합니다. 이제 직접 써보세요!",
      "Korea's rotating savings on the same escrow tech. Gather via invite link, draw the order on-chain. Now try it yourself!",
    ],
  },
];

const BUBBLE_W = 320;

export function Onboarding() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!localStorage.getItem(STORAGE_KEY)) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const onOpen = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_TOUR_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_TOUR_EVENT, onOpen);
  }, []);

  // 현재 스텝의 타깃 요소 측정 (+리사이즈/스크롤 추적)
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const key = STEPS[step].target;
      if (!key) return setRect(null);
      const el = document.querySelector(`[data-tour="${key}"]`);
      if (!el || (el as HTMLElement).offsetParent === null) return setRect(null);
      setRect(el.getBoundingClientRect());
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step]);

  const close = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!mounted) return null;

  const last = step === STEPS.length - 1;
  const s = STEPS[step];
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  // 말풍선 위치: 타깃 아래(공간 없으면 위), 없으면 중앙
  const PAD = 8;
  const hasTarget = !!rect;
  const placeBelow = hasTarget ? rect!.bottom + 140 < vh : true;
  const bubbleLeft = hasTarget
    ? Math.min(Math.max(rect!.left + rect!.width / 2 - BUBBLE_W / 2, 16), vw - BUBBLE_W - 16)
    : vw / 2 - BUBBLE_W / 2;
  const bubbleTop = hasTarget
    ? placeBelow
      ? rect!.bottom + PAD + 14
      : undefined
    : vh / 2 - 130;
  const bubbleBottom = hasTarget && !placeBelow ? vh - rect!.top + PAD + 14 : undefined;
  const arrowLeft = hasTarget
    ? Math.min(Math.max(rect!.left + rect!.width / 2 - bubbleLeft - 6, 16), BUBBLE_W - 28)
    : undefined;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100]"
          onClick={close}
        >
          {/* 딤 + 스포트라이트 (박스섀도 홀 기법) */}
          {hasTarget ? (
            <motion.div
              animate={{
                top: rect!.top - PAD,
                left: rect!.left - PAD,
                width: rect!.width + PAD * 2,
                height: rect!.height + PAD * 2,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="pointer-events-none fixed rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.75)]"
            />
          ) : (
            <div className="pointer-events-none fixed inset-0 bg-black/75" />
          )}

          {/* 말풍선 */}
          <motion.div
            animate={{
              left: bubbleLeft,
              ...(bubbleTop !== undefined ? { top: bubbleTop } : {}),
              ...(bubbleBottom !== undefined ? { bottom: bubbleBottom } : {}),
            }}
            initial={false}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            style={{ width: BUBBLE_W }}
            className="fixed rounded-2xl border border-white/10 bg-neutral-950 p-6 shadow-2xl shadow-black/80"
          >
            {/* 화살표 */}
            {hasTarget && (
              <div
                style={{ left: arrowLeft }}
                className={`absolute h-3 w-3 rotate-45 border-white/10 bg-neutral-950 ${
                  placeBelow
                    ? "-top-1.5 border-t border-l"
                    : "-bottom-1.5 border-r border-b"
                }`}
              />
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40 tabular-nums">
                {step + 1} / {STEPS.length}
              </span>
              <button
                onClick={close}
                className="pressable text-xs text-white/40 transition-colors hover:text-white"
              >
                {t("건너뛰기", "Skip")}
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.1 } }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="mt-3"
              >
                <h3 className="text-base font-semibold text-white">
                  {t(s.title[0], s.title[1])}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/50">
                  {t(s.desc[0], s.desc[1])}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-5 flex items-center justify-between">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    aria-label={`step ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step ? "w-6 bg-white" : "w-1.5 bg-white/20 hover:bg-white/40"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button
                    onClick={() => setStep((v) => v - 1)}
                    className="pressable rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/60 transition-colors hover:text-white"
                  >
                    {t("이전", "Back")}
                  </button>
                )}
                <button
                  onClick={() => (last ? close() : setStep((v) => v + 1))}
                  className="pressable rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black"
                >
                  {last ? t("시작하기", "Get started") : t("다음", "Next")}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
