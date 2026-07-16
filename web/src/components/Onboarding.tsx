"use client";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftRight, Coins, FileCheck, Landmark, Users, X } from "lucide-react";
import { useLang } from "@/lib/i18n";

const EASE = [0.23, 1, 0.32, 1] as const;
const STORAGE_KEY = "ieum-tour-v1";
export const OPEN_TOUR_EVENT = "ieum:open-tour";

const STEPS = [
  {
    Icon: Landmark,
    title: ["이음에 오신 것을 환영해요", "Welcome to IEUM"],
    desc: [
      "이음은 전세금·곗돈처럼 한국인의 목돈이 움직이는 길을 스마트 컨트랙트로 잇는 온체인 에스크로입니다. 돈은 사람이 아니라 코드가 보관하고, 약속된 날에 자동으로 정산됩니다.",
      "IEUM is an on-chain escrow that links the paths where Korea's big money moves — jeonse deposits, savings circles. Code holds the money, not people, and settlement executes automatically on the promised day.",
    ],
  },
  {
    Icon: Coins,
    title: ["먼저 테스트 자금을 받으세요", "Get test funds first"],
    desc: [
      "① 우측 상단 '가스 받기'에서 GIWA Sepolia ETH(수수료용)를 받고 ② 대시보드의 '테스트 원화 발급' 버튼으로 모의 원화 mKRW ₩10,000,000을 무료로 받으세요. 실제 돈이 아니니 마음껏 써도 됩니다.",
      "① Get GIWA Sepolia ETH for gas via 'Get Gas' in the top bar, then ② mint ₩10,000,000 of mock KRW (mKRW) for free from the dashboard. It's not real money — experiment freely.",
    ],
  },
  {
    Icon: ArrowLeftRight,
    title: ["전세 에스크로 — 원자적 연쇄 정산", "Jeonse Escrow — atomic settlement"],
    desc: [
      "집주인이 에스크로를 개설하고 신규 세입자가 전세금을 락하면, 정산일에 단 하나의 트랜잭션이 기존 세입자 보증금 반환과 집주인 차액 수령을 동시에 실행합니다. 날짜가 어긋나도 거래는 깨지지 않아요.",
      "The landlord opens an escrow and the incoming tenant locks the deposit. On settlement day, one transaction refunds the outgoing tenant and pays the landlord's balance — simultaneously. Deals no longer break over dates.",
    ],
  },
  {
    Icon: FileCheck,
    title: ["브리지 풀 — 며칠의 공백을 잇다", "Bridge Pool — linking the gap"],
    desc: [
      "정산일 전에 보증금이 급하다면? 다음 세입자의 돈이 이미 락된 걸 컨트랙트가 확인한 뒤 풀이 즉시 선지급합니다(수수료 0.5%). 누구나 풀에 예치해서 그 수수료를 수익으로 받을 수 있어요.",
      "Need your deposit before settlement day? Once the contract confirms the next tenant's funds are locked, the pool advances it instantly (0.5% fee). Anyone can deposit into the pool and earn those fees.",
    ],
  },
  {
    Icon: Users,
    title: ["계모임 — 계주 없는 계", "Gye — savings circles without an organizer"],
    desc: [
      "같은 에스크로 기술로 만든 온체인 계. 초대 링크로 모이고, 온체인 제비뽑기로 순번을 정하고, 매 회차 자동으로 곗돈이 지급됩니다. 이제 직접 써보세요!",
      "Korea's rotating savings, built on the same escrow tech. Gather via invite link, draw the payout order with an on-chain lottery, and get paid automatically each round. Now try it yourself!",
    ],
  },
];

export function Onboarding() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!localStorage.getItem(STORAGE_KEY)) {
      const timer = setTimeout(() => setOpen(true), 600);
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

  const last = step === STEPS.length - 1;
  const { Icon, title, desc } = STEPS[step];

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.15 } }}
            transition={{ duration: 0.35, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 p-8 shadow-2xl shadow-black/80"
          >
            {/* 상단 글로우 */}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40 tabular-nums">
                  {step + 1} / {STEPS.length}
                </span>
                <button
                  onClick={close}
                  className="pressable rounded-full p-1.5 text-white/40 transition-colors hover:text-white"
                  aria-label="닫기"
                >
                  <X size={16} />
                </button>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 24, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -16, filter: "blur(4px)", transition: { duration: 0.12 } }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="mt-6 min-h-[190px]"
                >
                  <div className="mb-5 inline-flex rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-emerald-300">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {t(title[0], title[1])}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/50">
                    {t(desc[0], desc[1])}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex gap-1.5">
                  {STEPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setStep(i)}
                      aria-label={`${i + 1}단계`}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === step ? "w-6 bg-white" : "w-1.5 bg-white/20 hover:bg-white/40"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {!last && (
                    <button
                      onClick={close}
                      className="pressable rounded-full px-4 py-2 text-xs text-white/40 transition-colors hover:text-white"
                    >
                      {t("건너뛰기", "Skip")}
                    </button>
                  )}
                  <button
                    onClick={() => (last ? close() : setStep((s) => s + 1))}
                    className="pressable rounded-full bg-white px-5 py-2 text-xs font-semibold text-black"
                  >
                    {last ? t("시작하기", "Get started") : t("다음", "Next")}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
