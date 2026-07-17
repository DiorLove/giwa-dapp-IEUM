"use client";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useConnect } from "wagmi";
import type { Connector } from "wagmi";
import { ArrowUpRight, ShieldCheck, Wallet, X } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { errMsg } from "@/lib/contracts";

const EASE = [0.23, 1, 0.32, 1] as const;

/** EVM 지원 지갑 목록 — EIP-6963 rdns 로 설치된 익스텐션과 매칭 */
const WALLETS: { name: string; rdns: string[]; url: string; mark: string }[] = [
  { name: "MetaMask", rdns: ["io.metamask", "io.metamask.flask"], url: "https://metamask.io/download", mark: "M" },
  { name: "OKX Wallet", rdns: ["com.okex.wallet"], url: "https://web3.okx.com", mark: "O" },
  { name: "Phantom", rdns: ["app.phantom"], url: "https://phantom.com/download", mark: "P" },
  { name: "Binance Wallet", rdns: ["com.binance.wallet", "com.binance.w3w"], url: "https://www.binance.com/en/web3wallet", mark: "B" },
  { name: "Rabby Wallet", rdns: ["io.rabby"], url: "https://rabby.io", mark: "R" },
  { name: "Rainbow", rdns: ["me.rainbow"], url: "https://rainbow.me", mark: "R" },
];

export function WalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const { connectAsync, connectors } = useConnect();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // EIP-6963 으로 감지된 커넥터를 rdns 기준으로 매칭
  const rows = useMemo(() => {
    const discovered = connectors.filter((c) => c.id !== "injected");
    return WALLETS.map((w) => ({
      ...w,
      connector: discovered.find((c) => w.rdns.includes(c.id)) as Connector | undefined,
    }));
  }, [connectors]);

  // 6개 중 아무것도 못 찾았지만 window.ethereum 은 있는 경우의 폴백
  const generic = connectors.find((c) => c.id === "injected");
  const noneInstalled = rows.every((r) => !r.connector);

  async function pick(connector: Connector, name: string) {
    setBusy(name);
    setError(null);
    try {
      await connectAsync({ connector });
      onClose();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.12 } }}
            transition={{ duration: 0.24, ease: EASE }}
          >
            <button
              onClick={onClose}
              className="pressable absolute top-4 right-4 z-10 rounded-full p-1.5 text-white/40 transition-colors hover:text-white"
              aria-label="close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr]">
              {/* 왼쪽: 지갑 목록 */}
              <div className="p-6 md:p-7">
                <h2 className="font-display text-xl text-white">
                  {t("지갑 연결", "Connect a Wallet")}
                </h2>
                <div className="mt-5 flex flex-col gap-1.5">
                  {rows.map((w, i) => {
                    const installed = !!w.connector;
                    return (
                      <motion.button
                        key={w.name}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 + i * 0.03, duration: 0.25, ease: EASE }}
                        disabled={!!busy}
                        onClick={() =>
                          installed
                            ? pick(w.connector!, w.name)
                            : window.open(w.url, "_blank", "noopener,noreferrer")
                        }
                        className="pressable group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-white/10 hover:bg-white/[0.04] disabled:opacity-40"
                      >
                        {installed && w.connector!.icon ? (
                          // EIP-6963 이 제공하는 지갑 공식 아이콘 (data URI)
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={w.connector!.icon}
                            alt={w.name}
                            className="h-8 w-8 rounded-lg"
                          />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-sm font-bold text-white/50">
                            {w.mark}
                          </span>
                        )}
                        <span className="flex-1">
                          <span className="block text-sm font-semibold text-white">
                            {busy === w.name ? t("연결 중…", "Connecting…") : w.name}
                          </span>
                          {!installed && (
                            <span className="block text-[11px] text-white/35">
                              {t("미설치 — 설치 페이지 열기", "Not installed — open install page")}
                            </span>
                          )}
                        </span>
                        {installed ? (
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                            {t("감지됨", "Detected")}
                          </span>
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        )}
                      </motion.button>
                    );
                  })}

                  {noneInstalled && generic && (
                    <motion.button
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25, duration: 0.25, ease: EASE }}
                      disabled={!!busy}
                      onClick={() => pick(generic, "browser")}
                      className="pressable flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-white/10 hover:bg-white/[0.04] disabled:opacity-40"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                        <Wallet className="h-4 w-4 text-white/50" />
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {busy === "browser"
                          ? t("연결 중…", "Connecting…")
                          : t("브라우저 지갑", "Browser Wallet")}
                      </span>
                    </motion.button>
                  )}
                </div>

                {error && (
                  <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-xs leading-relaxed break-words text-red-300">
                    {error}
                  </p>
                )}
              </div>

              {/* 오른쪽: 지갑 설명 */}
              <div className="hidden flex-col justify-center border-l border-white/[0.06] bg-white/[0.015] p-7 md:flex">
                <h3 className="font-display text-lg text-white/90">
                  {t("지갑이 뭔가요?", "What is a Wallet?")}
                </h3>
                <div className="mt-5 space-y-5">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-white/80">
                      <ShieldCheck className="h-4 w-4 text-white/40" />
                      {t("간편한 로그인", "Easy Login")}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-white/40">
                      {t(
                        "사이트마다 계정과 비밀번호를 만들 필요 없이, 지갑 하나로 연결하면 바로 시작할 수 있습니다.",
                        "No need to create new accounts and passwords for every website. Just connect your wallet and get going."
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-white/80">
                      <Wallet className="h-4 w-4 text-white/40" />
                      {t("자산 보관", "Store your Digital Assets")}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-white/40">
                      {t(
                        "토큰과 온체인 자산을 직접 보관·전송·수령합니다. 이음의 전세금과 곗돈도 지갑으로 관리됩니다.",
                        "Send, receive and store your digital assets. Your IEUM deposits and payouts are managed by your wallet."
                      )}
                    </p>
                  </div>
                </div>
                <p className="mt-6 text-[11px] text-white/25">
                  {t(
                    "EVM 지원 지갑이면 모두 연결할 수 있습니다.",
                    "Any EVM-compatible wallet can connect."
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
