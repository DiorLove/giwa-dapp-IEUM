"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAccount } from "wagmi";
import { ArrowUpRight, Fuel, HelpCircle, LayoutGrid, User, Wallet, X } from "lucide-react";
import { useLang, LangToggle } from "@/lib/i18n";
import { OPEN_WALLET_EVENT } from "@/components/ConnectButton";
import { OPEN_TOUR_EVENT } from "@/components/Onboarding";

const EASE = [0.23, 1, 0.32, 1] as const;

export function MobileMenu({
  open,
  onClose,
  links,
}: {
  open: boolean;
  onClose: () => void;
  links: { href: string; label: [string, string] }[];
}) {
  const { t } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function openMyPage() {
    onClose();
    if (isConnected) router.push("/me");
    else window.dispatchEvent(new Event(OPEN_WALLET_EVENT));
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.nav
            className="absolute inset-x-0 top-0 rounded-b-3xl border-b border-white/10 bg-[#0b0b0b] p-5 pt-4 shadow-2xl"
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%", transition: { duration: 0.22, ease: EASE } }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2.5 font-display text-lg tracking-tight text-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="" className="h-6 w-6 rounded-full" />
                이음 <span className="text-white/40">IEUM</span>
              </span>
              <button
                onClick={onClose}
                aria-label={t("메뉴 닫기", "Close menu")}
                className="pressable rounded-full p-1.5 text-white/50 transition-colors hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* 마이페이지 / 지갑 연결 */}
            <button
              onClick={openMyPage}
              className="pressable mb-2 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-left transition-colors hover:border-white/20"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/70">
                {isConnected ? <User size={17} /> : <Wallet size={17} />}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-white">
                  {isConnected ? t("마이페이지", "My Page") : t("지갑 연결", "Connect Wallet")}
                </span>
                <span className="block text-[11px] text-white/40">
                  {isConnected
                    ? t("자산·거래 내역 보기", "Assets & activity")
                    : t("지갑을 연결해 시작하기", "Connect to get started")}
                </span>
              </span>
              <ArrowUpRight size={16} className="text-white/30" />
            </button>

            {/* 내비게이션 */}
            <div className="flex flex-col">
              {links.map((l) => {
                const active = pathname.startsWith(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={onClose}
                    className={`pressable flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] transition-colors ${
                      active ? "bg-white/[0.05] text-white" : "text-white/60 hover:text-white"
                    }`}
                  >
                    <LayoutGrid size={15} className={active ? "text-white/70" : "text-white/30"} />
                    {t(l.label[0], l.label[1])}
                  </Link>
                );
              })}
              <a
                href="https://sepolia-explorer.giwa.io/address/0xeec2bc9B6B9E281b2FafDEB38D40719547a95eC2"
                target="_blank"
                rel="noreferrer"
                onClick={onClose}
                className="pressable flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] text-white/60 transition-colors hover:text-white"
              >
                <ArrowUpRight size={15} className="text-white/30" />
                {t("컨트랙트", "Contracts")}
              </a>
            </div>

            <div className="my-3 h-px bg-white/[0.06]" />

            {/* 유틸리티 */}
            <div className="flex items-center justify-between gap-3">
              <a
                href="https://faucet.giwa.io"
                target="_blank"
                rel="noreferrer"
                onClick={onClose}
                className="pressable flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2.5 text-xs text-white/60 transition-colors hover:border-white/25 hover:text-white"
              >
                <Fuel size={13} />
                {t("가스 받기", "Get Gas")}
              </a>
              <button
                onClick={() => {
                  onClose();
                  window.dispatchEvent(new Event(OPEN_TOUR_EVENT));
                }}
                className="pressable flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2.5 text-xs text-white/60 transition-colors hover:border-white/25 hover:text-white"
              >
                <HelpCircle size={13} />
                {t("사용법", "Guide")}
              </button>
              <LangToggle />
            </div>
          </motion.nav>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
