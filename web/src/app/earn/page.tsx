"use client";
import { useState } from "react";
import { useAccount, usePublicClient, useReadContracts, useWriteContract } from "wagmi";
import { maxUint256, parseUnits } from "viem";
import {
  EARN_ADDRESS,
  METH_ADDRESS,
  MOCKKRW_ADDRESS,
  ORACLE_ADDRESS,
  earnAbi,
  errMsg,
  fmtKRW,
  mockEthAbi,
  mockKrwAbi,
  onlyDigits,
  oracleAbi,
  rayToApy,
  withCommas,
} from "@/lib/contracts";
import { AppNav } from "@/components/AppNav";
import { AnimatedNumber, FadeUp } from "@/components/Motion";
import { GuideSteps } from "@/components/Guide";
import { InfoTip } from "@/components/InfoTip";
import { useLang } from "@/lib/i18n";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

export default function EarnPage() {
  const { t } = useLang();
  const { address: me } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [supplyAmt, setSupplyAmt] = useState("1000000");
  const [collAmt, setCollAmt] = useState("2");
  const [borrowAmt, setBorrowAmt] = useState("500000");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: EARN_ADDRESS, abi: earnAbi, functionName: "supplyRatePerYear" },
      { address: EARN_ADDRESS, abi: earnAbi, functionName: "borrowRatePerYear" },
      { address: EARN_ADDRESS, abi: earnAbi, functionName: "utilization" },
      { address: EARN_ADDRESS, abi: earnAbi, functionName: "totalAssets" },
      { address: EARN_ADDRESS, abi: earnAbi, functionName: "totalBorrows" },
      { address: EARN_ADDRESS, abi: earnAbi, functionName: "supplyValue", args: [me ?? ZERO] },
      { address: EARN_ADDRESS, abi: earnAbi, functionName: "supplyShares", args: [me ?? ZERO] },
      { address: EARN_ADDRESS, abi: earnAbi, functionName: "debtOf", args: [me ?? ZERO] },
      { address: EARN_ADDRESS, abi: earnAbi, functionName: "collateralOf", args: [me ?? ZERO] },
      { address: EARN_ADDRESS, abi: earnAbi, functionName: "collateralValue", args: [me ?? ZERO] },
      { address: EARN_ADDRESS, abi: earnAbi, functionName: "maxBorrow", args: [me ?? ZERO] },
      { address: EARN_ADDRESS, abi: earnAbi, functionName: "healthFactor", args: [me ?? ZERO] },
      { address: MOCKKRW_ADDRESS, abi: mockKrwAbi, functionName: "balanceOf", args: [me ?? ZERO] },
      { address: METH_ADDRESS, abi: mockEthAbi, functionName: "balanceOf", args: [me ?? ZERO] },
      { address: ORACLE_ADDRESS, abi: oracleAbi, functionName: "price" },
      { address: EARN_ADDRESS, abi: earnAbi, functionName: "cash" },
      { address: EARN_ADDRESS, abi: earnAbi, functionName: "bridgeOutstanding" },
    ],
    query: { refetchInterval: 5000 },
  });

  const supplyApy = rayToApy((data?.[0]?.result as bigint | undefined) ?? 0n);
  const borrowApy = rayToApy((data?.[1]?.result as bigint | undefined) ?? 0n);
  const util = Number(((data?.[2]?.result as bigint | undefined) ?? 0n) / 10n ** 21n) / 1e6;
  const totalAssets = (data?.[3]?.result as bigint | undefined) ?? 0n;
  const totalBorrows = (data?.[4]?.result as bigint | undefined) ?? 0n;
  const myValue = (data?.[5]?.result as bigint | undefined) ?? 0n;
  const myShares = (data?.[6]?.result as bigint | undefined) ?? 0n;
  const myDebt = (data?.[7]?.result as bigint | undefined) ?? 0n;
  const myColl = (data?.[8]?.result as bigint | undefined) ?? 0n;
  const myCollValue = (data?.[9]?.result as bigint | undefined) ?? 0n;
  const myMaxBorrow = (data?.[10]?.result as bigint | undefined) ?? 0n;
  const myHf = (data?.[11]?.result as bigint | undefined) ?? 0n;
  const krwBal = (data?.[12]?.result as bigint | undefined) ?? 0n;
  const ethBal = (data?.[13]?.result as bigint | undefined) ?? 0n;
  const price = (data?.[14]?.result as bigint | undefined) ?? 0n;
  const cashAvail = (data?.[15]?.result as bigint | undefined) ?? 0n;
  const bridgeOut = (data?.[16]?.result as bigint | undefined) ?? 0n;
  // 실제 대출 가능액 = min(담보 LTV 한도, 풀 현금)
  const borrowable = myMaxBorrow < cashAvail ? myMaxBorrow : cashAvail;
  const cashLimited = cashAvail < myMaxBorrow;

  const hfNum = myDebt === 0n ? Infinity : Number(myHf) / 1e18;
  const hfLabel = myDebt === 0n ? "—" : hfNum.toFixed(2);
  const hfColor =
    myDebt === 0n ? "text-white" : hfNum < 1.1 ? "text-red-300" : hfNum < 1.5 ? "text-amber-300" : "text-emerald-300";

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

  async function ensureAllowance(token: `0x${string}`, abi: typeof mockKrwAbi, amount: bigint) {
    const allowance = (await publicClient!.readContract({
      address: token,
      abi,
      functionName: "allowance",
      args: [me!, EARN_ADDRESS],
    })) as bigint;
    if (allowance < amount) {
      const h = await writeContractAsync({
        address: token,
        abi,
        functionName: "approve",
        args: [EARN_ADDRESS, maxUint256],
      });
      await publicClient!.waitForTransactionReceipt({ hash: h });
    }
  }

  /** 전송 전 시뮬레이션 → 리버트 사유를 그대로 노출하고, 정확한 가스로 전송
   *  (GIWA RPC의 'gas limit too high' 방지) */
  async function send(functionName: string, args: readonly unknown[]) {
    const { request } = await publicClient!.simulateContract({
      account: me!,
      address: EARN_ADDRESS,
      abi: earnAbi,
      functionName: functionName as never,
      args: args as never,
    });
    return writeContractAsync(request as never);
  }

  const label = "text-xs uppercase tracking-[0.15em] text-white/35";
  const input =
    "h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition-colors [color-scheme:dark] focus:border-white/30";
  const primary = "pressable h-11 w-full rounded-full bg-white text-sm font-semibold text-black disabled:opacity-40";
  const ghost =
    "pressable h-11 w-full rounded-full border border-white/15 text-sm font-semibold text-white transition-colors hover:border-white/30 disabled:opacity-40";

  const priceKRW = fmtKRW(price);

  return (
    <div className="min-h-screen bg-black">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 pb-24 md:px-6">
        <FadeUp className="pt-12 pb-8">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/35">IEUM Earn</p>
          <h1 className="font-display text-4xl tracking-tight text-white md:text-5xl">
            {t("이음 Earn — 예치·대출", "IEUM Earn — Lend & Borrow")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/40">
            {t(
              "mKRW를 예치하면 대출 이자로 실질 연이자(APY)를 받습니다. 집주인은 역전세 부족분 등을 mETH 담보로 대출받습니다. 이자의 일부는 프로토콜 수익이 됩니다.",
              "Supply mKRW to earn real yield from borrower interest. Landlords borrow against mETH collateral (e.g., to cover a reverse-jeonse shortfall). Part of the interest is protocol revenue."
            )}
          </p>
        </FadeUp>

        {/* 마켓 지표 */}
        <FadeUp
          delay={0.06}
          className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] md:grid-cols-4"
        >
          {[
            {
              k: t("예치 APY", "Supply APY"),
              v: `${supplyApy.toFixed(2)}%`,
              accent: true,
              tip: t(
                "예치자가 받는 연이자 추정치. 대출 이자에서 프로토콜 몫을 뺀 값이며, 이용률이 오르면 함께 오릅니다.",
                "Estimated yield to suppliers — borrower interest minus the protocol cut, rising with utilization."
              ),
            },
            {
              k: t("대출 APY", "Borrow APY"),
              v: `${borrowApy.toFixed(2)}%`,
              tip: t(
                "대출자가 내는 연이자. 이용률 기반 2-슬로프 금리로, 이용률이 최적을 넘으면 급등합니다.",
                "Rate borrowers pay — a utilization-based two-slope curve that spikes past the optimal point."
              ),
            },
            {
              k: t("이용률", "Utilization"),
              v: `${(util * 100).toFixed(1)}%`,
              tip: t("총 예치 대비 대출로 나간 비율.", "Share of supplied liquidity currently borrowed."),
            },
            { k: t("총 예치", "Total Supplied"), v: fmtKRW(totalAssets) },
          ].map((s) => (
            <div key={s.k} className="bg-black p-5 md:p-6">
              <p className={`flex items-center gap-1.5 ${label}`}>
                {s.k}
                {s.tip && <InfoTip text={s.tip} />}
              </p>
              <p
                className={`mt-2 text-xl font-medium tabular-nums md:text-2xl ${
                  s.accent ? "text-emerald-300" : "text-white"
                }`}
              >
                {s.v}
              </p>
            </div>
          ))}
        </FadeUp>

        {/* 유동성 사용 내역: 대출 잔액 + 브리지 선지급 */}
        <FadeUp delay={0.08} className="mt-3 flex flex-wrap gap-x-6 gap-y-1 px-1 text-xs text-white/40">
          <span>
            {t("대출 잔액", "Loans out")}{" "}
            <span className="text-white/70 tabular-nums">{fmtKRW(totalBorrows)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            {t("브리지 선지급 중 (상환 예정)", "Bridge advances (receivable)")}{" "}
            <span className="text-sky-300 tabular-nums">{fmtKRW(bridgeOut)}</span>
            <InfoTip
              text={t(
                "전세 정산일 사이 기존 세입자에게 미리 지급된 보증금 합계입니다. 각 에스크로가 정산되면 풀로 자동 상환되고, 수수료(0.5%)는 예치자·프로토콜 수익이 됩니다.",
                "Total deposits advanced to outgoing tenants ahead of settlement. Each escrow repays the pool automatically at settlement; the 0.5% fee is supplier/protocol revenue."
              )}
            />
          </span>
          <span>
            {t("가용 현금", "Available cash")}{" "}
            <span className="text-white/70 tabular-nums">{fmtKRW(cashAvail)}</span>
          </span>
        </FadeUp>

        {/* 내 포지션 */}
        {me && (
          <FadeUp
            delay={0.1}
            className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] md:grid-cols-4"
          >
            {[
              { k: t("내 예치", "Supplied"), v: fmtKRW(myValue), cls: "text-white" },
              { k: t("내 부채", "Borrowed"), v: fmtKRW(myDebt), cls: myDebt > 0n ? "text-amber-300" : "text-white" },
              { k: t("담보 가치", "Collateral"), v: fmtKRW(myCollValue), cls: "text-white" },
              {
                k: t("Health Factor", "Health Factor"),
                v: hfLabel,
                cls: hfColor,
                tip: t(
                  "담보×청산임계÷부채. 1 아래로 내려가면 청산 대상입니다. 담보 가격이 내리거나 부채가 늘면 낮아집니다.",
                  "Collateral × liq. threshold ÷ debt. Below 1 you can be liquidated; it falls if collateral drops or debt grows."
                ),
              },
            ].map((s) => (
              <div key={s.k} className="bg-black p-5 md:p-6">
                <p className={`flex items-center gap-1.5 ${label}`}>
                  {s.k}
                  {s.tip && <InfoTip text={s.tip} />}
                </p>
                <p className={`mt-2 text-lg font-medium tabular-nums md:text-xl ${s.cls}`}>{s.v}</p>
              </div>
            ))}
          </FadeUp>
        )}

        <GuideSteps
          id="earn"
          title={t("이음 Earn, 이렇게 돌아가요", "How IEUM Earn works")}
          steps={[
            {
              t: t("예치로 이자 받기", "Supply to earn"),
              d: t("mKRW를 예치하면 대출자가 내는 이자를 지분만큼 나눠 실질 APY로 받습니다.", "Supply mKRW and earn a share of borrower interest as real APY."),
            },
            {
              t: t("담보 맡기고 대출", "Borrow on collateral"),
              d: t("mETH를 담보로 맡기고 LTV 한도 내에서 mKRW를 빌립니다. 역전세 부족분 조달에 쓰입니다.", "Lock mETH collateral and borrow mKRW within the LTV — e.g., to cover a reverse-jeonse shortfall."),
            },
            {
              t: t("건강하게 유지", "Stay healthy"),
              d: t("담보 가격이 내려 Health Factor가 1 밑으로 가면 청산됩니다. 상환하거나 담보를 더 넣어 방어하세요.", "If collateral falls and Health Factor drops below 1, you're liquidated. Repay or add collateral to defend."),
            },
          ]}
        />

        {/* 액션 */}
        <FadeUp delay={0.16} className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 예치 / 출금 */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-8">
            <div className="flex items-center justify-between">
              <p className={label}>{t("예치 (Supply)", "Supply")}</p>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300 tabular-nums">
                {supplyApy.toFixed(2)}% APY
              </span>
            </div>
            <p className="mt-2 text-sm text-white/40">
              {t("보유 mKRW:", "mKRW:")} <span className="text-white/70 tabular-nums">{fmtKRW(krwBal)}</span>
            </p>
            <div className="relative mt-4">
              <input
                type="text"
                inputMode="numeric"
                value={withCommas(supplyAmt)}
                onChange={(e) => setSupplyAmt(onlyDigits(e.target.value))}
                className={`${input} pr-16`}
              />
              <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-white/35">
                mKRW
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                disabled={!!busy || !me || Number(supplyAmt) <= 0}
                onClick={() =>
                  run("supply", async () => {
                    const amt = parseUnits(supplyAmt || "0", 18);
                    await ensureAllowance(MOCKKRW_ADDRESS, mockKrwAbi, amt);
                    return send("supply", [amt]);
                  })
                }
                className={primary}
              >
                {busy === "supply" ? t("예치 중", "Supplying") : t("예치", "Supply")}
              </button>
              <button
                disabled={!!busy || myShares === 0n}
                onClick={() =>
                  run("withdraw", () =>
                    send("withdraw", [myShares])
                  )
                }
                className={ghost}
              >
                {busy === "withdraw" ? t("출금 중", "…") : t("전량 출금", "Withdraw all")}
              </button>
            </div>
          </div>

          {/* 담보 */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-8">
            <div className="flex items-center justify-between">
              <p className={label}>{t("담보 (Collateral)", "Collateral")}</p>
              <span className="text-[11px] text-white/40 tabular-nums">1 mETH = {priceKRW}</span>
            </div>
            <p className="mt-2 text-sm text-white/40">
              {t("보유 mETH:", "mETH:")}{" "}
              <span className="text-white/70 tabular-nums">{(Number(ethBal) / 1e18).toFixed(3)}</span>
              {" · "}
              {t("예치 담보:", "Locked:")}{" "}
              <span className="text-white/70 tabular-nums">{(Number(myColl) / 1e18).toFixed(3)} mETH</span>
            </p>
            <div className="relative mt-4">
              <input
                type="text"
                inputMode="decimal"
                value={collAmt}
                onChange={(e) => setCollAmt(e.target.value.replace(/[^\d.]/g, ""))}
                className={`${input} pr-16`}
              />
              <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-white/35">
                mETH
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                disabled={!!busy || !me || Number(collAmt) <= 0}
                onClick={() =>
                  run("coll", async () => {
                    const amt = parseUnits(collAmt || "0", 18);
                    await ensureAllowance(METH_ADDRESS, mockKrwAbi, amt);
                    return send("depositCollateral", [amt]);
                  })
                }
                className={primary}
              >
                {busy === "coll" ? t("예치 중", "…") : t("담보 예치", "Deposit")}
              </button>
              <button
                disabled={!!busy || myColl === 0n}
                onClick={() =>
                  run("collw", () => send("withdrawCollateral", [parseUnits(collAmt || "0", 18)]))
                }
                className={ghost}
              >
                {busy === "collw" ? t("출금 중", "…") : t("담보 출금", "Withdraw")}
              </button>
            </div>
          </div>

          {/* 대출 / 상환 */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-8 lg:col-span-2">
            <div className="flex items-center justify-between">
              <p className={label}>{t("대출 / 상환 (Borrow / Repay)", "Borrow / Repay")}</p>
              <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-white/50 tabular-nums">
                {borrowApy.toFixed(2)}% APY
              </span>
            </div>
            <p className="mt-2 text-sm text-white/40">
              {t("대출 가능:", "Available:")}{" "}
              <span className="text-white/70 tabular-nums">{fmtKRW(borrowable)}</span>
              {cashLimited && (
                <span className="ml-1 text-[11px] text-white/30">
                  {cashAvail === 0n
                    ? t(
                        `· 담보 한도 ${fmtKRW(myMaxBorrow)} — 풀에 예치가 없어 대출 불가, 먼저 예치하세요`,
                        `· collateral allows ${fmtKRW(myMaxBorrow)} — pool is empty, supply first`
                      )
                    : t(
                        `· 담보 한도 ${fmtKRW(myMaxBorrow)} (풀 유동성 한도)`,
                        `· collateral allows ${fmtKRW(myMaxBorrow)} (capped by pool cash)`
                      )}
                </span>
              )}
              {myDebt > 0n && (
                <>
                  {" · "}
                  {t("현재 부채:", "Debt:")}{" "}
                  <span className="text-amber-300 tabular-nums">{fmtKRW(myDebt)}</span>
                </>
              )}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={withCommas(borrowAmt)}
                  onChange={(e) => setBorrowAmt(onlyDigits(e.target.value))}
                  className={`${input} pr-16`}
                />
                <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-white/35">
                  mKRW
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={!!busy || !me || Number(borrowAmt) <= 0}
                  onClick={() => run("borrow", () => send("borrow", [parseUnits(borrowAmt || "0", 18)]))}
                  className={primary}
                >
                  {busy === "borrow" ? t("대출 중", "Borrowing") : t("대출", "Borrow")}
                </button>
                <button
                  disabled={!!busy || myDebt === 0n}
                  onClick={() =>
                    run("repay", async () => {
                      await ensureAllowance(MOCKKRW_ADDRESS, mockKrwAbi, maxUint256);
                      return send("repay", [maxUint256]);
                    })
                  }
                  className={ghost}
                >
                  {busy === "repay" ? t("상환 중", "…") : t("전액 상환", "Repay all")}
                </button>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* 테스트 자금 */}
        <FadeUp delay={0.2} className="mt-6 flex flex-wrap items-center gap-3">
          <button
            disabled={!!busy || !me}
            onClick={() => run("mintk", () => writeContractAsync({ address: MOCKKRW_ADDRESS, abi: mockKrwAbi, functionName: "faucet" }))}
            className="pressable rounded-full border border-white/10 px-4 py-2 text-xs text-white/60 transition-colors hover:border-white/25 hover:text-white disabled:opacity-40"
          >
            {busy === "mintk" ? t("발급 중", "…") : t("테스트 mKRW 발급", "Mint mKRW")}
          </button>
          <button
            disabled={!!busy || !me}
            onClick={() => run("minte", () => writeContractAsync({ address: METH_ADDRESS, abi: mockEthAbi, functionName: "faucet" }))}
            className="pressable rounded-full border border-white/10 px-4 py-2 text-xs text-white/60 transition-colors hover:border-white/25 hover:text-white disabled:opacity-40"
          >
            {busy === "minte" ? t("발급 중", "…") : t("테스트 mETH 발급 (담보)", "Mint mETH (collateral)")}
          </button>
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
