"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { parseUnits, decodeEventLog, isAddress } from "viem";
import { JEONSE_FACTORY_ADDRESS, errMsg, jeonseFactoryAbi } from "@/lib/contracts";
import { AppNav } from "@/components/AppNav";
import { InfoTip } from "@/components/InfoTip";
import { FadeUp } from "@/components/Motion";
import { useLang } from "@/lib/i18n";

export default function JeonseCreate() {
  const { t } = useLang();
  const router = useRouter();
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [tenantIn, setTenantIn] = useState("");
  const [tenantOut, setTenantOut] = useState("");
  const [jeonse, setJeonse] = useState("300000000");
  const [refund, setRefund] = useState("280000000");
  const [settleDate, setSettleDate] = useState("");
  const [demo10min, setDemo10min] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateInFuture =
    demo10min ||
    (!!settleDate && new Date(settleDate).getTime() > Date.now() + 60_000);
  const valid =
    isAddress(tenantIn) &&
    isAddress(tenantOut) &&
    Number(jeonse) > 0 &&
    Number(refund) >= 0 &&
    Number(refund) <= Number(jeonse) &&
    dateInFuture;

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const ts = demo10min
        ? BigInt(Math.floor(Date.now() / 1000) + 600)
        : BigInt(Math.floor(new Date(settleDate).getTime() / 1000));
      if (!demo10min && Number(ts) * 1000 <= Date.now() + 60_000) {
        setError(
          t(
            "정산일이 과거이거나 너무 가깝습니다. 미래 시각을 선택해 주세요.",
            "Settlement date is in the past or too soon. Pick a future time."
          )
        );
        setBusy(false);
        return;
      }
      const args = [
        tenantIn as `0x${string}`,
        tenantOut as `0x${string}`,
        parseUnits(jeonse, 18),
        parseUnits(refund, 18),
        ts,
      ] as const;
      // 사전 시뮬레이션: 리버트 사유를 가스 오류 대신 그대로 노출
      await publicClient!.simulateContract({
        account: address,
        address: JEONSE_FACTORY_ADDRESS,
        abi: jeonseFactoryAbi,
        functionName: "createEscrow",
        args,
      });
      const hash = await writeContractAsync({
        address: JEONSE_FACTORY_ADDRESS,
        abi: jeonseFactoryAbi,
        functionName: "createEscrow",
        args,
      });
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      for (const log of receipt.logs) {
        try {
          const ev = decodeEventLog({ abi: jeonseFactoryAbi, ...log });
          if (ev.eventName === "EscrowCreated") {
            router.push(`/jeonse/${(ev.args as { escrow: string }).escrow}`);
            return;
          }
        } catch {}
      }
      router.push("/jeonse");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const label = "text-xs uppercase tracking-[0.15em] text-white/35";
  const input =
    "h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition-colors [color-scheme:dark] focus:border-white/30";
  const landlordDiff = Math.max(Number(jeonse || 0) - Number(refund || 0), 0);

  return (
    <div className="min-h-screen bg-black">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 pb-24 md:px-6">
        <FadeUp className="pt-12 pb-10">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/35">New Escrow</p>
          <h1 className="font-display text-4xl tracking-tight text-white md:text-5xl">
            {t("전세 에스크로 개설", "Create Jeonse Escrow")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/40">
            {t(
              "집주인이 개설합니다. 신규 세입자가 전세금을 락하면, 정산일에 기존 세입자 보증금 반환과 집주인 차액 수령이 한 트랜잭션으로 동시에 실행됩니다.",
              "Opened by the landlord. Once the incoming tenant locks the deposit, the outgoing tenant's refund and the landlord's balance execute simultaneously in one transaction on settlement day."
            )}
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
          <FadeUp delay={0.08} className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <span className={label}>{t("신규 세입자 주소 — 전세금을 납입할 사람", "Incoming tenant address — pays the deposit")}</span>
              <input
                value={tenantIn}
                onChange={(e) => setTenantIn(e.target.value.trim())}
                placeholder="0x…"
                suppressHydrationWarning
                className={`${input} font-mono`}
              />
            </div>
            <div className="flex flex-col gap-3">
              <span className={label}>{t("기존 세입자 주소 — 보증금을 돌려받을 사람", "Outgoing tenant address — receives the refund")}</span>
              <input
                value={tenantOut}
                onChange={(e) => setTenantOut(e.target.value.trim())}
                placeholder="0x…"
                suppressHydrationWarning
                className={`${input} font-mono`}
              />
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-3">
                <span className={label}>{t("신규 전세금", "New jeonse deposit")}</span>
                <div className="relative">
                  <input
                    type="number"
                    value={jeonse}
                    onChange={(e) => setJeonse(e.target.value)}
                    className={`${input} pr-16`}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-white/35">
                    mKRW
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <span className={label}>{t("반환할 기존 보증금", "Old deposit to refund")}</span>
                <div className="relative">
                  <input
                    type="number"
                    value={refund}
                    onChange={(e) => setRefund(e.target.value)}
                    className={`${input} pr-16`}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-white/35">
                    mKRW
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <span className={`flex items-center gap-1.5 ${label}`}>
                {t("정산일 (입주일)", "Settlement date (move-in day)")}
                <InfoTip
                  text={t(
                    "이 시각이 지나면 누구나 정산을 실행할 수 있고, 보증금 반환과 잔금 지급이 동시에 확정됩니다. 보통 이사(입주) 날짜로 설정해요.",
                    "After this time, anyone can trigger settlement — refund and balance finalize together. Usually set to the move-in date."
                  )}
                />
              </span>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={() => setDemo10min(true)}
                  className={`pressable rounded-xl border px-5 py-3 text-sm transition-colors ${
                    demo10min
                      ? "border-white/40 bg-white/[0.06] text-white"
                      : "border-white/10 text-white/50 hover:border-white/20"
                  }`}
                >
                  {t("10분 뒤 — 데모용", "In 10 minutes — demo")}
                </button>
                <input
                  type="datetime-local"
                  value={settleDate}
                  onChange={(e) => {
                    setSettleDate(e.target.value);
                    setDemo10min(false);
                  }}
                  className={`${input} sm:flex-1 ${demo10min ? "opacity-40" : ""}`}
                />
              </div>
              {!demo10min && settleDate && !dateInFuture && (
                <span className="text-xs text-amber-300">
                  {t(
                    "정산일은 미래 시각이어야 합니다.",
                    "Settlement date must be in the future."
                  )}
                </span>
              )}
            </div>
            {error && (
              <p className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-xs leading-relaxed break-words text-red-300">
                {error}
              </p>
            )}
          </FadeUp>

          <FadeUp
            delay={0.16}
            className="h-fit rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-8 lg:sticky lg:top-24"
          >
            <p className={label}>{t("정산 구조", "Settlement structure")}</p>
            <dl className="mt-6 flex flex-col gap-4 border-b border-white/[0.06] pb-6">
              <div className="flex items-baseline justify-between">
                <dt className="text-sm text-white/40">{t("신규 세입자 락", "Incoming tenant locks")}</dt>
                <dd className="text-xl font-medium text-white tabular-nums">
                  ₩{Number(jeonse || 0).toLocaleString("ko-KR")}
                </dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-sm text-white/40">{t("기존 세입자 반환", "Outgoing tenant refund")}</dt>
                <dd className="text-sm text-white/70 tabular-nums">
                  ₩{Number(refund || 0).toLocaleString("ko-KR")}
                </dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-sm text-white/40">{t("집주인 차액 수령", "Landlord receives balance")}</dt>
                <dd className="text-sm text-white/70 tabular-nums">
                  ₩{landlordDiff.toLocaleString("ko-KR")}
                </dd>
              </div>
            </dl>
            <button
              onClick={create}
              disabled={busy || !valid}
              className="pressable mt-6 h-12 w-full rounded-full bg-white text-sm font-semibold text-black disabled:opacity-40"
            >
              {busy ? t("개설 중", "Creating") : t("에스크로 개설", "Create Escrow")}
            </button>
            <p className="mt-4 text-xs leading-relaxed text-white/30">
              {t(
                "세 당사자의 몫은 정산일에 하나의 트랜잭션으로 동시에 확정됩니다. 돈이 사람 손을 거치지 않습니다.",
                "All three parties' shares settle simultaneously in one transaction. Money never passes through human hands."
              )}
            </p>
          </FadeUp>
        </div>
      </main>
    </div>
  );
}
