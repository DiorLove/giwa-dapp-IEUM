"use client";
import { useState } from "react";
import Link from "next/link";
import { useAccount, useConnect, useReadContract, useReadContracts } from "wagmi";
import { ArrowUpRight, Plus } from "lucide-react";
import {
  JEONSE_FACTORY_ADDRESS,
  BRIDGE_POOL_ADDRESS,
  jeonseFactoryAbi,
  jeonseAbi,
  bridgePoolAbi,
  fmtKRW,
  shortAddr,
} from "@/lib/contracts";
import { AppNav } from "@/components/AppNav";
import { AnimatedNumber, FadeUp } from "@/components/Motion";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

const STATE_META = [
  { label: "자금 대기", cls: "border-amber-400/30 text-amber-300" },
  { label: "락 완료", cls: "border-emerald-400/30 text-emerald-300" },
  { label: "정산 완료", cls: "border-indigo-400/30 text-indigo-300" },
  { label: "취소됨", cls: "border-white/15 text-white/40" },
];

export default function JeonseList() {
  const { address } = useAccount();
  const { connect, connectors } = useConnect();
  const [view, setView] = useState<"mine" | "all">("mine");
  const { data: all } = useReadContract({
    address: JEONSE_FACTORY_ADDRESS,
    abi: jeonseFactoryAbi,
    functionName: "getAll",
    query: { refetchInterval: 5000 },
  });
  const escrows = (all ?? []) as `0x${string}`[];

  const { data: poolAssets } = useReadContract({
    address: BRIDGE_POOL_ADDRESS,
    abi: bridgePoolAbi,
    functionName: "totalAssets",
    query: { refetchInterval: 5000 },
  });

  const { data: infos } = useReadContracts({
    contracts: escrows.flatMap((e) => [
      { address: e, abi: jeonseAbi, functionName: "state" } as const,
      { address: e, abi: jeonseAbi, functionName: "jeonseAmount" } as const,
      { address: e, abi: jeonseAbi, functionName: "refundAmount" } as const,
      { address: e, abi: jeonseAbi, functionName: "settleDate" } as const,
      { address: e, abi: jeonseAbi, functionName: "bridged" } as const,
      { address: e, abi: jeonseAbi, functionName: "landlord" } as const,
      { address: e, abi: jeonseAbi, functionName: "tenantIn" } as const,
      { address: e, abi: jeonseAbi, functionName: "tenantOut" } as const,
    ]),
    query: { enabled: escrows.length > 0 },
  });

  const N = 8;
  const lockedTotal = escrows.reduce((acc, _, i) => {
    const st = infos?.[i * N]?.result as number | undefined;
    const amt = infos?.[i * N + 1]?.result as bigint | undefined;
    return st === 1 ? acc + (amt ?? 0n) : acc;
  }, 0n);

  return (
    <div className="min-h-screen bg-black">
      <AppNav />
      <main className="mx-auto max-w-6xl px-6 pb-24">
        <FadeUp className="flex flex-col gap-6 pt-12 pb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/35">
              Jeonse Escrow
            </p>
            <h1 className="font-display text-4xl tracking-tight text-white md:text-5xl">
              전세 에스크로
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/40">
              다음 세입자의 전세금을 온체인에 락하고, 정산일에 단 한 번의
              트랜잭션으로 보증금 반환과 잔금 지급을 동시에 실행합니다. 이사
              날짜가 어긋나도 거래는 깨지지 않습니다.
            </p>
          </div>
          <Link
            href="/jeonse/create"
            className="pressable inline-flex h-11 items-center gap-2 self-start rounded-full bg-white px-6 text-sm font-semibold text-black md:self-auto"
          >
            <Plus size={16} />
            에스크로 개설
          </Link>
        </FadeUp>

        <FadeUp
          delay={0.08}
          className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-3"
        >
          <div className="bg-black p-6">
            <p className="text-xs uppercase tracking-[0.15em] text-white/35">전체 에스크로</p>
            <p className="mt-2 text-3xl font-medium text-white tabular-nums">
              <AnimatedNumber value={escrows.length} />
            </p>
          </div>
          <div className="bg-black p-6">
            <p className="text-xs uppercase tracking-[0.15em] text-white/35">락 자금 (TVL)</p>
            <p className="mt-2 text-3xl font-medium text-white tabular-nums">
              <AnimatedNumber
                value={Number(lockedTotal / 10n ** 18n)}
                format={(n) => "₩" + n.toLocaleString("ko-KR")}
              />
            </p>
          </div>
          <div className="bg-black p-6">
            <p className="text-xs uppercase tracking-[0.15em] text-white/35">브리지 풀 자산</p>
            <p className="mt-2 text-3xl font-medium text-white tabular-nums">
              <AnimatedNumber
                value={Number(((poolAssets as bigint | undefined) ?? 0n) / 10n ** 18n)}
                format={(n) => "₩" + n.toLocaleString("ko-KR")}
              />
            </p>
          </div>
        </FadeUp>

        <FadeUp delay={0.16} className="mt-14">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-[0.15em] text-white/35">
              에스크로 목록
            </h2>
            <div className="flex items-center rounded-full border border-white/10 p-0.5 text-xs font-medium">
              {(
                [
                  ["mine", "내 거래"],
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
            <div className="hidden grid-cols-[1fr_150px_150px_150px_120px_48px] gap-4 border-b border-white/[0.06] px-6 py-3 text-xs uppercase tracking-[0.12em] text-white/30 md:grid">
              <span>컨트랙트</span>
              <span className="text-right">신규 전세금</span>
              <span className="text-right">반환 보증금</span>
              <span className="text-right">정산일</span>
              <span className="text-right">상태</span>
              <span />
            </div>
            {view === "mine" && !address && (
              <div className="flex flex-col items-center gap-4 px-6 py-16">
                <p className="text-sm text-white/40">
                  지갑을 연결하면 내가 당사자인 거래만 모아서 보여드려요.
                </p>
                <button
                  onClick={() => connect({ connector: connectors[0] })}
                  className="pressable rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black"
                >
                  지갑 연결
                </button>
              </div>
            )}
            {(view === "all" || address) && escrows.length === 0 && (
              <p className="px-6 py-16 text-center text-sm text-white/30">
                아직 개설된 에스크로가 없습니다.
              </p>
            )}
            {(view === "all" || address) &&
              (() => {
                const rows = [...escrows].reverse().filter((e) => {
                  if (view === "all") return true;
                  const base = escrows.indexOf(e) * N;
                  const parties = [
                    infos?.[base + 5]?.result,
                    infos?.[base + 6]?.result,
                    infos?.[base + 7]?.result,
                  ] as (string | undefined)[];
                  return parties.some(
                    (p) => p?.toLowerCase() === address?.toLowerCase()
                  );
                });
                if (view === "mine" && escrows.length > 0 && rows.length === 0)
                  return (
                    <p className="px-6 py-16 text-center text-sm text-white/30">
                      이 지갑이 당사자인 거래가 아직 없어요. 에스크로를
                      개설하거나 전체 탭을 확인해 보세요.
                    </p>
                  );
                return rows.map((e, idx) => {
              const i = escrows.indexOf(e);
              const base = i * N;
              const st = infos?.[base]?.result as number | undefined;
              const jeonse = infos?.[base + 1]?.result as bigint | undefined;
              const refund = infos?.[base + 2]?.result as bigint | undefined;
              const date = infos?.[base + 3]?.result as bigint | undefined;
              const bridged = infos?.[base + 4]?.result as boolean | undefined;
              const parties = [
                infos?.[base + 5]?.result,
                infos?.[base + 6]?.result,
                infos?.[base + 7]?.result,
              ] as (string | undefined)[];
              const mine =
                address && parties.some((p) => p?.toLowerCase() === address.toLowerCase());
              const meta = STATE_META[st ?? 0];
              return (
                <Link
                  key={e}
                  href={`/jeonse/${e}`}
                  style={{ animationDelay: `${Math.min(idx * 40, 320)}ms` }}
                  className="stagger-item group grid grid-cols-2 items-center gap-3 border-b border-white/[0.06] px-6 py-5 transition-colors last:border-b-0 hover:bg-white/[0.03] md:grid-cols-[1fr_150px_150px_150px_120px_48px] md:gap-4"
                >
                  <span className="flex items-center gap-3 font-mono text-sm text-white/70">
                    {shortAddr(e)}
                    {mine && (
                      <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] tracking-wide text-white/50">
                        내 거래
                      </span>
                    )}
                    {bridged && (
                      <span className="rounded-full border border-sky-400/30 px-2 py-0.5 text-[10px] tracking-wide text-sky-300">
                        브리지
                      </span>
                    )}
                  </span>
                  <span className="text-right text-sm font-medium text-white tabular-nums">
                    {fmtKRW(jeonse ?? 0n)}
                  </span>
                  <span className="hidden text-right text-sm text-white/50 tabular-nums md:block">
                    {fmtKRW(refund ?? 0n)}
                  </span>
                  <span className="hidden text-right text-sm text-white/50 tabular-nums md:block">
                    {date ? new Date(Number(date) * 1000).toLocaleDateString("ko-KR") : "—"}
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
                });
              })()}
          </div>
        </FadeUp>
      </main>
    </div>
  );
}
