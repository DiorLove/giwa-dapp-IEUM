"use client";
import { useState } from "react";
import { useAccount, usePublicClient, useReadContracts, useWriteContract } from "wagmi";
import { maxUint256, parseUnits } from "viem";
import {
  BRIDGE_POOL_ADDRESS,
  MOCKKRW_ADDRESS,
  bridgePoolAbi,
  errMsg,
  fmtKRW,
  mockKrwAbi,
} from "@/lib/contracts";
import { AppNav } from "@/components/AppNav";
import { AnimatedNumber, FadeUp } from "@/components/Motion";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

export default function PoolPage() {
  const { address: me } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [amount, setAmount] = useState("1000000");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: BRIDGE_POOL_ADDRESS, abi: bridgePoolAbi, functionName: "totalAssets" },
      { address: BRIDGE_POOL_ADDRESS, abi: bridgePoolAbi, functionName: "totalOutstanding" },
      { address: BRIDGE_POOL_ADDRESS, abi: bridgePoolAbi, functionName: "totalShares" },
      { address: BRIDGE_POOL_ADDRESS, abi: bridgePoolAbi, functionName: "shares", args: [me ?? ZERO] },
      { address: MOCKKRW_ADDRESS, abi: mockKrwAbi, functionName: "balanceOf", args: [me ?? ZERO] },
    ],
    query: { refetchInterval: 5000 },
  });

  const totalAssets = (data?.[0]?.result as bigint | undefined) ?? 0n;
  const outstanding = (data?.[1]?.result as bigint | undefined) ?? 0n;
  const totalShares = (data?.[2]?.result as bigint | undefined) ?? 0n;
  const myShares = (data?.[3]?.result as bigint | undefined) ?? 0n;
  const myBalance = (data?.[4]?.result as bigint | undefined) ?? 0n;
  const myValue = totalShares > 0n ? (myShares * totalAssets) / totalShares : 0n;

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

  const label = "text-xs uppercase tracking-[0.15em] text-white/35";
  const input =
    "h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition-colors [color-scheme:dark] focus:border-white/30";

  return (
    <div className="min-h-screen bg-black">
      <AppNav />
      <main className="mx-auto max-w-6xl px-6 pb-24">
        <FadeUp className="pt-12 pb-10">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/35">Bridge Pool</p>
          <h1 className="font-display text-4xl tracking-tight text-white md:text-5xl">
            브리지 풀
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/40">
            이사 날짜 사이의 며칠을 잇는 초단기 유동성입니다. 다음 세입자의
            전세금이 이미 온체인에 락된 거래에만 선지급하므로, 담보가 눈에
            보이는 대출입니다. 선지급 수수료 0.5%가 예치자의 수익이 됩니다.
          </p>
        </FadeUp>

        <FadeUp
          delay={0.08}
          className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-3"
        >
          {[
            { k: "풀 총자산", v: totalAssets },
            { k: "선지급 중 (상환 예정)", v: outstanding },
            { k: "내 예치 가치", v: myValue },
          ].map((s) => (
            <div key={s.k} className="bg-black p-6">
              <p className={label}>{s.k}</p>
              <p className="mt-2 text-3xl font-medium text-white tabular-nums">
                <AnimatedNumber
                  value={Number(s.v / 10n ** 18n)}
                  format={(n) => "₩" + n.toLocaleString("ko-KR")}
                />
              </p>
            </div>
          ))}
        </FadeUp>

        <FadeUp delay={0.16} className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8">
            <p className={label}>예치</p>
            <p className="mt-2 text-sm text-white/40">
              보유 mKRW: <span className="text-white/70 tabular-nums">{fmtKRW(myBalance)}</span>
            </p>
            <div className="relative mt-5">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${input} pr-16`}
              />
              <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-white/35">
                mKRW
              </span>
            </div>
            <button
              disabled={!!busy || !me || Number(amount) <= 0}
              onClick={() =>
                run("deposit", async () => {
                  const amt = parseUnits(amount, 18);
                  const allowance = (await publicClient!.readContract({
                    address: MOCKKRW_ADDRESS,
                    abi: mockKrwAbi,
                    functionName: "allowance",
                    args: [me!, BRIDGE_POOL_ADDRESS],
                  })) as bigint;
                  if (allowance < amt) {
                    const h = await writeContractAsync({
                      address: MOCKKRW_ADDRESS,
                      abi: mockKrwAbi,
                      functionName: "approve",
                      args: [BRIDGE_POOL_ADDRESS, maxUint256],
                    });
                    await publicClient!.waitForTransactionReceipt({ hash: h });
                  }
                  return writeContractAsync({
                    address: BRIDGE_POOL_ADDRESS,
                    abi: bridgePoolAbi,
                    functionName: "deposit",
                    args: [amt],
                  });
                })
              }
              className="pressable mt-5 h-12 w-full rounded-full bg-white text-sm font-semibold text-black disabled:opacity-40"
            >
              {busy === "deposit" ? "예치 중" : "풀에 예치"}
            </button>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8">
            <p className={label}>출금</p>
            <p className="mt-2 text-sm leading-relaxed text-white/40">
              내 지분 전량을 현재 가치로 출금합니다. 선지급 중인 유동성은
              정산이 끝나야 출금할 수 있습니다.
            </p>
            <p className="mt-5 text-2xl font-medium text-white tabular-nums">
              {fmtKRW(myValue)}
            </p>
            <button
              disabled={!!busy || myShares === 0n}
              onClick={() =>
                run("withdraw", () =>
                  writeContractAsync({
                    address: BRIDGE_POOL_ADDRESS,
                    abi: bridgePoolAbi,
                    functionName: "withdraw",
                    args: [myShares],
                  })
                )
              }
              className="pressable mt-5 h-12 w-full rounded-full border border-white/15 text-sm font-semibold text-white transition-colors hover:border-white/30 disabled:opacity-40"
            >
              {busy === "withdraw" ? "출금 중" : "전량 출금"}
            </button>
          </div>
        </FadeUp>

        {error && (
          <p className="mt-6 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-xs leading-relaxed break-words text-red-300">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
