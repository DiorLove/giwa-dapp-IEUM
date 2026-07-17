"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePublicClient, useWriteContract } from "wagmi";
import { parseUnits, decodeEventLog } from "viem";
import { FACTORY_ADDRESS, errMsg, factoryAbi } from "@/lib/contracts";
import { AppNav } from "@/components/AppNav";
import { Dropdown } from "@/components/Dropdown";
import { FadeUp } from "@/components/Motion";
import { useLang } from "@/lib/i18n";

const ROUND_RAW = [
  { label: ["10분", "10 min"], value: 600, hint: ["데모용", "demo"] },
  { label: ["1일", "1 day"], value: 86400 },
  { label: ["1주", "1 week"], value: 604800 },
  { label: ["1개월", "1 month"], value: 2592000, hint: ["30일", "30 days"] },
] as { label: [string, string]; value: number; hint?: [string, string] }[];

const DEPOSIT_RAW = [
  { label: ["없음", "None"], value: 0, hint: ["믿는 지인끼리", "trusted friends"] },
  { label: ["납입액 1회분", "1 round worth"], value: 1 },
  { label: ["납입액 2회분", "2 rounds worth"], value: 2 },
] as { label: [string, string]; value: number; hint?: [string, string] }[];

export default function CreatePage() {
  const { t } = useLang();
  const router = useRouter();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [members, setMembers] = useState(3);
  const [amount, setAmount] = useState("500000");
  const [round, setRound] = useState(600);
  const [depositRounds, setDepositRounds] = useState(1);
  const [orderMode, setOrderMode] = useState(0); // 0=제비뽑기, 1=계주 지정
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const hash = await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: "createMulle",
        args: [
          members,
          parseUnits(amount || "0", 18),
          BigInt(round),
          depositRounds,
          BigInt(7 * 86400),
          orderMode,
        ],
      });
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      for (const log of receipt.logs) {
        try {
          const ev = decodeEventLog({ abi: factoryAbi, ...log });
          if (ev.eventName === "MulleCreated") {
            router.push(`/g/${(ev.args as { mulle: string }).mulle}`);
            return;
          }
        } catch {}
      }
      router.push("/app");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const roundOptions = ROUND_RAW.map((o) => ({
    value: o.value,
    label: t(o.label[0], o.label[1]),
    hint: o.hint ? t(o.hint[0], o.hint[1]) : undefined,
  }));
  const depositOptions = DEPOSIT_RAW.map((o) => ({
    value: o.value,
    label: t(o.label[0], o.label[1]),
    hint: o.hint ? t(o.hint[0], o.hint[1]) : undefined,
  }));
  const pot = Number(amount || 0) * members;
  const depositAmt = Number(amount || 0) * depositRounds;
  const label = "text-xs uppercase tracking-[0.15em] text-white/35";
  const input =
    "h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition-colors [color-scheme:dark] focus:border-white/30";

  return (
    <div className="min-h-screen bg-black">
      <AppNav />

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <FadeUp className="pt-12 pb-10">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/35">New</p>
          <h1 className="font-display text-4xl tracking-tight text-white md:text-5xl">
            {t("새 계모임 개설", "Create a Gye Circle")}
          </h1>
        </FadeUp>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
          {/* Form */}
          <FadeUp delay={0.08} className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between">
                <span className={label}>{t("인원", "Members")}</span>
                <span className="text-sm text-white tabular-nums">
                  {members}
                  <span className="text-white/35">{t("명", "")}</span>
                </span>
              </div>
              <input
                type="range" min={3} max={12} value={members}
                onChange={(e) => setMembers(Number(e.target.value))}
                className="range-input"
                style={{ "--fill": `${((members - 3) / 9) * 100}%` } as React.CSSProperties}
              />
              <div className="flex justify-between text-[11px] text-white/25 tabular-nums">
                <span>3</span>
                <span>{t(`${members}회차 동안 매 회차 한 명씩 곗돈을 받습니다`, `${members} rounds — one member gets the pot each round`)}</span>
                <span>12</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className={label}>{t("회당 납입액", "Contribution per round")}</span>
              <div className="relative">
                <input
                  type="number" inputMode="numeric" value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`${input} pr-16`}
                />
                <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-white/35">
                  mKRW
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-3">
                <span className={label}>{t("납입 주기", "Round length")}</span>
                <Dropdown value={round} options={roundOptions} onChange={setRound} />
              </div>
              <div className="flex flex-col gap-3">
                <span className={label}>{t("보증금", "Security deposit")}</span>
                <Dropdown
                  value={depositRounds}
                  options={depositOptions}
                  onChange={setDepositRounds}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className={label}>{t("순번 결정 방식", "Payout order")}</span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { title: t("온체인 추첨", "On-chain lottery"), desc: t("블록 해시 기반 무작위 배정. 누구도 조작할 수 없습니다.", "Random assignment from block hashes. No one can rig it.") },
                  { title: t("계주 지정", "Organizer assigns"), desc: t("개설자가 순번을 제안하고 전원이 지갑 서명으로 동의합니다.", "The organizer proposes an order and every member approves by wallet signature.") },
                ].map((opt, i) => (
                  <button
                    key={opt.title}
                    onClick={() => setOrderMode(i)}
                    className={`pressable rounded-xl border p-5 text-left transition-colors ${
                      orderMode === i
                        ? "border-white/40 bg-white/[0.06]"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20"
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{opt.title}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-white/40">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-xs text-red-300">
                {error}
              </p>
            )}
          </FadeUp>

          {/* Summary panel */}
          <FadeUp
            delay={0.16}
            className="h-fit rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 lg:sticky lg:top-24"
          >
            <p className={label}>{t("요약", "Summary")}</p>
            <dl className="mt-6 flex flex-col gap-4 border-b border-white/[0.06] pb-6">
              <div className="flex items-baseline justify-between">
                <dt className="text-sm text-white/40">{t("회차당 곗돈", "Pot per round")}</dt>
                <dd className="text-xl font-medium text-white tabular-nums">
                  ₩{pot.toLocaleString("ko-KR")}
                </dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-sm text-white/40">{t("참여 시 보증금", "Deposit to join")}</dt>
                <dd className="text-sm text-white/70 tabular-nums">
                  {depositRounds === 0 ? t("없음", "None") : `₩${depositAmt.toLocaleString("ko-KR")}`}
                </dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-sm text-white/40">{t("총 회차", "Total rounds")}</dt>
                <dd className="text-sm text-white/70 tabular-nums">{members}{t("회", "")}</dd>
              </div>
            </dl>
            <button
              onClick={create}
              disabled={busy || Number(amount) <= 0}
              className="pressable mt-6 h-12 w-full rounded-full bg-white text-sm font-semibold text-black disabled:opacity-40"
            >
              {busy ? t("개설 중", "Creating") : t("계모임 개설", "Create Circle")}
            </button>
            <p className="mt-4 text-xs leading-relaxed text-white/30">
              {t(
                "개설 후에도 계주는 자금에 접근할 수 없습니다. 모든 보관과 지급은 스마트 컨트랙트가 수행합니다.",
                "Even the organizer can never touch the funds. All custody and payouts are handled by the smart contract."
              )}
            </p>
          </FadeUp>
        </div>
      </main>
    </div>
  );
}
