"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  useAccount,
  useDisconnect,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import {
  ArrowUpRight,
  Check,
  Coins,
  Copy,
  LogOut,
  Receipt,
  Users,
} from "lucide-react";
import {
  BRIDGE_POOL_ADDRESS,
  FACTORY_ADDRESS,
  JEONSE_FACTORY_ADDRESS,
  LEGACY_FACTORY_ADDRESS,
  LEGACY_JEONSE_FACTORY_ADDRESS,
  MOCKKRW_ADDRESS,
  bridgePoolAbi,
  explorerUrl,
  factoryAbi,
  fmtKRW,
  jeonseAbi,
  jeonseFactoryAbi,
  mockKrwAbi,
  mulleAbi,
  shortAddr,
} from "@/lib/contracts";
import { useLang } from "@/lib/i18n";

export const OPEN_MYPAGE_EVENT = "ieum:open-mypage";
const EASE = [0.23, 1, 0.32, 1] as const;
const ZERO = "0x0000000000000000000000000000000000000000" as const;

const CIRCLE_STATE: [string, string][] = [
  ["모집 중", "Recruiting"],
  ["진행 중", "Active"],
  ["완주", "Completed"],
  ["종료", "Closed"],
];
const ESCROW_STATE: [string, string][] = [
  ["자금 대기", "Awaiting"],
  ["락 완료", "Funded"],
  ["정산 완료", "Settled"],
  ["취소됨", "Cancelled"],
];

