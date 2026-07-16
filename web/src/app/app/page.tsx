"use client";
import { useState } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { ArrowUpRight, Plus } from "lucide-react";
import {
  FACTORY_ADDRESS,
  MOCKKRW_ADDRESS,
  factoryAbi,
  mockKrwAbi,
  mulleAbi,
  fmtKRW,
  shortAddr,
} from "@/lib/contracts";
import { AppNav } from "@/components/AppNav";
import { AnimatedNumber, FadeUp } from "@/components/Motion";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

const STATE_META = [
  { label: "모집 중", cls: "border-amber-400/30 text-amber-300" },
  { label: "진행 중", cls: "border-emerald-400/30 text-emerald-300" },
  { label: "완주", cls: "border-indigo-400/30 text-indigo-300" },
  { label: "종료", cls: "border-white/15 text-white/40" },
];

export default function AppHome() {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [view, setView] = useState<"mine" | "all">("mine");

  const { data: all } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "getAll",
    query: { refetchInterval: 5000 },
  });
  const mulles = (all ?? []) as `0x${string}`[];

  const { data: balance, refetch } = useReadContract({
    address: MOCKKRW_ADDRESS,
    abi: mockKrwAbi,
    functionName: "balanceOf",
    args: [address ?? ZERO],
    query: { enabled: !!address, refetchInterval: 4000 },
  });

  const { data: infos } = useReadContracts({
    contracts: mulles.flatMap((m) => [
      { address: m, abi: mulleAbi, functionName: "state" } as const,
      { address: m, abi: mulleAbi, functionName: "contribution" } as const,
      { address: m, abi: mulleAbi, functionName: "memberCount" } as const,
      { address: m, abi: mulleAbi, functionName: "maxMembers" } as const,
      { address: m, abi: mulleAbi, functionName: "isMember", args: [address ?? ZERO] } as const,
    ]),
    query: { enabled: mulles.length > 0 },
  });

  const myCount =
    infos?.reduce((acc, _, idx) => (idx % 5 === 4 && infos[idx]?.result ? acc + 1 : acc), 0) ?? 0;

  return (
    <div className="min-h-screen bg-black">
      <AppNav />

      <main className="mx-auto max-w-6xl px-6 pb-24">
        {/* Page head */}
        <FadeUp className="flex flex-col gap-6 pt-12 pb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/35">Dashboard</p>
            <h1 className="font-display text-4xl tracking-tight text-white md:text-5xl">
              계모임
            </h1>
          </div>
          <Link
            href="/create"
            className="pressable inline-flex h-11 items-center gap-2 self-start rounded-full bg-white px-6 text-sm font-semibold text-black md:self-auto"
          >
            <Plus size={16} />
            새 계모임 개설
          </Link>
        </FadeUp>

        {/* Stats strip */}
        <FadeUp
          delay={0.08}
          className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-3"
        >
          <div className="bg-black p-6 transition-colors hover:bg-white/[0.02]">
            <p className="text-xs uppercase tracking-[0.15em] text-white/35">전체 계</p>
            <p className="mt-2 text-3xl font-medium text-white tabular-nums">
              <AnimatedNumber value={mulles.length} />
            </p>
          </div>
          <div className="bg-black p-6 transition-colors hover:bg-white/[0.02]">
            <p className="text-xs uppercase tracking-[0.15em] text-white/35">내 참여</p>
            <p className="mt-2 text-3xl font-medium text-white tabular-nums">
              {address ? <AnimatedNumber value={myCount} /> : "—"}
            </p>
          </div>
          <div className="bg-black p-6 transition-colors hover:bg-white/[0.02]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-white/35">mKRW 잔액</p>
                <p className="mt-2 text-3xl font-medium text-white tabular-nums">
                  {address ? (
                    <AnimatedNumber
                      value={Number((balance ?? 0n) / 10n ** 18n)}
                      format={(n) => "₩" + n.toLocaleString("ko-KR")}
                    />
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              {address && (
                <button
                  disabled={isPending}
                  onClick={() =>
                    writeContract(
                      { address: MOCKKRW_ADDRESS, abi: mockKrwAbi, functionName: "faucet" },
                      { onSuccess: () => setTimeout(() => refetch(), 2000) }
                    )
                  }
                  className="pressable rounded-full border border-white/15 px-4 py-1.5 text-xs font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white disabled:opacity-40"
                >
                  {isPending ? "발급 중" : "테스트 원화 발급"}
                </button>
              )}
            </div>
          </div>
        </FadeUp>

        {/* Kye table */}
        <FadeUp delay={0.16} className="mt-14">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-[0.15em] text-white/35">계 목록</h2>
            <div className="flex items-center rounded-full border border-white/10 p-0.5 text-xs font-medium">
              {(
                [
                  ["mine", "내 계"],
                  ["all", "전체"],
                ] as const
              ).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`pressable rounded-full px-4 py-1.5 transition-colors ${
                    view === v ? "bg-white text-black" : "text-white/40 hover:text-white"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
            <div className="hidden grid-cols-[1fr_140px_140px_120px_48px] gap-4 border-b border-white/[0.06] px-6 py-3 text-xs uppercase tracking-[0.12em] text-white/30 md:grid">
              <span>컨트랙트</span>
              <span className="text-right">회당 납입</span>
              <span className="text-right">인원</span>
              <span className="text-right">상태</span>
              <span />
            </div>

            {mulles.length === 0 && (
              <p className="px-6 py-16 text-center text-sm text-white/30">
                아직 개설된 계가 없습니다. 첫 계를 열어보세요.
              </p>
            )}

            {view === "mine" && !address && mulles.length > 0 && (
              <p className="px-6 py-16 text-center text-sm text-white/30">
                지갑을 연결하면 내가 참여 중인 계만 모아서 보여드려요.
              </p>
            )}

            {[...mulles]
              .reverse()
              .filter((m) => {
                if (view === "all") return true;
                if (!address) return false;
                return infos?.[mulles.indexOf(m) * 5 + 4]?.result === true;
              })
              .map((m, idx) => {
              const i = mulles.indexOf(m);
              const base = i * 5;
              const state = infos?.[base]?.result as number | undefined;
              const contribution = infos?.[base + 1]?.result as bigint | undefined;
              const memberCount = infos?.[base + 2]?.result as bigint | undefined;
              const maxMembers = infos?.[base + 3]?.result as number | undefined;
              const mine = infos?.[base + 4]?.result as boolean | undefined;
              const meta = STATE_META[state ?? 0];
              return (
                <Link
                  key={m}
                  href={`/g/${m}`}
                  style={{ animationDelay: `${Math.min(idx * 40, 320)}ms` }}
                  className="stagger-item group grid grid-cols-2 items-center gap-3 border-b border-white/[0.06] px-6 py-5 transition-colors last:border-b-0 hover:bg-white/[0.03] md:grid-cols-[1fr_140px_140px_120px_48px] md:gap-4"
                >
                  <span className="flex items-center gap-3 font-mono text-sm text-white/70">
                    {shortAddr(m)}
                    {mine && (
                      <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] tracking-wide text-white/50">
                        참여 중
                      </span>
                    )}
                  </span>
                  <span className="text-right text-sm font-medium text-white tabular-nums">
                    {fmtKRW(contribution ?? 0n)}
                  </span>
                  <span className="hidden text-right text-sm text-white/50 tabular-nums md:block">
                    {String(memberCount ?? 0)} / {maxMembers ?? 0}
                  </span>
                  <span className="hidden text-right md:block">
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </span>
                  <span className="hidden justify-self-end text-white/25 transition-all group-hover:translate-x-0.5 group-hover:text-white/60 md:block">
                    <ArrowUpRight size={16} />
                  </span>
                </Link>
              );
              })}
          </div>
        </FadeUp>

        <p className="mt-12 text-xs leading-relaxed text-white/25">
          GIWA Sepolia 테스트넷에서 동작하는 데모입니다. 납입 통화는 모의
          원화(mKRW)이며, 상단에서 무료로 발급받을 수 있습니다.
        </p>
      </main>
    </div>
  );
}
