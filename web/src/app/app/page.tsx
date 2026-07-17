"use client";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { ArrowUpRight, Plus, Lock } from "lucide-react";
import {
  FACTORY_ADDRESS,
  LEGACY_FACTORY_ADDRESS,
  MOCKKRW_ADDRESS,
  factoryAbi,
  mockKrwAbi,
  mulleAbi,
  fmtKRW,
  shortAddr,
} from "@/lib/contracts";
import { AppNav } from "@/components/AppNav";
import { AnimatedNumber, FadeUp, useMounted } from "@/components/Motion";
import { GuideSteps } from "@/components/Guide";
import { InfoTip } from "@/components/InfoTip";
import { useLang } from "@/lib/i18n";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

const STATE_META: { label: [string, string]; cls: string }[] = [
  { label: ["모집 중", "Recruiting"], cls: "border-amber-400/30 text-amber-300" },
  { label: ["진행 중", "Active"], cls: "border-emerald-400/30 text-emerald-300" },
  { label: ["완주", "Completed"], cls: "border-indigo-400/30 text-indigo-300" },
  { label: ["종료", "Closed"], cls: "border-white/15 text-white/40" },
];

export default function AppHome() {
  const { t } = useLang();
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();

  const mounted = useMounted();
  const { data: all } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "getAll",
    query: { refetchInterval: 5000 },
  });
  const { data: legacy } = useReadContract({
    address: LEGACY_FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "getAll",
  });
  const mulles = [
    ...((legacy ?? []) as `0x${string}`[]),
    ...((all ?? []) as `0x${string}`[]),
  ];

  const { data: balance, refetch } = useReadContract({
    address: MOCKKRW_ADDRESS,
    abi: mockKrwAbi,
    functionName: "balanceOf",
    args: [address ?? ZERO],
    query: { enabled: !!address, refetchInterval: 4000 },
  });

  const { data: infos } = useReadContracts({
    contracts: mulles.flatMap((m) => [
      { address: m, abi: mulleAbi, functionName: "state" } as const,
      { address: m, abi: mulleAbi, functionName: "contribution" } as const,
      { address: m, abi: mulleAbi, functionName: "memberCount" } as const,
      { address: m, abi: mulleAbi, functionName: "maxMembers" } as const,
      { address: m, abi: mulleAbi, functionName: "isMember", args: [address ?? ZERO] } as const,
    ]),
    query: { enabled: mulles.length > 0 },
  });

  const myCount =
    infos?.reduce((acc, _, idx) => (idx % 5 === 4 && infos[idx]?.result ? acc + 1 : acc), 0) ?? 0;

  return (
    <div className="min-h-screen bg-black">
      <AppNav />

      <main className="mx-auto max-w-6xl px-6 pb-24">
        {/* Page head */}
        <FadeUp className="flex flex-col gap-6 pt-12 pb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/35">
              {t("온체인 계모임", "Gye Circles")}
            </p>
            <h1 className="font-display text-4xl tracking-tight text-white md:text-5xl">
              {t("계모임", "Gye Circles")}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/40">
              {t(
                "매 회차 전원이 같은 금액을 납입하고, 정해진 순번대로 한 명씩 곗돈(목돈)을 받아 가는 한국의 계입니다. 돈은 사람이 아니라 스마트 컨트랙트가 보관·지급하므로 계주가 들고 도망갈 수 없습니다.",
                "Korea's rotating savings circle: every member pays the same amount each round, and one member takes the whole pot in turn. A smart contract — not a person — holds and pays the money, so no organizer can run off with it."
              )}
            </p>
          </div>
          <Link
            href="/create"
            className="pressable inline-flex h-11 items-center gap-2 self-start rounded-full bg-white px-6 text-sm font-semibold text-black md:self-auto"
          >
            <Plus size={16} />
            {t("새 계모임 개설", "New Gye Circle")}
          </Link>
        </FadeUp>

        {/* Stats strip */}
        <FadeUp
          delay={0.08}
          className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-3"
        >
          <div className="bg-black p-6 transition-colors hover:bg-white/[0.02]">
            <p className="text-xs uppercase tracking-[0.15em] text-white/35">{t("누적 개설", "Total Created")}</p>
            <p className="mt-2 text-3xl font-medium text-white tabular-nums">
              <AnimatedNumber value={mulles.length} />
            </p>
          </div>
          <div className="bg-black p-6 transition-colors hover:bg-white/[0.02]">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-white/35">
              {t("내 참여", "My Circles")}
              <InfoTip
                text={t(
                  "연결된 지갑이 멤버로 참여 중인 계모임 수입니다.",
                  "Number of circles your connected wallet belongs to."
                )}
              />
            </p>
            <p className="mt-2 text-3xl font-medium text-white tabular-nums">
              {mounted && address ? <AnimatedNumber value={myCount} /> : "—"}
            </p>
          </div>
          <div className="bg-black p-6 transition-colors hover:bg-white/[0.02]">
            <div className="flex items-start justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-white/35">
                  {t("mKRW 잔액", "mKRW Balance")}
                  <InfoTip
                    text={t(
                      "mKRW는 테스트용 모의 원화 토큰입니다. 실제 돈이 아니며, 옆의 '테스트 원화 발급' 버튼으로 언제든 무료 충전할 수 있어요. 납입·수령이 모두 이 잔액으로 이뤄집니다.",
                      "mKRW is a mock Korean-won token for testing — not real money. Mint it for free anytime with the button beside. All payments and payouts use this balance."
                    )}
                  />
                </p>
                <p className="mt-2 text-3xl font-medium text-white tabular-nums">
                  {mounted && address ? (
                    <AnimatedNumber
                      value={Number((balance ?? 0n) / 10n ** 18n)}
                      format={(n) => "₩" + n.toLocaleString("ko-KR")}
                    />
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              {mounted && address && (
                <button
                  disabled={isPending}
                  onClick={() =>
                    writeContract(
                      { address: MOCKKRW_ADDRESS, abi: mockKrwAbi, functionName: "faucet" },
                      { onSuccess: () => setTimeout(() => refetch(), 2000) }
                    )
                  }
                  className="pressable rounded-full border border-white/15 px-4 py-1.5 text-xs font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white disabled:opacity-40"
                >
                  {isPending ? t("발급 중", "Minting") : t("테스트 원화 발급", "Mint Test KRW")}
                </button>
              )}
            </div>
          </div>
        </FadeUp>

        {/* First-timer guide */}
        <GuideSteps
          id="gye"
          title={t("계모임, 이렇게 진행돼요", "How a Gye circle works")}
          steps={[
            {
              t: t("개설 · 초대", "Create & invite"),
              d: t(
                "인원·납입액·주기를 정해 계를 만들고, 초대 링크를 공유해 멤버를 모읍니다.",
                "Set the members, amount and cadence, then share the invite link to gather people."
              ),
            },
            {
              t: t("순번 결정", "Set the order"),
              d: t(
                "정원이 차면 온체인 추첨 또는 전원 동의로 곗돈 받는 순서를 정합니다.",
                "Once full, the payout order is set by on-chain lottery or unanimous approval."
              ),
            },
            {
              t: t("매 회차 전원 납입", "Everyone pays each round"),
              d: t(
                "순번과 관계없이 모든 멤버가 매 회차 같은 금액을 납입합니다. 컨트랙트가 보관해요.",
                "Regardless of your turn, every member pays every round. The contract holds the funds."
              ),
            },
            {
              t: t("순번대로 수령", "Collect in turn"),
              d: t(
                "회차가 정산되면 그 회차 순번인 멤버에게 수령 버튼이 나타나고, 곗돈 전액이 지갑으로 들어옵니다.",
                "When a round settles, the member whose turn it is gets a claim button and the full pot lands in their wallet."
              ),
            },
          ]}
        />

        {/* Kye table */}
        <FadeUp delay={0.16} className="mt-14">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-[0.15em] text-white/35">{t("내 계 목록", "My Circles")}</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-[11px] font-medium text-white/40">
              <Lock size={11} />
              {t("초대 전용", "Invite-only")}
              <InfoTip
                text={t(
                  "계모임은 공개 목록에 노출되지 않습니다. 개설자가 보낸 초대 링크로 들어온 사람만 참여할 수 있어요.",
                  "Circles are never listed publicly. Only people with the organizer's invite link can join."
                )}
              />
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
            {!mounted && <div className="skeleton m-4 h-24" />}
            {mounted && (<>
            <div className="hidden grid-cols-[1fr_140px_140px_120px_48px] gap-4 border-b border-white/[0.06] px-6 py-3 text-xs uppercase tracking-[0.12em] text-white/30 md:grid">
              <span>{t("컨트랙트", "Contract")}</span>
              <span className="text-right">{t("회당 납입", "Per Round")}</span>
              <span className="text-right">{t("인원", "Members")}</span>
              <span className="text-right">{t("상태", "Status")}</span>
              <span />
            </div>

            {!address && (
              <p className="px-6 py-16 text-center text-sm text-white/30">
                {t("지갑을 연결하면 내가 개설·참여 중인 계가 표시됩니다.", "Connect a wallet to see the circles you organize or belong to.")}
              </p>
            )}

            {address &&
              mulles.filter((m) => infos?.[mulles.indexOf(m) * 5 + 4]?.result === true).length === 0 && (
                <p className="px-6 py-16 text-center text-sm text-white/30">
                  {t(
                    "참여 중인 계가 없습니다. 초대 링크로 참여하거나 새 계를 개설하세요.",
                    "No circles yet. Join via an invite link, or open a new one."
                  )}
                </p>
              )}

            {[...mulles]
              .reverse()
              .filter((m) => {
                if (!address) return false;
                return infos?.[mulles.indexOf(m) * 5 + 4]?.result === true;
              })
              .map((m, idx) => {
              const i = mulles.indexOf(m);
              const base = i * 5;
              const state = infos?.[base]?.result as number | undefined;
              const contribution = infos?.[base + 1]?.result as bigint | undefined;
              const memberCount = infos?.[base + 2]?.result as bigint | undefined;
              const maxMembers = infos?.[base + 3]?.result as number | undefined;
              const mine = infos?.[base + 4]?.result as boolean | undefined;
              const meta = STATE_META[state ?? 0];
              return (
                <Link
                  key={m}
                  href={`/g/${m}`}
                  style={{ animationDelay: `${Math.min(idx * 40, 320)}ms` }}
                  className="stagger-item group grid grid-cols-2 items-center gap-3 border-b border-white/[0.06] px-6 py-5 transition-colors last:border-b-0 hover:bg-white/[0.03] md:grid-cols-[1fr_140px_140px_120px_48px] md:gap-4"
                >
                  <span className="flex items-center gap-3 font-mono text-sm text-white/70">
                    {shortAddr(m)}
                    {mine && (
                      <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] tracking-wide text-white/50">
                        {t("참여 중", "Member")}
                      </span>
                    )}
                  </span>
                  <span className="text-right text-sm font-medium text-white tabular-nums">
                    {fmtKRW(contribution ?? 0n)}
                  </span>
                  <span className="hidden text-right text-sm text-white/50 tabular-nums md:block">
                    {String(memberCount ?? 0)} / {maxMembers ?? 0}
                  </span>
                  <span className="hidden text-right md:block">
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${meta.cls}`}>
                      {t(meta.label[0], meta.label[1])}
                    </span>
                  </span>
                  <span className="hidden justify-self-end text-white/25 transition-all group-hover:translate-x-0.5 group-hover:text-white/60 md:block">
                    <ArrowUpRight size={16} />
                  </span>
                </Link>
              );
              })}
            </>)}
          </div>
        </FadeUp>

        <p className="mt-12 text-xs leading-relaxed text-white/25">
          {t(
            "GIWA Sepolia 테스트넷에서 동작하는 데모입니다. 납입 통화는 모의 원화(mKRW)이며, 상단에서 무료로 발급받을 수 있습니다.",
            "A demo running on GIWA Sepolia testnet. Payments use mock KRW (mKRW), mintable for free above."
          )}
        </p>
      </main>
    </div>
  );
}