export function MyPage() {
  const { t } = useLang();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { writeContract, isPending: minting } = useWriteContract();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_MYPAGE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_MYPAGE_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const me = address ?? ZERO;
  const active = open && isConnected;

  // 1단계: 팩토리 목록 + 풀/잔액
  const { data: base, refetch: refetchBase } = useReadContracts({
    contracts: [
      { address: FACTORY_ADDRESS, abi: factoryAbi, functionName: "getAll" },
      { address: LEGACY_FACTORY_ADDRESS, abi: factoryAbi, functionName: "getAll" },
      { address: JEONSE_FACTORY_ADDRESS, abi: jeonseFactoryAbi, functionName: "getAll" },
      { address: LEGACY_JEONSE_FACTORY_ADDRESS, abi: jeonseFactoryAbi, functionName: "getAll" },
      { address: BRIDGE_POOL_ADDRESS, abi: bridgePoolAbi, functionName: "totalAssets" },
      { address: BRIDGE_POOL_ADDRESS, abi: bridgePoolAbi, functionName: "totalShares" },
      { address: BRIDGE_POOL_ADDRESS, abi: bridgePoolAbi, functionName: "shares", args: [me] },
      { address: MOCKKRW_ADDRESS, abi: mockKrwAbi, functionName: "balanceOf", args: [me] },
    ],
    query: { enabled: active, refetchInterval: active ? 5000 : undefined },
  });

  const circles = [
    ...(((base?.[1]?.result as `0x${string}`[]) ?? []) as `0x${string}`[]),
    ...(((base?.[0]?.result as `0x${string}`[]) ?? []) as `0x${string}`[]),
  ];
  const escrows = [
    ...(((base?.[3]?.result as `0x${string}`[]) ?? []) as `0x${string}`[]),
    ...(((base?.[2]?.result as `0x${string}`[]) ?? []) as `0x${string}`[]),
  ];
  const totalAssets = (base?.[4]?.result as bigint | undefined) ?? 0n;
  const totalShares = (base?.[5]?.result as bigint | undefined) ?? 0n;
  const myShares = (base?.[6]?.result as bigint | undefined) ?? 0n;
  const balance = (base?.[7]?.result as bigint | undefined) ?? 0n;
  const poolValue = totalShares > 0n ? (myShares * totalAssets) / totalShares : 0n;

  // 2단계: 계모임별 (isMember, contribution, state, claimable)
  const { data: cInfos } = useReadContracts({
    contracts: circles.flatMap((m) => [
      { address: m, abi: mulleAbi, functionName: "isMember", args: [me] } as const,
      { address: m, abi: mulleAbi, functionName: "contribution" } as const,
      { address: m, abi: mulleAbi, functionName: "state" } as const,
      { address: m, abi: mulleAbi, functionName: "claimable", args: [me] } as const,
    ]),
    query: { enabled: active && circles.length > 0 },
  });

  // 2단계: 전세별 (landlord, tenantIn, tenantOut, jeonseAmount, state, claimable)
  const { data: eInfos } = useReadContracts({
    contracts: escrows.flatMap((e) => [
      { address: e, abi: jeonseAbi, functionName: "landlord" } as const,
      { address: e, abi: jeonseAbi, functionName: "tenantIn" } as const,
      { address: e, abi: jeonseAbi, functionName: "tenantOut" } as const,
      { address: e, abi: jeonseAbi, functionName: "jeonseAmount" } as const,
      { address: e, abi: jeonseAbi, functionName: "state" } as const,
      { address: e, abi: jeonseAbi, functionName: "claimable", args: [me] } as const,
    ]),
    query: { enabled: active && escrows.length > 0 },
  });

  const lower = address?.toLowerCase();
  const myCircles = circles
    .map((m, i) => ({
      addr: m,
      isMember: cInfos?.[i * 4]?.result as boolean | undefined,
      contribution: (cInfos?.[i * 4 + 1]?.result as bigint | undefined) ?? 0n,
      state: (cInfos?.[i * 4 + 2]?.result as number | undefined) ?? 0,
      claimable: (cInfos?.[i * 4 + 3]?.result as bigint | undefined) ?? 0n,
    }))
    .filter((c) => c.isMember)
    .reverse();

  const myEscrows = escrows
    .map((e, i) => {
      const parties = [
        eInfos?.[i * 6]?.result,
        eInfos?.[i * 6 + 1]?.result,
        eInfos?.[i * 6 + 2]?.result,
      ] as (string | undefined)[];
      return {
        addr: e,
        mine: parties.some((p) => p?.toLowerCase() === lower),
        amount: (eInfos?.[i * 6 + 3]?.result as bigint | undefined) ?? 0n,
        state: (eInfos?.[i * 6 + 4]?.result as number | undefined) ?? 0,
        claimable: (eInfos?.[i * 6 + 5]?.result as bigint | undefined) ?? 0n,
      };
    })
    .filter((e) => e.mine)
    .reverse();

  const claimableTotal =
    myCircles.reduce((a, c) => a + c.claimable, 0n) +
    myEscrows.reduce((a, e) => a + e.claimable, 0n);

  async function copy() {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  if (!mounted) return null;

  const close = () => setOpen(false);
  const label = "text-xs uppercase tracking-[0.15em] text-white/35";

  return createPortal(
    <AnimatePresence>
      {open && isConnected && address && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.22, ease: EASE }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
          <motion.div
            className="relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0b0b0b] shadow-2xl sm:rounded-3xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.2, ease: EASE } }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <div className="overflow-y-auto p-6 pb-8">
              <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/15 sm:hidden" />

              {/* 지갑 헤더 */}
              <div className="flex items-center gap-4">
                <span
                  className="h-12 w-12 shrink-0 rounded-full ring-1 ring-white/10"
                  style={{
                    background:
                      "conic-gradient(from 140deg, #f5c451, #b07c2b, #f5c451, #d9a441)",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                    {t("마이페이지", "My Page")}
                  </p>
                  <p className="truncate font-mono text-lg text-white">{shortAddr(address)}</p>
                </div>
                <button
                  onClick={copy}
                  aria-label={t("주소 복사", "Copy address")}
                  className="pressable shrink-0 rounded-full border border-white/10 p-2 text-white/50 transition-colors hover:border-white/25 hover:text-white"
                >
                  {copied ? <Check size={15} className="text-emerald-300" /> : <Copy size={15} />}
                </button>
              </div>

              {/* 자산 요약 */}
              <p className={`mt-7 flex items-center gap-1.5 ${label}`}>
                <Coins size={12} />
                {t("내 자산", "My Assets")}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06]">
                <div className="col-span-2 bg-black p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">{t("mKRW 잔액", "mKRW Balance")}</span>
                    <button
                      disabled={minting}
                      onClick={() =>
                        writeContract(
                          { address: MOCKKRW_ADDRESS, abi: mockKrwAbi, functionName: "faucet" },
                          { onSuccess: () => setTimeout(() => refetchBase(), 2000) }
                        )
                      }
                      className="pressable rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-medium text-white/60 transition-colors hover:border-white/30 hover:text-white disabled:opacity-40"
                    >
                      {minting ? t("발급 중", "Minting") : t("테스트 발급", "Mint")}
                    </button>
                  </div>
                  <p className="mt-1.5 text-2xl font-medium text-white tabular-nums">
                    {fmtKRW(balance)}
                  </p>
                </div>
                <div className="bg-black p-4">
                  <span className="text-xs text-white/40">{t("브리지 예치", "Pool Deposit")}</span>
                  <p className="mt-1.5 text-lg font-medium text-white tabular-nums">
                    {fmtKRW(poolValue)}
                  </p>
                </div>
                <div className="bg-black p-4">
                  <span className="text-xs text-white/40">{t("수령 가능", "Claimable")}</span>
                  <p
                    className={`mt-1.5 text-lg font-medium tabular-nums ${
                      claimableTotal > 0n ? "text-emerald-300" : "text-white"
                    }`}
                  >
                    {fmtKRW(claimableTotal)}
                  </p>
                </div>
              </div>

              {/* 내 계모임 */}
              <p className={`mt-7 flex items-center gap-1.5 ${label}`}>
                <Users size={12} />
                {t("참여 중인 계모임", "My Circles")}
                <span className="text-white/25">{myCircles.length}</span>
              </p>
              <div className="mt-3 flex flex-col gap-1.5">
                {myCircles.length === 0 && (
                  <p className="rounded-xl border border-white/[0.06] bg-white/[0.01] px-4 py-3 text-xs text-white/30">
                    {t("참여 중인 계가 없습니다.", "No circles yet.")}
                  </p>
                )}
                {myCircles.slice(0, 4).map((c) => (
                  <Link
                    key={c.addr}
                    href={`/g/${c.addr}`}
                    onClick={close}
                    className="pressable flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/15"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="font-mono text-xs text-white/60">{shortAddr(c.addr)}</span>
                      <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/40">
                        {t(CIRCLE_STATE[c.state][0], CIRCLE_STATE[c.state][1])}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {c.claimable > 0n && (
                        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          {fmtKRW(c.claimable)}
                        </span>
                      )}
                      <span className="text-xs text-white/40 tabular-nums">
                        {fmtKRW(c.contribution)}
                      </span>
                      <ArrowUpRight size={13} className="text-white/25" />
                    </span>
                  </Link>
                ))}
                {myCircles.length > 4 && (
                  <Link
                    href="/app"
                    onClick={close}
                    className="pressable px-4 py-2 text-center text-xs text-white/40 hover:text-white"
                  >
                    {t(`+${myCircles.length - 4}개 더 보기`, `+${myCircles.length - 4} more`)}
                  </Link>
                )}
              </div>

              {/* 내 전세 거래 */}
              <p className={`mt-7 flex items-center gap-1.5 ${label}`}>
                <Receipt size={12} />
                {t("내 전세 거래", "My Jeonse Deals")}
                <span className="text-white/25">{myEscrows.length}</span>
              </p>
              <div className="mt-3 flex flex-col gap-1.5">
                {myEscrows.length === 0 && (
                  <p className="rounded-xl border border-white/[0.06] bg-white/[0.01] px-4 py-3 text-xs text-white/30">
                    {t("당사자인 거래가 없습니다.", "No deals yet.")}
                  </p>
                )}
                {myEscrows.slice(0, 4).map((e) => (
                  <Link
                    key={e.addr}
                    href={`/jeonse/${e.addr}`}
                    onClick={close}
                    className="pressable flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/15"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="font-mono text-xs text-white/60">{shortAddr(e.addr)}</span>
                      <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/40">
                        {t(ESCROW_STATE[e.state][0], ESCROW_STATE[e.state][1])}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {e.claimable > 0n && (
                        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          {fmtKRW(e.claimable)}
                        </span>
                      )}
                      <span className="text-xs text-white/40 tabular-nums">{fmtKRW(e.amount)}</span>
                      <ArrowUpRight size={13} className="text-white/25" />
                    </span>
                  </Link>
                ))}
                {myEscrows.length > 4 && (
                  <Link
                    href="/jeonse"
                    onClick={close}
                    className="pressable px-4 py-2 text-center text-xs text-white/40 hover:text-white"
                  >
                    {t(`+${myEscrows.length - 4}건 더 보기`, `+${myEscrows.length - 4} more`)}
                  </Link>
                )}
              </div>

              {/* 지갑 액션 */}
              <div className="mt-7 flex flex-col gap-2">
                <a
                  href={explorerUrl(`address/${address}`)}
                  target="_blank"
                  rel="noreferrer"
                  className="pressable flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-white/80 transition-colors hover:border-white/20"
                >
                  <ArrowUpRight size={16} className="text-white/40" />
                  {t("익스플로러에서 보기", "View on explorer")}
                </a>
                <button
                  onClick={() => {
                    disconnect();
                    close();
                  }}
                  className="pressable flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm font-semibold text-red-300 transition-colors hover:bg-red-400/10"
                >
                  <LogOut size={16} />
                  {t("연결 해제", "Disconnect")}
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
