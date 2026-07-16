"use client";
import { use, useState } from "react";
import { useAccount, usePublicClient, useReadContracts, useWriteContract } from "wagmi";
import { maxUint256 } from "viem";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import {
  MOCKKRW_ADDRESS,
  explorerUrl,
  fmtKRW,
  mockKrwAbi,
  mulleAbi,
  shortAddr,
} from "@/lib/contracts";
import { AppNav } from "@/components/AppNav";
import { MulleWheel } from "@/components/MulleWheel";

const ZERO = "0x0000000000000000000000000000000000000000" as const;
const STATE_LABEL = ["모집 중", "진행 중", "완주", "종료"];
const STATE_CLS = [
  "border-amber-400/30 text-amber-300",
  "border-emerald-400/30 text-emerald-300",
  "border-indigo-400/30 text-indigo-300",
  "border-white/15 text-white/40",
];

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
      <div className="min-h-screen bg-black">
        <AppNav />
        <main className="flex h-[60vh] items-center justify-center text-sm text-white/30">
          불러오는 중
        </main>
      </div>
    );

  const full = members.length === maxMembers;
  const now = Math.floor(Date.now() / 1000);
  const roundEndTs = startTime + (round + 1) * roundDuration;
  const roundEnded = state === 1 && now >= roundEndTs;
  const isOrganizer = me && organizer && me.toLowerCase() === organizer.toLowerCase();
  const primaryBtn =
    "pressable h-12 w-full rounded-full text-sm font-semibold disabled:opacity-40";
  const label = "text-xs uppercase tracking-[0.15em] text-white/35";

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-h-screen bg-black">
      <AppNav />

      <main className="mx-auto max-w-6xl px-6 pb-24">
        {/* Page head */}
        <div className="flex flex-col gap-4 pt-12 pb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/35">
              계 상세
              <span className={`rounded-full border px-2.5 py-0.5 normal-case tracking-normal ${STATE_CLS[state ?? 0]}`}>
                {STATE_LABEL[state ?? 0]}
              </span>
            </p>
            <h1 className="font-display text-4xl tracking-tight text-white md:text-5xl">
              {fmtKRW(contribution)}
              <span className="ml-2 text-lg text-white/35">/ 회</span>
            </h1>
          </div>
          <a
            href={explorerUrl(`address/${kye}`)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 self-start text-sm text-white/40 transition-colors hover:text-white md:self-auto"
          >
            <span className="font-mono">{shortAddr(kye)}</span>
            <ArrowUpRight size={14} />
          </a>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px]">
          {/* Left: overview */}
          <div className="flex flex-col gap-10">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-4">
              {[
                { k: "인원", v: `${members.length} / ${maxMembers}` },
                { k: "회차당 곗돈", v: fmtKRW(contribution * BigInt(maxMembers || 0)) },
                { k: "보증금", v: deposit > 0n ? fmtKRW(deposit) : "없음" },
                {
                  k: "진행",
                  v: state === 1 ? `${round + 1} / ${maxMembers}회차` : state === 2 ? "완료" : "—",
                },
              ].map((s) => (
                <div key={s.k} className="bg-black p-5">
                  <p className={label}>{s.k}</p>
                  <p className="mt-2 text-lg font-medium text-white tabular-nums">{s.v}</p>
                </div>
              ))}
            </div>

            {(state === 1 || state === 2) && (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] py-10">
                <MulleWheel
                  order={order}
                  current={state === 2 ? order.length : round}
                  me={me}
                />
                {state === 1 && (
                  <p className="mt-4 text-center text-xs text-white/30">
                    이번 회차 마감 — {new Date(roundEndTs * 1000).toLocaleString("ko-KR")}
                  </p>
                )}
              </div>
            )}

            {/* Members */}
            <section>
              <h2 className={`${label} mb-4`}>멤버</h2>
              <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
                {members.map((m, i) => (
                  <div
                    key={m}
                    className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4 last:border-b-0"
                  >
                    <span className="flex items-center gap-3 font-mono text-sm text-white/70">
                      <span className="text-xs text-white/25 tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {shortAddr(m)}
                      {m.toLowerCase() === me?.toLowerCase() && (
                        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/50">
                          나
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-white/30">
                      {m.toLowerCase() === organizer?.toLowerCase() ? "개설자" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right: actions */}
          <aside className="flex h-fit flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 lg:sticky lg:top-24">
            <p className={label}>액션</p>

            {state === 0 && !me && (
              <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-white/40">
                지갑을 연결하면 이 계에 참여할 수 있습니다
              </p>
            )}

            {state === 0 && !isMember && me && !full && (
              <button
                disabled={!!busy}
                className={`${primaryBtn} bg-white text-black`}
                onClick={() => approveThen(deposit, "join", "join")}
              >
                {busy === "join"
                  ? "참여 처리 중"
                  : deposit > 0n
                    ? `참여하기 — 보증금 ${fmtKRW(deposit)}`
                    : "참여하기"}
              </button>
            )}

            {state === 0 && isMember && !full && (
              <div className="flex flex-col gap-3">
                <p className="text-sm leading-relaxed text-white/50">
                  참여 완료. 아래 링크를 공유해 남은 자리를 채우세요.
                </p>
                <button
                  onClick={copyLink}
                  className="pressable flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/15 text-sm font-medium text-white transition-colors hover:border-white/30"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? "복사됨" : "초대 링크 복사"}
                </button>
              </div>
            )}

            {state === 0 && full && orderMode === 0 && (
              <button
                disabled={!!busy}
                className={`${primaryBtn} bg-white text-black`}
                onClick={() =>
                  run("start", () =>
                    writeContractAsync({ address: kye, abi: mulleAbi, functionName: "start" })
                  )
                }
              >
                {busy === "start" ? "추첨 중" : "온체인 추첨으로 시작"}
              </button>
            )}

            {state === 0 && full && orderMode === 1 && isOrganizer && !orderProposed && (
              <button
                disabled={!!busy}
                className={`${primaryBtn} bg-white text-black`}
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
                {busy === "propose" ? "제안 중" : "순번 제안 — 참여 순서대로"}
              </button>
            )}

            {state === 0 && orderProposed && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-white/50">
                  제안된 순번에{" "}
                  <span className="text-white tabular-nums">
                    {approvalCount}/{maxMembers}
                  </span>
                  명 동의
                </p>
                {isMember && !iApproved && (
                  <button
                    disabled={!!busy}
                    className={`${primaryBtn} bg-white text-black`}
                    onClick={() =>
                      run("approve", () =>
                        writeContractAsync({
                          address: kye,
                          abi: mulleAbi,
                          functionName: "approveOrder",
                        })
                      )
                    }
                  >
                    {busy === "approve" ? "서명 중" : "순번에 동의 — 지갑 서명"}
                  </button>
                )}
              </div>
            )}

            {state === 1 && isMember && !iPaid && !roundEnded && (
              <button
                disabled={!!busy}
                className={`${primaryBtn} bg-emerald-400 text-black`}
                onClick={() => approveThen(contribution, "pay", "pay")}
              >
                {busy === "pay" ? "납입 중" : `이번 회차 납입 — ${fmtKRW(contribution)}`}
              </button>
            )}

            {state === 1 && isMember && iPaid && !roundEnded && (
              <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-center text-sm text-emerald-300">
                이번 회차 납입 완료
              </p>
            )}

            {roundEnded && (
              <button
                disabled={!!busy}
                className={`${primaryBtn} border border-white/15 text-white hover:border-white/30`}
                onClick={() =>
                  run("settle", () =>
                    writeContractAsync({ address: kye, abi: mulleAbi, functionName: "settle" })
                  )
                }
              >
                {busy === "settle" ? "정산 중" : "회차 정산 실행 — 호출 보상 0.1%"}
              </button>
            )}

            {claimable > 0n && (
              <button
                disabled={!!busy}
                className={`${primaryBtn} bg-white text-black`}
                onClick={() =>
                  run("claim", () =>
                    writeContractAsync({ address: kye, abi: mulleAbi, functionName: "claim" })
                  )
                }
              >
                {busy === "claim" ? "수령 중" : `${fmtKRW(claimable)} 수령`}
              </button>
            )}

            {state === 2 && claimable === 0n && (
              <p className="rounded-xl border border-indigo-400/20 bg-indigo-400/5 p-4 text-center text-sm text-indigo-300">
                완주한 계입니다. 모든 정산이 끝났습니다.
              </p>
            )}

            {error && (
              <p className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-xs text-red-300">
                {error}
              </p>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
