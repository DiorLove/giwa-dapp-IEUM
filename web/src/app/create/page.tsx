"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePublicClient, useWriteContract } from "wagmi";
import { parseUnits, decodeEventLog } from "viem";
import { FACTORY_ADDRESS, factoryAbi } from "@/lib/contracts";
import { AppNav } from "@/components/AppNav";

const ROUND_OPTIONS = [
  { label: "10분 — 데모용", value: 600 },
  { label: "1일", value: 86400 },
  { label: "1주", value: 604800 },
  { label: "1개월 (30일)", value: 2592000 },
];

export default function CreatePage() {
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
      setError(e instanceof Error ? e.message.split("\n")[0] : "트랜잭션 실패");
    } finally {
      setBusy(false);
    }
  }

  const pot = Number(amount || 0) * members;
  const depositAmt = Number(amount || 0) * depositRounds;
  const label = "text-xs uppercase tracking-[0.15em] text-white/35";
  const input =
    "h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition-colors [color-scheme:dark] focus:border-white/30";

  return (
    <div className="min-h-screen bg-black">
      <AppNav />

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <div className="pt-12 pb-10">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/35">New</p>
          <h1 className="font-display text-4xl tracking-tight text-white md:text-5xl">
            새 계모임 개설
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
          {/* Form */}
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <span className={label}>인원 · {members}명</span>
              <input
                type="range" min={3} max={12} value={members}
                onChange={(e) => setMembers(Number(e.target.value))}
                className="accent-white"
              />
              <span className="text-xs text-white/30">
                {members}회차 동안 매 회차 한 명씩 곗돈을 받습니다
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <span className={label}>회당 납입액 (mKRW)</span>
              <input
                type="number" inputMode="numeric" value={amount}
                onChange={(e) => setAmount(e.target.value)} className={input}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-3">
                <span className={label}>납입 주기</span>
                <select
                  value={round}
                  onChange={(e) => setRound(Number(e.target.value))}
                  className={input}
                >
                  {ROUND_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-neutral-900">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-3">
                <span className={label}>보증금</span>
                <select
                  value={depositRounds}
                  onChange={(e) => setDepositRounds(Number(e.target.value))}
                  className={input}
                >
                  <option value={0} className="bg-neutral-900">없음</option>
                  <option value={1} className="bg-neutral-900">납입액 1회분</option>
                  <option value={2} className="bg-neutral-900">납입액 2회분</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className={label}>순번 결정 방식</span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { title: "온체인 추첨", desc: "블록 해시 기반 무작위 배정. 누구도 조작할 수 없습니다." },
                  { title: "계주 지정", desc: "개설자가 순번을 제안하고 전원이 지갑 서명으로 동의합니다." },
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
          </div>

          {/* Summary panel */}
          <aside className="h-fit rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 lg:sticky lg:top-24">
            <p className={label}>요약</p>
            <dl className="mt-6 flex flex-col gap-4 border-b border-white/[0.06] pb-6">
              <div className="flex items-baseline justify-between">
                <dt className="text-sm text-white/40">회차당 곗돈</dt>
                <dd className="text-xl font-medium text-white tabular-nums">
                  ₩{pot.toLocaleString("ko-KR")}
                </dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-sm text-white/40">참여 시 보증금</dt>
                <dd className="text-sm text-white/70 tabular-nums">
                  {depositRounds === 0 ? "없음" : `₩${depositAmt.toLocaleString("ko-KR")}`}
                </dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-sm text-white/40">총 회차</dt>
                <dd className="text-sm text-white/70 tabular-nums">{members}회</dd>
              </div>
            </dl>
            <button
              onClick={create}
              disabled={busy || Number(amount) <= 0}
              className="pressable mt-6 h-12 w-full rounded-full bg-white text-sm font-semibold text-black disabled:opacity-40"
            >
              {busy ? "개설 중" : "계모임 개설"}
            </button>
            <p className="mt-4 text-xs leading-relaxed text-white/30">
              개설 후에도 계주는 자금에 접근할 수 없습니다. 모든 보관과 지급은
              스마트 컨트랙트가 수행합니다.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}
