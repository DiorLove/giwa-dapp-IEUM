"use client";
import { use, useState } from "react";
import { useAccount, usePublicClient, useReadContracts, useWriteContract } from "wagmi";
import { maxUint256 } from "viem";
import { ArrowUpRight, Check, Copy, Share2 } from "lucide-react";
import {
  MOCKKRW_ADDRESS,
  errMsg,
  explorerUrl,
  fmtKRW,
  mockKrwAbi,
  mulleAbi,
  shortAddr,
} from "@/lib/contracts";
import { AppNav } from "@/components/AppNav";
import { MulleWheel } from "@/components/MulleWheel";
import { StateFlow } from "@/components/Guide";
import { InfoTip } from "@/components/InfoTip";
import { FadeUp, SwapIn } from "@/components/Motion";
import { giwaSepolia } from "@/lib/chain";
import { useLang } from "@/lib/i18n";

const ZERO = "0x0000000000000000000000000000000000000000" as const;
const STATE_LABEL: [string, string][] = [
  ["모집 중", "Recruiting"],
  ["진행 중", "Active"],
  ["완주", "Completed"],
  ["종료", "Closed"],
];
const STATE_CLS = [
  "border-amber-400/30 text-amber-300",
  "border-emerald-400/30 text-emerald-300",
  "border-indigo-400/30 text-indigo-300",
  "border-white/15 text-white/40",
];

