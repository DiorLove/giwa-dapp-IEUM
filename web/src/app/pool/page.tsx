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
import { GuideSteps } from "@/components/Guide";
import { InfoTip } from "@/components/InfoTip";
import { useLang } from "@/lib/i18n";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

export default function PoolPage() {
  const { t } = useLang();
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
      <main className="mx-auto max-w-6xl px-4 pb-24 md:px-6">
        <FadeUp className="pt-12 pb-10">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/35">Bridge Pool</p>
          <h1 className="font-display text-4xl tracking-tight text-white md:text-5xl">
            {t("브리지 풀", "Bridge Pool")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/40">
            {t(
              "이사 날짜 사이의 며칠을 잇는 초단기 유동성입니다. 다음 세입자의 전세금이 이미 온체인에 락된 거래에만 선지급하므로, 담보가 눈에 보이는 대출입니다. 선지급 수수료 0.5%가 예치자의 수익이 됩니다.",
              "Ultra-short liquidity that links the days between moving dates. Advances go only to deals where the next tenant's deposit is already locked on-chain — lending with visible collateral. The 0.5% advance fee goes to depositors."
            )}
          </p>
        </FadeUp>

        <FadeUp
          delay={0.08}
          className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-3"
        >
          {[
            {
              k: t("풀 총자산", "Total Pool Assets"),
              v: totalAssets,
              tip: t(
                "모든 예치자의 자금과 쌓인 수수료 수익을 합한 풀 전체 규모입니다.",
                "The pool's total size: every depositor's funds plus accrued fee income."
              ),
            },
            {
              k: t("선지급 중 (상환 예정)", "Advanced (Receivable)"),
              v: outstanding,
              tip: t(
                "지금 세입자들에게 미리 나가 있는 보증금 총액입니다. 각 에스크로가 정산되면 풀로 자동 상환됩니다.",
                "Refunds currently advanced to tenants. Each escrow automatically repays the pool at settlement."
              ),
            },
            {
              k: t("내 예치 가치", "My Deposit Value"),
              v: myValue,
              tip: t(
                "내 지분을 지금 출금하면 받게 될 금액입니다. 수수료 수익이 쌓일수록 예치 원금보다 커집니다.",
                "What you'd receive if you withdrew now. It grows past your principal as fee income accrues."
              ),
            },
          ].map((s) => (
            <div key={s.k} className="bg-black p-5 md:p-6">
              <p className={`flex items-center gap-1.5 ${label}`}>
                {s.k}
                <InfoTip text={s.tip} />
              </p>
              <p className="mt-2 text-2xl font-medium text-white tabular-nums md:text-3xl">
                <AnimatedNumber
                  value={Number(s.v / 10n ** 18n)}
                  format={(n) => "₩" + n.toLocaleString("ko-KR")}
                />
              </p>
            </div>
          ))}
        </FadeUp>

        {/* First-timer guide */}
        <GuideSteps
          id="pool"
          title={t("브리지 풀, 이렇게 돌아가요", "How the Bridge Pool works")}
          steps={[
            {
              t: t("mKRW 예치", "Deposit mKRW"),
              d: t(
                "풀에 예치하면 지분이 생기고, 풀의 수익을 지분만큼 나눠 갖습니다.",
                "Depositing gives you shares — you earn the pool's income in proportion."
              ),
            },
            {
              t: t("보증금 선지급", "Advance refunds"),
              d: t(
                "풀은 다음 세입자의 전세금이 이미 락된 안전한 거래에만 보증금을 선지급하고 0.5% 수수료를 받습니다.",
                "The pool advances refunds only on deals whose next deposit is already locked, earning a 0.5% fee."
              ),
            },
            {
              t: t("언제든 출금", "Withdraw anytime"),
              d: t(
                "선지급 중이 아닌 유동성은 언제든 현재 지분 가치로 출금할 수 있습니다.",
                "Liquidity not out on advances can be withdrawn anytime at current share value."
              ),
            },
          ]}
        />

        <FadeUp delay={0.16} className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-8">
            <p className={label}>{t("예치", "Deposit")}</p>
            <p className="mt-2 text-sm text-white/40">
              {t("보유 mKRW:", "mKRW balance:")}{" "}
              <span className="text-white/70 tabular-nums">{fmtKRW(myBalance)}</span>
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
                  if (myBalance < amt) {
                    throw new Error(
                      t(
                        `mKRW 잔액이 부족합니다 — 필요 ${fmtKRW(amt)}, 보유 ${fmtKRW(myBalance)}.`,
                        `Insufficient mKRW — need ${fmtKRW(amt)}, you have ${fmtKRW(myBalance)}.`
                      )
                    );
                  }
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
              {busy === "deposit" ? t("예치 중", "Depositing") : t("풀에 예치", "Deposit to Pool")}
            </button>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-8">
            <p className={label}>{t("출금", "Withdraw")}</p>
            <p className="mt-2 text-sm leading-relaxed text-white/40">
              {t(
                "내 지분 전량을 현재 가치로 출금합니다. 선지급 중인 유동성은 정산이 끝나야 출금할 수 있습니다.",
                "Withdraw all your shares at current value. Liquidity out on advances becomes withdrawable after settlement."
              )}
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
              {busy === "withdraw" ? t("출금 중", "Withdrawing") : t("전량 출금", "Withdraw All")}
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
