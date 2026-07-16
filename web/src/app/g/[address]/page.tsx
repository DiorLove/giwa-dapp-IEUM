"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useAccount, usePublicClient, useReadContracts, useWriteContract } from "wagmi";
import { maxUint256 } from "viem";
import {
  MOCKKRW_ADDRESS,
  explorerUrl,
  fmtKRW,
  mockKrwAbi,
  mulleAbi,
  shortAddr,
} from "@/lib/contracts";
import { ConnectButton } from "@/components/ConnectButton";
import { MulleWheel } from "@/components/MulleWheel";

const ZERO = "0x0000000000000000000000000000000000000000" as const;
const STATE_LABEL = ["모집 중", "진행 중", "완주 🎉", "종료"];

export default function KyePage({ params }: { params: Promise<{ address: string }> }) {
  const { address: kyeAddr } = use(params);
  const kye = kyeAddr as `0x${string}`;
  const { address: me } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: kye, abi: mulleAbi, functionName: "state" },
      { address: kye, abi: mulleAbi, functionName: "orderMode" },
      { address: kye, abi: mulleAbi, functionName: "contribution" },
      { address: kye, abi: mulleAbi, functionName: "deposit" },
      { address: kye, abi: mulleAbi, functionName: "maxMembers" },
      { address: kye, abi: mulleAbi, functionName: "getMembers" },
      { address: kye, abi: mulleAbi, functionName: "getPayoutOrder" },
      { address: kye, abi: mulleAbi, functionName: "currentRound" },
      { address: kye, abi: mulleAbi, functionName: "isMember", args: [me ?? ZERO] },
      { address: kye, abi: mulleAbi, functionName: "claimable", args: [me ?? ZERO] },
      { address: kye, abi: mulleAbi, functionName: "organizer" },
      { address: kye, abi: mulleAbi, functionName: "orderProposed" },
      { address: kye, abi: mulleAbi, functionName: "orderApproved", args: [me ?? ZERO] },
      { address: kye, abi: mulleAbi, functionName: "startTime" },
      { address: kye, abi: mulleAbi, functionName: "roundDuration" },
      { address: kye, abi: mulleAbi, functionName: "approvalCount" },
    ],
    query: { refetchInterval: 4000 },
  });

  const state = data?.[0]?.result as number | undefined;
  const orderMode = data?.[1]?.result as number | undefined;
  const contribution = (data?.[2]?.result as bigint | undefined) ?? 0n;
  const deposit = (data?.[3]?.result as bigint | undefined) ?? 0n;
  const maxMembers = (data?.[4]?.result as number | undefined) ?? 0;
  const members = (data?.[5]?.result as string[] | undefined) ?? [];
  const order = (data?.[6]?.result as string[] | undefined) ?? [];
  const round = Number((data?.[7]?.result as bigint | undefined) ?? 0n);
  const isMember = data?.[8]?.result as boolean | undefined;
  const claimable = (data?.[9]?.result as bigint | undefined) ?? 0n;
  const organizer = data?.[10]?.result as string | undefined;
  const orderProposed = data?.[11]?.result as boolean | undefined;
  const iApproved = data?.[12]?.result as boolean | undefined;
  const startTime = Number((data?.[13]?.result as bigint | undefined) ?? 0n);
  const roundDuration = Number((data?.[14]?.result as bigint | undefined) ?? 0n);
  const approvalCount = (data?.[15]?.result as number | undefined) ?? 0;

  const paidQuery = useReadContracts({
    contracts: [
      { address: kye, abi: mulleAbi, functionName: "paidInRound", args: [BigInt(round), me ?? ZERO] },
    ],
    query: { enabled: state === 1 && !!me, refetchInterval: 4000 },
  });
  const iPaid = paidQuery.data?.[0]?.result as boolean | undefined;

  async function run(name: string, fn: () => Promise<`0x${string}`>) {
    setBusy(name);
    setError(null);
    try {
      const hash = await fn();
      await publicClient!.waitForTransactionReceipt({ hash });
      await refetch();
      await paidQuery.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message.split("\n")[0] : "트랜잭션 실패");
    } finally {
      setBusy(null);
    }
  }

  /** 필요 시 approve 먼저, 이어서 본 트랜잭션 */
  function approveThen(amount: bigint, name: string, fnName: "join" | "pay") {
    return run(name, async () => {
      const allowance = (await publicClient!.readContract({
        address: MOCKKRW_ADDRESS,
        abi: mockKrwAbi,
        functionName: "allowance",
        args: [me!, kye],
      })) as bigint;
      if (allowance < amount) {
        const h = await writeContractAsync({
          address: MOCKKRW_ADDRESS,
          abi: mockKrwAbi,
          functionName: "approve",
          args: [kye, maxUint256],
        });
        await publicClient!.waitForTransactionReceipt({ hash: h });
      }
      return writeContractAsync({ address: kye, abi: mulleAbi, functionName: fnName });
    });
  }

  if (!data)
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-white/40">
        불러오는 중…
      </main>
    );

  const full = members.length === maxMembers;
  const now = Math.floor(Date.now() / 1000);
  const roundEndTs = startTime + (round + 1) * roundDuration;
  const roundEnded = state === 1 && now >= roundEndTs;
  const isOrganizer = me && organizer && me.toLowerCase() === organizer.toLowerCase();
  const btn = "pressable rounded-2xl p-4 font-bold disabled:opacity-50";

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4 pb-16">
      <header className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Link href="/app" className="pressable text-xl text-white/70">←</Link>
          <h1 className="text-xl font-black text-white">🏺 계모임</h1>
        </div>
        <ConnectButton />
      </header>

      <div className="liquid-glass rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-black text-white tabular-nums">
            {fmtKRW(contribution)}
            <span className="text-xs font-medium text-white/40"> / 회</span>
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white/70">
            {STATE_LABEL[state ?? 0]}
          </span>
        </div>
        <div className="mt-1 text-xs text-white/40">
          {members.length}/{maxMembers}명 · 곗돈 {fmtKRW(contribution * BigInt(maxMembers || 0))}
          {deposit > 0n ? ` · 보증금 ${fmtKRW(deposit)}` : " · 보증금 없음"}
        </div>
        {state === 1 && (
          <div className="mt-1 text-xs text-white/30">
            이번 회차 마감: {new Date(roundEndTs * 1000).toLocaleString("ko-KR")}
          </div>
        )}
      </div>

      {state === 1 && <MulleWheel order={order} current={round} me={me} />}
      {state === 2 && <MulleWheel order={order} current={order.length} me={me} />}

      {/* ---- 모집 중 ---- */}
      {state === 0 && !isMember && me && !full && (
        <button
          disabled={!!busy}
          className={`${btn} bg-white text-black`}
          onClick={() => approveThen(deposit, "join", "join")}
        >
          {busy === "join"
            ? "참여 중…"
            : `이 계에 참여하기${deposit > 0n ? ` (보증금 ${fmtKRW(deposit)})` : ""}`}
        </button>
      )}
      {state === 0 && !me && (
        <p className="rounded-2xl border border-dashed border-white/15 p-4 text-center text-sm text-white/40">
          지갑을 연결하면 이 계에 참여할 수 있어요
        </p>
      )}
      {state === 0 && isMember && !full && (
        <div className="liquid-glass rounded-2xl p-4 text-sm text-white">
          ✅ 참여 완료! 친구에게 초대 링크를 공유하세요
          <button
            onClick={copyLink}
            className="pressable mt-2 w-full rounded-xl bg-amber-400 py-2.5 text-sm font-bold text-black"
          >
            {copied ? "복사됨! 카톡에 붙여넣으세요" : "📋 초대 링크 복사"}
          </button>
        </div>
      )}
      {state === 0 && full && orderMode === 0 && (
        <button
          disabled={!!busy}
          className={`${btn} bg-amber-400 text-black`}
          onClick={() =>
            run("start", () =>
              writeContractAsync({ address: kye, abi: mulleAbi, functionName: "start" })
            )
          }
        >
          {busy === "start" ? "추첨 중…" : "🎲 제비뽑기로 순번 정하고 시작!"}
        </button>
      )}
      {state === 0 && full && orderMode === 1 && isOrganizer && !orderProposed && (
        <button
          disabled={!!busy}
          className={`${btn} bg-amber-400 text-black`}
          onClick={() =>
            run("propose", () =>
              writeContractAsync({
                address: kye,
                abi: mulleAbi,
                functionName: "proposeOrder",
                args: [members as `0x${string}`[]],
              })
            )
          }
        >
          {busy === "propose" ? "제안 중…" : "📝 순번 제안 (참여 순서대로)"}
        </button>
      )}
      {state === 0 && orderProposed && (
        <div className="liquid-glass rounded-2xl p-4 text-sm text-white">
          제안된 순번에 {approvalCount}/{maxMembers}명 동의
          {isMember && !iApproved && (
            <button
              disabled={!!busy}
              className="pressable mt-2 w-full rounded-xl bg-amber-400 py-2.5 text-sm font-bold text-black disabled:opacity-50"
              onClick={() =>
                run("approve", () =>
                  writeContractAsync({ address: kye, abi: mulleAbi, functionName: "approveOrder" })
                )
              }
            >
              {busy === "approve" ? "서명 중…" : "✍️ 순번에 동의 (지갑 서명)"}
            </button>
          )}
        </div>
      )}

      {/* ---- 진행 중 ---- */}
      {state === 1 && isMember && !iPaid && !roundEnded && (
        <button
          disabled={!!busy}
          className={`${btn} bg-emerald-500 text-black`}
          onClick={() => approveThen(contribution, "pay", "pay")}
        >
          {busy === "pay" ? "납입 중…" : `이번 회차 납입 (${fmtKRW(contribution)})`}
        </button>
      )}
      {state === 1 && isMember && iPaid && !roundEnded && (
        <div className="rounded-2xl bg-emerald-400/10 p-4 text-center text-sm font-bold text-emerald-300">
          ✅ 이번 회차 납입 완료 — 물레가 도는 중
        </div>
      )}
      {roundEnded && (
        <button
          disabled={!!busy}
          className={`${btn} bg-amber-400 text-black`}
          onClick={() =>
            run("settle", () =>
              writeContractAsync({ address: kye, abi: mulleAbi, functionName: "settle" })
            )
          }
        >
          {busy === "settle" ? "정산 중…" : "⚙️ 회차 정산 실행 (호출 보상 0.1%)"}
        </button>
      )}

      {/* ---- 수령 ---- */}
      {claimable > 0n && (
        <button
          disabled={!!busy}
          className={`${btn} bg-indigo-400 text-black`}
          onClick={() =>
            run("claim", () =>
              writeContractAsync({ address: kye, abi: mulleAbi, functionName: "claim" })
            )
          }
        >
          {busy === "claim" ? "수령 중…" : `💰 ${fmtKRW(claimable)} 수령하기`}
        </button>
      )}

      {error && <p className="rounded-xl bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}

      {/* ---- 멤버 ---- */}
      <section className="liquid-glass rounded-2xl p-4">
        <h2 className="mb-2 text-sm font-bold text-white/40">멤버</h2>
        {members.map((m) => (
          <div key={m} className="flex justify-between py-1 text-xs text-white/60">
            <span className="font-mono">
              {shortAddr(m)} {m.toLowerCase() === me?.toLowerCase() ? "· 나" : ""}
            </span>
            <span className="text-white/30">
              {m.toLowerCase() === organizer?.toLowerCase() ? "개설자" : ""}
            </span>
          </div>
        ))}
      </section>

      <a
        href={explorerUrl(`address/${kye}`)}
        target="_blank"
        rel="noreferrer"
        className="text-center text-xs text-white/30 underline"
      >
        컨트랙트 온체인 기록 보기 ↗
      </a>
    </main>
  );
}
