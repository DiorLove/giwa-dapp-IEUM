"use client";
import { use, useState } from "react";
import { useAccount, usePublicClient, useReadContracts, useWriteContract } from "wagmi";
import { keccak256, maxUint256, toBytes } from "viem";
import { ArrowUpRight, FileCheck } from "lucide-react";
import {
  BRIDGE_POOL_ADDRESS,
  MOCKKRW_ADDRESS,
  bridgePoolAbi,
  errMsg,
  explorerUrl,
  fmtKRW,
  jeonseAbi,
  mockKrwAbi,
  shortAddr,
} from "@/lib/contracts";
import { AppNav } from "@/components/AppNav";
import { FadeUp, SwapIn } from "@/components/Motion";
import { giwaSepolia } from "@/lib/chain";

const ZERO = "0x0000000000000000000000000000000000000000" as const;
const STATE_LABEL = ["자금 대기", "락 완료", "정산 완료", "취소됨"];
const STATE_CLS = [
  "border-amber-400/30 text-amber-300",
  "border-emerald-400/30 text-emerald-300",
  "border-indigo-400/30 text-indigo-300",
  "border-white/15 text-white/40",
];

export default function JeonseDetail({ params }: { params: Promise<{ address: string }> }) {
  const { address: escAddr } = use(params);
  const esc = escAddr as `0x${string}`;
  const { address: me, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [docLabel, setDocLabel] = useState("");

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: esc, abi: jeonseAbi, functionName: "state" },
      { address: esc, abi: jeonseAbi, functionName: "landlord" },
      { address: esc, abi: jeonseAbi, functionName: "tenantIn" },
      { address: esc, abi: jeonseAbi, functionName: "tenantOut" },
      { address: esc, abi: jeonseAbi, functionName: "jeonseAmount" },
      { address: esc, abi: jeonseAbi, functionName: "refundAmount" },
      { address: esc, abi: jeonseAbi, functionName: "settleDate" },
      { address: esc, abi: jeonseAbi, functionName: "bridged" },
      { address: esc, abi: jeonseAbi, functionName: "claimable", args: [me ?? ZERO] },
      { address: esc, abi: jeonseAbi, functionName: "documentCount" },
      { address: esc, abi: jeonseAbi, functionName: "cancelApproved", args: [me ?? ZERO] },
    ],
    query: { refetchInterval: 4000 },
  });

  const state = data?.[0]?.result as number | undefined;
  const landlord = data?.[1]?.result as string | undefined;
  const tenantIn = data?.[2]?.result as string | undefined;
  const tenantOut = data?.[3]?.result as string | undefined;
  const jeonse = (data?.[4]?.result as bigint | undefined) ?? 0n;
  const refund = (data?.[5]?.result as bigint | undefined) ?? 0n;
  const settleDate = Number((data?.[6]?.result as bigint | undefined) ?? 0n);
  const bridged = data?.[7]?.result as boolean | undefined;
  const claimable = (data?.[8]?.result as bigint | undefined) ?? 0n;
  const docCount = Number((data?.[9]?.result as bigint | undefined) ?? 0n);
  const iApprovedCancel = data?.[10]?.result as boolean | undefined;

  const docsQuery = useReadContracts({
    contracts: Array.from({ length: docCount }, (_, i) => ({
      address: esc,
      abi: jeonseAbi,
      functionName: "documents" as const,
      args: [BigInt(i)] as const,
    })),
    query: { enabled: docCount > 0 },
  });

  async function run(name: string, fn: () => Promise<`0x${string}`>) {
    setBusy(name);
    setError(null);
    try {
      const hash = await fn();
      await publicClient!.waitForTransactionReceipt({ hash });
      await refetch();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  if (!data)
    return (
      <div className="min-h-screen bg-black">
        <AppNav />
        <main className="mx-auto max-w-6xl px-6">
          <div className="pt-12 pb-10">
            <div className="skeleton mb-3 h-4 w-24" />
            <div className="skeleton h-12 w-72" />
          </div>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px]">
            <div className="skeleton h-72 w-full" />
            <div className="skeleton h-56 w-full" />
          </div>
        </main>
      </div>
    );

  const meL = me?.toLowerCase();
  const isLandlord = meL === landlord?.toLowerCase();
  const isTenantIn = meL === tenantIn?.toLowerCase();
  const isTenantOut = meL === tenantOut?.toLowerCase();
  const isParty = isLandlord || isTenantIn || isTenantOut;
  const now = Math.floor(Date.now() / 1000);
  const canSettle = state === 1 && now >= settleDate;
  const label = "text-xs uppercase tracking-[0.15em] text-white/35";
  const primaryBtn =
    "pressable h-12 w-full rounded-full text-sm font-semibold disabled:opacity-40";

  const parties = [
    { role: "집주인", addr: landlord, meFlag: isLandlord, gets: `차액 ${fmtKRW(jeonse - refund)}` },
    { role: "신규 세입자", addr: tenantIn, meFlag: isTenantIn, gets: `전세금 ${fmtKRW(jeonse)} 락` },
    { role: "기존 세입자", addr: tenantOut, meFlag: isTenantOut, gets: `보증금 ${fmtKRW(refund)} 수령` },
  ];

  return (
    <div className="min-h-screen bg-black">
      <AppNav />
      <main className="mx-auto max-w-6xl px-6 pb-24">
        <FadeUp className="flex flex-col gap-4 pt-12 pb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/35">
              전세 에스크로
              <span
                className={`rounded-full border px-2.5 py-0.5 normal-case tracking-normal ${STATE_CLS[state ?? 0]}`}
              >
                {STATE_LABEL[state ?? 0]}
              </span>
              {bridged && (
                <span className="rounded-full border border-sky-400/30 px-2.5 py-0.5 normal-case tracking-normal text-sky-300">
                  브리지 선지급됨
                </span>
              )}
            </p>
            <h1 className="font-display text-4xl tracking-tight text-white md:text-5xl">
              {fmtKRW(jeonse)}
            </h1>
            <p className="mt-2 text-sm text-white/40">
              정산일 {new Date(settleDate * 1000).toLocaleString("ko-KR")}
            </p>
          </div>
          <a
            href={explorerUrl(`address/${esc}`)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 self-start text-sm text-white/40 transition-colors hover:text-white md:self-auto"
          >
            <span className="font-mono">{shortAddr(esc)}</span>
            <ArrowUpRight size={14} />
          </a>
        </FadeUp>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px]">
          <FadeUp delay={0.08} className="flex flex-col gap-10">
            {/* 정산 구조 시각화 */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-8">
              <p className={`${label} mb-6`}>원자적 연쇄 정산 구조</p>
              <div className="flex flex-col gap-3">
                {parties.map((p) => (
                  <div
                    key={p.role}
                    className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${
                      p.meFlag ? "border-white/30 bg-white/[0.04]" : "border-white/[0.06]"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {p.role} {p.meFlag && <span className="text-white/40">— 나</span>}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-white/35">
                        {p.addr ? shortAddr(p.addr) : "—"}
                      </p>
                    </div>
                    <span className="text-sm text-white/60 tabular-nums">{p.gets}</span>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-xs leading-relaxed text-white/30">
                정산일에 누구든 정산을 실행하면 세 몫이 한 트랜잭션에서 동시에
                확정됩니다. 중간에 돈을 쥐는 사람이 없습니다.
              </p>
            </div>

            {/* 문서 앵커 */}
            <section>
              <h2 className={`${label} mb-4`}>문서 앵커 — 서류 하이패스</h2>
              <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
                {docCount === 0 && (
                  <p className="px-6 py-10 text-center text-sm text-white/30">
                    아직 앵커된 문서가 없습니다.
                  </p>
                )}
                {docsQuery.data?.map((d, i) => {
                  const doc = d.result as
                    | readonly [`0x${string}`, string, `0x${string}`, bigint]
                    | undefined;
                  if (!doc) return null;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4 last:border-b-0"
                    >
                      <span className="flex items-center gap-3 text-sm text-white/70">
                        <FileCheck size={15} className="text-emerald-300/70" />
                        {doc[1]}
                        <span className="font-mono text-xs text-white/25">
                          {doc[0].slice(0, 10)}…
                        </span>
                      </span>
                      <span className="text-xs text-white/30">
                        {shortAddr(doc[2])} ·{" "}
                        {new Date(Number(doc[3]) * 1000).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  );
                })}
                {isParty && state !== 2 && state !== 3 && (
                  <div className="flex gap-2 border-t border-white/[0.06] p-4">
                    <input
                      value={docLabel}
                      onChange={(e) => setDocLabel(e.target.value)}
                      placeholder="문서 이름 (예: 전세계약서)"
                      className="h-10 flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-white/30"
                    />
                    <button
                      disabled={!!busy || !docLabel}
                      onClick={() =>
                        run("anchor", () =>
                          writeContractAsync({
                            address: esc,
                            abi: jeonseAbi,
                            functionName: "anchorDocument",
                            args: [
                              keccak256(toBytes(`${docLabel}:${Date.now()}`)),
                              docLabel,
                            ],
                          })
                        )
                      }
                      className="pressable rounded-lg border border-white/15 px-4 text-xs font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white disabled:opacity-40"
                    >
                      {busy === "anchor" ? "앵커 중" : "해시 앵커"}
                    </button>
                  </div>
                )}
              </div>
            </section>
          </FadeUp>

          {/* 액션 패널 */}
          <FadeUp
            delay={0.16}
            className="flex h-fit flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 lg:sticky lg:top-24"
          >
            <p className={`${label} mb-4`}>액션</p>
            <SwapIn
              id={`${state}-${bridged}-${canSettle}-${claimable > 0n}-${chainId}-${me}`}
              className="flex flex-col gap-4"
            >
              {me && chainId !== giwaSepolia.id && (
                <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-center text-sm text-amber-300">
                  지갑을 GIWA Sepolia로 전환해 주세요.
                </p>
              )}
              {!me && (
                <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-white/40">
                  지갑을 연결하면 거래에 참여할 수 있습니다
                </p>
              )}

              {state === 0 && isTenantIn && (
                <button
                  disabled={!!busy}
                  className={`${primaryBtn} bg-white text-black`}
                  onClick={() =>
                    run("fund", async () => {
                      const allowance = (await publicClient!.readContract({
                        address: MOCKKRW_ADDRESS,
                        abi: mockKrwAbi,
                        functionName: "allowance",
                        args: [me!, esc],
                      })) as bigint;
                      if (allowance < jeonse) {
                        const h = await writeContractAsync({
                          address: MOCKKRW_ADDRESS,
                          abi: mockKrwAbi,
                          functionName: "approve",
                          args: [esc, maxUint256],
                        });
                        await publicClient!.waitForTransactionReceipt({ hash: h });
                      }
                      return writeContractAsync({
                        address: esc,
                        abi: jeonseAbi,
                        functionName: "fund",
                      });
                    })
                  }
                >
                  {busy === "fund" ? "락 처리 중" : `전세금 락 — ${fmtKRW(jeonse)}`}
                </button>
              )}
              {state === 0 && !isTenantIn && me && (
                <p className="text-sm leading-relaxed text-white/40">
                  신규 세입자의 전세금 락을 기다리는 중입니다.
                </p>
              )}

              {state === 1 && isTenantOut && !bridged && (
                <div className="flex flex-col gap-3">
                  <button
                    disabled={!!busy}
                    className={`${primaryBtn} bg-sky-400 text-black`}
                    onClick={() =>
                      run("bridge", () =>
                        writeContractAsync({
                          address: BRIDGE_POOL_ADDRESS,
                          abi: bridgePoolAbi,
                          functionName: "bridge",
                          args: [esc],
                        })
                      )
                    }
                  >
                    {busy === "bridge"
                      ? "선지급 처리 중"
                      : `보증금 미리 받기 — ${fmtKRW((refund * 9950n) / 10000n)}`}
                  </button>
                  <p className="text-xs leading-relaxed text-white/30">
                    다음 세입자의 전세금이 이미 락되어 있으므로, 브리지 풀이
                    보증금을 즉시 선지급합니다 (수수료 0.5%). 정산일에 풀이
                    자동으로 상환받습니다.
                  </p>
                </div>
              )}

              {canSettle && (
                <button
                  disabled={!!busy}
                  className={`${primaryBtn} bg-emerald-400 text-black`}
                  onClick={() =>
                    run("settle", () =>
                      writeContractAsync({ address: esc, abi: jeonseAbi, functionName: "settle" })
                    )
                  }
                >
                  {busy === "settle" ? "정산 중" : "연쇄 정산 실행 — 한 트랜잭션"}
                </button>
              )}
              {state === 1 && !canSettle && (
                <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm leading-relaxed text-emerald-300">
                  전세금 {fmtKRW(jeonse)}이 락되었습니다. 정산일이 되면 누구나
                  정산을 실행할 수 있습니다.
                </p>
              )}

              {claimable > 0n && (
                <button
                  disabled={!!busy}
                  className={`${primaryBtn} bg-white text-black`}
                  onClick={() =>
                    run("claim", () =>
                      writeContractAsync({ address: esc, abi: jeonseAbi, functionName: "claim" })
                    )
                  }
                >
                  {busy === "claim" ? "수령 중" : `${fmtKRW(claimable)} 수령`}
                </button>
              )}

              {state === 1 && (isLandlord || isTenantIn) && !bridged && (
                <button
                  disabled={!!busy || iApprovedCancel}
                  className={`${primaryBtn} border border-white/15 text-white/70 hover:border-white/30`}
                  onClick={() =>
                    run("cancel", () =>
                      writeContractAsync({ address: esc, abi: jeonseAbi, functionName: "cancel" })
                    )
                  }
                >
                  {iApprovedCancel
                    ? "취소 동의 완료 — 상대방 대기"
                    : busy === "cancel"
                      ? "처리 중"
                      : "상호 취소 동의"}
                </button>
              )}
              {state === 0 && isLandlord && (
                <button
                  disabled={!!busy}
                  className={`${primaryBtn} border border-white/15 text-white/70 hover:border-white/30`}
                  onClick={() =>
                    run("cancel", () =>
                      writeContractAsync({ address: esc, abi: jeonseAbi, functionName: "cancel" })
                    )
                  }
                >
                  {busy === "cancel" ? "처리 중" : "에스크로 취소"}
                </button>
              )}

              {state === 2 && claimable === 0n && (
                <p className="rounded-xl border border-indigo-400/20 bg-indigo-400/5 p-4 text-center text-sm text-indigo-300">
                  정산이 완료된 에스크로입니다.
                </p>
              )}
              {state === 3 && (
                <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-white/40">
                  취소된 에스크로입니다.
                </p>
              )}

              {error && (
                <p className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-xs leading-relaxed break-words text-red-300">
                  {error}
                </p>
              )}
            </SwapIn>
          </FadeUp>
        </div>
      </main>
    </div>
  );
}