export default function KyePage({ params }: { params: Promise<{ address: string }> }) {
  const { t } = useLang();
  const { address: kyeAddr } = use(params);
  const kye = kyeAddr as `0x${string}`;
  const { address: me, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

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
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  function approveThen(amount: bigint, name: string, fnName: "join" | "pay") {
    return run(name, async () => {
      const bal = (await publicClient!.readContract({
        address: MOCKKRW_ADDRESS,
        abi: mockKrwAbi,
        functionName: "balanceOf",
        args: [me!],
      })) as bigint;
      if (bal < amount) {
        throw new Error(
          t(
            `mKRW 잔액이 부족합니다 — 필요 ${fmtKRW(amount)}, 보유 ${fmtKRW(bal)}. 대시보드에서 '테스트 원화 발급'을 눌러 충전하세요.`,
            `Insufficient mKRW — need ${fmtKRW(amount)}, you have ${fmtKRW(bal)}. Mint test KRW from the dashboard.`
          )
        );
      }
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
        <main className="mx-auto max-w-6xl px-6">
          <div className="pt-12 pb-10">
            <div className="skeleton mb-3 h-4 w-24" />
            <div className="skeleton h-12 w-72" />
          </div>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px]">
            <div className="flex flex-col gap-6">
              <div className="skeleton h-28 w-full" />
              <div className="skeleton h-72 w-full" />
            </div>
            <div className="skeleton h-56 w-full" />
          </div>
        </main>
      </div>
    );

  const full = members.length === maxMembers;
  const now = Math.floor(Date.now() / 1000);
  const roundEndTs = startTime + (round + 1) * roundDuration;
  const roundEnded = state === 1 && now >= roundEndTs;
  const isOrganizer = me && organizer && me.toLowerCase() === organizer.toLowerCase();
  // 이번 회차 수령자와 내 순번 (진행 중일 때만 의미 있음)
  const recipient = order[round] as string | undefined;
  const iAmRecipient = !!me && recipient?.toLowerCase() === me.toLowerCase();
  const myTurn = me ? order.findIndex((o) => o.toLowerCase() === me.toLowerCase()) : -1;
  // 라이프사이클: 모집 → 순번 결정 → 회차 진행 → 완주
  const flowActive = state === 0 ? (full ? 1 : 0) : state === 1 ? 2 : 4;
  const primaryBtn =
    "pressable h-12 w-full rounded-full text-sm font-semibold disabled:opacity-40";
  const label = "text-xs uppercase tracking-[0.15em] text-white/35";

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function shareKye() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: t("이음 계모임 초대", "IEUM Circle invite"),
      text: t("이음에서 이 계모임에 참여해 주세요.", "Join this savings circle on IEUM."),
      url,
    };
    try {
      if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      /* 공유 취소 → 링크 복사 폴백 */
    }
    await navigator.clipboard.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 1600);
  }

  return (
    <div className="min-h-screen bg-black">
      <AppNav />

      <main className="mx-auto max-w-6xl px-6 pb-24">
        {/* Page head */}
        <FadeUp className="flex flex-col gap-4 pt-12 pb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/35">
              {t("계 상세", "Circle Detail")}
              <span className={`rounded-full border px-2.5 py-0.5 normal-case tracking-normal ${STATE_CLS[state ?? 0]}`}>
                {t(STATE_LABEL[state ?? 0][0], STATE_LABEL[state ?? 0][1])}
              </span>
            </p>
            <h1 className="font-display text-4xl tracking-tight text-white md:text-5xl">
              {fmtKRW(contribution)}
              <span className="ml-2 text-lg text-white/35">{t("/ 회", "/ round")}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={shareKye}
              className="pressable inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-2 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white"
            >
              {shared ? <Check size={14} className="text-emerald-300" /> : <Share2 size={14} />}
              {shared ? t("링크 복사됨", "Link copied") : t("멤버에게 공유", "Share with members")}
            </button>
            <a
              href={explorerUrl(`address/${kye}`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] px-3.5 py-2 text-sm text-white/40 transition-colors hover:text-white"
            >
              <span className="font-mono">{shortAddr(kye)}</span>
              <ArrowUpRight size={14} />
            </a>
          </div>
        </FadeUp>

        {/* Lifecycle */}
        {state !== 3 && (
          <FadeUp delay={0.04} className="mb-8">
            <StateFlow
              steps={[
                t("멤버 모집", "Recruiting"),
                t("순번 결정", "Order draw"),
                t("회차 진행", "Rounds"),
                t("완주", "Complete"),
              ]}
              active={flowActive}
            />
          </FadeUp>
        )}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px]">
          {/* Left: overview */}
          <FadeUp delay={0.08} className="flex flex-col gap-10">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-4">
              {[
                {
                  k: t("인원", "Members"),
                  v: `${members.length} / ${maxMembers}`,
                  tip: t(
                    "현재 참여 인원 / 정원. 총 회차 수는 정원과 같아서 전원이 한 번씩 곗돈을 받으면 계가 끝납니다.",
                    "Current members / capacity. Rounds equal capacity — the circle ends once everyone has collected once."
                  ),
                },
                {
                  k: t("회차당 곗돈", "Pot per round"),
                  v: fmtKRW(contribution * BigInt(maxMembers || 0)),
                  tip: t(
                    "전원이 한 회차에 납입한 금액의 합계입니다. 매 회차 그 회차 순번인 멤버 한 명이 전액을 받습니다.",
                    "The sum everyone pays in one round. Each round, the member whose turn it is receives it all."
                  ),
                },
                {
                  k: t("보증금", "Deposit"),
                  v: deposit > 0n ? fmtKRW(deposit) : t("없음", "None"),
                  tip: t(
                    "중도 미납·이탈에 대비해 참여할 때 맡기는 담보금입니다. 끝까지 완주하면 전액 돌려받습니다.",
                    "Collateral held when you join, protecting against missed payments. Fully refunded when the circle completes."
                  ),
                },
                {
                  k: t("진행", "Progress"),
                  v: state === 1 ? `${round + 1} / ${maxMembers}` : state === 2 ? t("완료", "Done") : "—",
                  tip: t(
                    "현재 회차 / 전체 회차. 회차가 끝날 때마다 정산을 거쳐 다음 회차로 넘어갑니다.",
                    "Current round / total rounds. Each round ends with a settlement before the next begins."
                  ),
                },
              ].map((s) => (
                <div key={s.k} className="bg-black p-5">
                  <p className={`flex items-center gap-1.5 ${label}`}>
                    {s.k}
                    {s.tip && <InfoTip text={s.tip} />}
                  </p>
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
                    {t("이번 회차 마감 —", "Round ends —")} {new Date(roundEndTs * 1000).toLocaleString("ko-KR")}
                  </p>
                )}
              </div>
            )}

            {/* Members */}
            <section>
              <h2 className={`${label} mb-4`}>{t("멤버", "Members")}</h2>
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
                          {t("나", "you")}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-white/30">
                      {m.toLowerCase() === organizer?.toLowerCase() ? t("개설자", "Organizer") : ""}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </FadeUp>

          {/* Right: actions */}
          <FadeUp
            delay={0.16}
            className="flex h-fit flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 lg:sticky lg:top-24"
          >
            <p className={`${label} mb-4`}>{t("액션", "Actions")}</p>
            <SwapIn
              id={`${state}-${isMember}-${full}-${orderProposed}-${iApproved}-${roundEnded}-${iPaid}-${claimable > 0n}-${chainId}`}
              className="flex flex-col gap-4"
            >
            {me && chainId !== giwaSepolia.id && (
              <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-center text-sm text-amber-300">
                {t(
                  "지갑이 다른 네트워크에 연결되어 있습니다. 상단에서 GIWA Sepolia로 전환해 주세요.",
                  "Your wallet is on a different network. Switch to GIWA Sepolia above."
                )}
              </p>
            )}

            {state === 0 && !me && (
              <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-white/40">
                {t("지갑을 연결하면 이 계에 참여할 수 있습니다", "Connect a wallet to join this circle")}
              </p>
            )}

            {state === 0 && !isMember && me && !full && (
              <button
                disabled={!!busy}
                className={`${primaryBtn} bg-white text-black`}
                onClick={() => approveThen(deposit, "join", "join")}
              >
                {busy === "join"
                  ? t("참여 처리 중", "Joining")
                  : deposit > 0n
                    ? t(`참여하기 — 보증금 ${fmtKRW(deposit)}`, `Join — deposit ${fmtKRW(deposit)}`)
                    : t("참여하기", "Join")}
              </button>
            )}

            {state === 0 && isMember && !full && (
              <div className="flex flex-col gap-3">
                <p className="text-sm leading-relaxed text-white/50">
                  {t("참여 완료. 아래 링크를 공유해 남은 자리를 채우세요.", "You are in. Share the link below to fill the remaining seats.")}
                </p>
                <button
                  onClick={copyLink}
                  className="pressable flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/15 text-sm font-medium text-white transition-colors hover:border-white/30"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? t("복사됨", "Copied") : t("초대 링크 복사", "Copy invite link")}
                </button>
              </div>
            )}

            {state === 0 && full && orderMode === 0 && isOrganizer && (
              <button
                disabled={!!busy}
                className={`${primaryBtn} bg-white text-black`}
                onClick={() =>
                  run("start", () =>
                    writeContractAsync({ address: kye, abi: mulleAbi, functionName: "start" })
                  )
                }
              >
                {busy === "start" ? t("추첨 중", "Drawing") : t("개설자 추첨 — 온체인 제비뽑기 시작", "Organizer draw — start on-chain lottery")}
              </button>
            )}
            {state === 0 && full && orderMode === 0 && !isOrganizer && (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm leading-relaxed text-white/50">
                {t(
                  "정원이 찼습니다. 개설자가 온체인 추첨을 시작하면 순번이 정해집니다.",
                  "The circle is full. The organizer will start the on-chain draw to set the payout order."
                )}
              </p>
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
                {busy === "propose" ? t("제안 중", "Proposing") : t("순번 제안 — 참여 순서대로", "Propose order — by join order")}
              </button>
            )}

            {state === 0 && orderProposed && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-white/50">
                  {t("제안된 순번에", "Order approved by")}{" "}
                  <span className="text-white tabular-nums">
                    {approvalCount}/{maxMembers}
                  </span>
                  {t("명 동의", "")}
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
                    {busy === "approve" ? t("서명 중", "Signing") : t("순번에 동의 — 지갑 서명", "Approve order — wallet signature")}
                  </button>
                )}
              </div>
            )}

            {/* 이번 회차 요약: 누가 받는 회차이고, 나는 언제 받는지 */}
            {state === 1 && isMember && (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs leading-relaxed text-white/45">
                <p>
                  {t("이번 회차 수령자", "This round's recipient")} —{" "}
                  <span className="font-mono text-white/70">
                    {recipient ? shortAddr(recipient) : "—"}
                  </span>
                  {iAmRecipient && (
                    <span className="ml-1.5 rounded-full border border-emerald-400/30 px-2 py-0.5 text-[10px] text-emerald-300">
                      {t("나", "you")}
                    </span>
                  )}
                </p>
                <p className="mt-1.5">
                  {t(
                    `순번과 관계없이 매 회차 전원이 납입해요. 내 순번(${myTurn + 1}번째) 회차가 정산되면 이 자리에 수령 버튼이 나타납니다.`,
                    `Everyone pays every round, regardless of turn. When your round (#${myTurn + 1}) settles, a claim button will appear right here.`
                  )}
                </p>
              </div>
            )}

            {state === 1 && isMember && !iPaid && !roundEnded && (
              <button
                disabled={!!busy}
                className={`${primaryBtn} bg-emerald-400 text-black`}
                onClick={() => approveThen(contribution, "pay", "pay")}
              >
                {busy === "pay" ? t("납입 중", "Paying") : t(`이번 회차 납입 — ${fmtKRW(contribution)}`, `Pay this round — ${fmtKRW(contribution)}`)}
              </button>
            )}

            {state === 1 && isMember && iPaid && !roundEnded && (
              <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-center text-sm text-emerald-300">
                {t("이번 회차 납입 완료", "Paid for this round")}
              </p>
            )}

            {roundEnded && (
              <div className="flex flex-col gap-2">
                <button
                  disabled={!!busy}
                  className={`${primaryBtn} border border-white/15 text-white hover:border-white/30`}
                  onClick={() =>
                    run("settle", () =>
                      writeContractAsync({ address: kye, abi: mulleAbi, functionName: "settle" })
                    )
                  }
                >
                  {busy === "settle" ? t("정산 중", "Settling") : t("회차 정산 실행 — 호출 보상 0.1%", "Settle round — 0.1% caller reward")}
                </button>
                <p className="text-xs leading-relaxed text-white/30">
                  {t(
                    "마감된 회차를 확정해 이번 순번에게 곗돈을 지급하고 다음 회차를 시작합니다. 누구나 실행할 수 있고, 실행한 사람이 곗돈의 0.1%를 보상으로 받아요.",
                    "Finalizes the ended round: pays the pot to this turn's member and starts the next round. Anyone can run it and earns 0.1% of the pot."
                  )}
                </p>
              </div>
            )}

            {claimable > 0n && (
              <div className="flex flex-col gap-2">
                <button
                  disabled={!!busy}
                  className={`${primaryBtn} bg-white text-black`}
                  onClick={() =>
                    run("claim", () =>
                      writeContractAsync({ address: kye, abi: mulleAbi, functionName: "claim" })
                    )
                  }
                >
                  {busy === "claim" ? t("수령 중", "Claiming") : t(`${fmtKRW(claimable)} 수령`, `Claim ${fmtKRW(claimable)}`)}
                </button>
                <p className="text-xs leading-relaxed text-white/30">
                  {t(
                    "수령하면 내 지갑의 mKRW 잔액으로 들어갑니다. 잔액은 계모임 홈 상단에서 확인할 수 있어요.",
                    "Claimed funds go straight to your wallet's mKRW balance — visible at the top of the Gye home."
                  )}
                </p>
              </div>
            )}

            {state === 2 && claimable === 0n && (
              <p className="rounded-xl border border-indigo-400/20 bg-indigo-400/5 p-4 text-center text-sm text-indigo-300">
                {t("완주한 계입니다. 모든 정산이 끝났습니다.", "This circle is complete. All settlements are done.")}
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
