"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePublicClient, useWriteContract } from "wagmi";
import { parseUnits, decodeEventLog } from "viem";
import { FACTORY_ADDRESS, factoryAbi } from "@/lib/contracts";
import { ConnectButton } from "@/components/ConnectButton";

const ROUND_OPTIONS = [
  { label: "10분 (데모)", value: 600 },
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
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message.split("\n")[0] : "트랜잭션 실패");
    } finally {
      setBusy(false);
    }
  }

  const field = "flex flex-col gap-1.5 text-sm font-bold text-stone-700";
  const input = "rounded-xl border border-stone-300 bg-white p-3 font-medium";

  return (
    <main className="flex flex-col gap-5 p-4 pb-16">
      <header className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-xl">←</Link>
          <h1 className="text-xl font-black">새 계모임 열기</h1>
        </div>
        <ConnectButton />
      </header>

      <label className={field}>
        인원 — {members}명
        <input
          type="range" min={3} max={12} value={members}
          onChange={(e) => setMembers(Number(e.target.value))}
          className="accent-stone-900"
        />
        <span className="text-xs font-normal text-stone-400">
          {members}회차 동안 돌아가며 한 명씩 곗돈을 탑니다
        </span>
      </label>

      <label className={field}>
        회당 납입액 (mKRW)
        <input
          type="number" inputMode="numeric" value={amount}
          onChange={(e) => setAmount(e.target.value)} className={input}
        />
        <span className="text-xs font-normal text-stone-400">
          곗돈 = {(Number(amount || 0) * members).toLocaleString("ko-KR")}원
        </span>
      </label>

      <label className={field}>
        납입 주기
        <select value={round} onChange={(e) => setRound(Number(e.target.value))} className={input}>
          {ROUND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <label className={field}>
        보증금 <span className="font-normal text-stone-400">(미납 시 여기서 자동 차감)</span>
        <select
          value={depositRounds}
          onChange={(e) => setDepositRounds(Number(e.target.value))}
          className={input}
        >
          <option value={0}>없음 (믿는 지인끼리)</option>
          <option value={1}>납입액 1회분</option>
          <option value={2}>납입액 2회분</option>
        </select>
      </label>

      <div className={field}>
        순번 정하기
        <div className="flex gap-2">
          {["🎲 온체인 제비뽑기", "📝 계주 지정 + 전원 동의"].map((label, i) => (
            <button
              key={i}
              onClick={() => setOrderMode(i)}
              className={`flex-1 rounded-xl border p-3 text-xs font-bold transition ${
                orderMode === i
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-xs text-red-600">{error}</p>
      )}

      <button
        onClick={create}
        disabled={busy || Number(amount) <= 0}
        className="rounded-2xl bg-stone-900 p-4 font-bold text-white shadow-md transition active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? "개설 중…" : "계모임 개설"}
      </button>
      <p className="text-center text-[11px] leading-relaxed text-stone-400">
        개설 후에도 계주는 돈에 손댈 수 없어요.
        <br />모든 보관·지급은 스마트 컨트랙트가 합니다.
      </p>
    </main>
  );
}
