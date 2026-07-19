"use client";
import { useState } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { ArrowUpRight, Plus } from "lucide-react";
import {
  JEONSE_FACTORY_ADDRESS,
  LEGACY_JEONSE_FACTORY_ADDRESS,
  LEGACY_JEONSE_FACTORY_ADDRESS_2,
  LEGACY_JEONSE_FACTORY_ADDRESS_3,
  LEGACY_JEONSE_FACTORY_ADDRESS_4,
  LEGACY_JEONSE_FACTORY_ADDRESS_5,
  BRIDGE_POOL_ADDRESS,
  EARN_ADDRESS,
  earnAbi,
  jeonseFactoryAbi,
  jeonseAbi,
  bridgePoolAbi,
  fmtKRW,
  shortAddr,
} from "@/lib/contracts";
import { AppNav } from "@/components/AppNav";
import { AnimatedNumber, FadeUp, useMounted } from "@/components/Motion";
import { GuideSteps } from "@/components/Guide";
import { InfoTip } from "@/components/InfoTip";
import { useLang } from "@/lib/i18n";
import { WalletModal } from "@/components/WalletModal";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

const STATE_META: { label: [string, string]; cls: string }[] = [
  { label: ["자금 대기", "Awaiting funds"], cls: "border-amber-400/30 text-amber-300" },
  { label: ["락 완료", "Funded"], cls: "border-emerald-400/30 text-emerald-300" },
  { label: ["정산 완료", "Settled"], cls: "border-indigo-400/30 text-indigo-300" },
  { label: ["취소됨", "Cancelled"], cls: "border-white/15 text-white/40" },
];

export default function JeonseList() {
  const { t } = useLang();
  const { address } = useAccount();
  const [view, setView] = useState<"mine" | "all">("mine");
  const [walletOpen, setWalletOpen] = useState(false);
  const mounted = useMounted();
  const { data: all } = useReadContract({
    address: JEONSE_FACTORY_ADDRESS,
    abi: jeonseFactoryAbi,
    functionName: "getAll",
    query: { refetchInterval: 5000 },
  });
  const { data: legacy } = useReadContract({
    address: LEGACY_JEONSE_FACTORY_ADDRESS,
    abi: jeonseFactoryAbi,
    functionName: "getAll",
  });
  const { data: legacy2 } = useReadContract({
    address: LEGACY_JEONSE_FACTORY_ADDRESS_2,
    abi: jeonseFactoryAbi,
    functionName: "getAll",
  });
  const { data: legacy3 } = useReadContract({
    address: LEGACY_JEONSE_FACTORY_ADDRESS_3,
    abi: jeonseFactoryAbi,
    functionName: "getAll",
  });
  const { data: legacy4 } = useReadContract({
    address: LEGACY_JEONSE_FACTORY_ADDRESS_4,
    abi: jeonseFactoryAbi,
    functionName: "getAll",
  });
  const { data: legacy5 } = useReadContract({
    address: LEGACY_JEONSE_FACTORY_ADDRESS_5,
    abi: jeonseFactoryAbi,
    functionName: "getAll",
  });
  const escrows = [
    ...((legacy ?? []) as `0x${string}`[]),
    ...((legacy2 ?? []) as `0x${string}`[]),
    ...((legacy3 ?? []) as `0x${string}`[]),
    ...((legacy4 ?? []) as `0x${string}`[]),
    ...((legacy5 ?? []) as `0x${string}`[]),
    ...((all ?? []) as `0x${string}`[]),
  ];

  const { data: poolAssets } = useReadContract({
    address: EARN_ADDRESS,
    abi: earnAbi,
    functionName: "totalAssets",
    query: { refetchInterval: 5000 },
  });

  const { data: infos } = useReadContracts({
    contracts: escrows.flatMap((e) => [
      { address: e, abi: jeonseAbi, functionName: "state" } as const,
      { address: e, abi: jeonseAbi, functionName: "jeonseAmount" } as const,
      { address: e, abi: jeonseAbi, functionName: "refundAmount" } as const,
      { address: e, abi: jeonseAbi, functionName: "settleDate" } as const,
      { address: e, abi: jeonseAbi, functionName: "bridged" } as const,
      { address: e, abi: jeonseAbi, functionName: "landlord" } as const,
      { address: e, abi: jeonseAbi, functionName: "tenantIn" } as const,
      { address: e, abi: jeonseAbi, functionName: "tenantOut" } as const,
    ]),
    query: { enabled: escrows.length > 0 },
  });

  const N = 8;
  const lockedTotal = escrows.reduce((acc, _, i) => {
    const st = infos?.[i * N]?.result as number | undefined;
    const amt = infos?.[i * N + 1]?.result as bigint | undefined;
    return st === 1 ? acc + (amt ?? 0n) : acc;
  }, 0n);

  return (
    <div className="min-h-screen bg-black">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 pb-24 md:px-6">
        <FadeUp className="flex flex-col gap-6 pt-12 pb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/35">
              Jeonse Escrow
            </p>
            <h1 className="font-display text-4xl tracking-tight text-white md:text-5xl">
              {t("전세 에스크로", "Jeonse Escrow")}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/40">
              {t(
                "다음 세입자의 전세금을 온체인에 락하고, 정산일에 단 한 번의 트랜잭션으로 보증금 반환과 잔금 지급을 동시에 실행합니다. 이사 날짜가 어긋나도 거래는 깨지지 않습니다.",
                "Lock the incoming tenant's deposit on-chain, then execute the refund and the balance in a single transaction on settlement day. Deals no longer break when moving dates misalign."
              )}
            </p>
          </div>
          <Link
            href="/jeonse/create"
            className="pressable inline-flex h-11 items-center gap-2 self-start rounded-full bg-white px-6 text-sm font-semibold text-black md:self-auto"
          >
            <Plus size={16} />
            {t("에스크로 개설", "New Escrow")}
          </Link>
        </FadeUp>

        <FadeUp
          delay={0.08}
          className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-3"
        >
          <div className="bg-black p-5 md:p-6">
            <p className="text-xs uppercase tracking-[0.15em] text-white/35">
              {t("전체 에스크로", "Total Escrows")}
            </p>
            <p className="mt-2 text-2xl font-medium text-white tabular-nums md:text-3xl">
              <AnimatedNumber value={escrows.length} />
            </p>
          </div>
          <div className="bg-black p-5 md:p-6">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-white/35">
              {t("락 자금 (TVL)", "Locked Funds (TVL)")}
              <InfoTip
                text={t(
                  "현재 에스크로에 잠겨(락) 정산일을 기다리는 전세금의 총합입니다. 락된 돈은 정산 전까지 누구도 꺼낼 수 없어요.",
                  "Total deposits currently locked in escrows awaiting settlement. Locked funds can't be touched by anyone until settlement."
                )}
              />
            </p>
            <p className="mt-2 text-2xl font-medium text-white tabular-nums md:text-3xl">
              <AnimatedNumber
                value={Number(lockedTotal / 10n ** 18n)}
                format={(n) => "₩" + n.toLocaleString("ko-KR")}
              />
            </p>
          </div>
          <div className="bg-black p-5 md:p-6">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-white/35">
              {t("이음 Earn 유동성", "IEUM Earn Liquidity")}
              <InfoTip
                text={t(
                  "예치·대출과 브리지 선지급을 함께 처리하는 통합 유동성 풀(이음 Earn)의 총자산입니다. 예치하면 대출 이자와 선지급 수수료를 함께 수익으로 받습니다.",
                  "Total assets of the unified IEUM Earn pool that powers both lending and bridge advances. Suppliers earn lending interest plus advance fees."
                )}
              />
            </p>
            <p className="mt-2 text-2xl font-medium text-white tabular-nums md:text-3xl">
              <AnimatedNumber
                value={Number(((poolAssets as bigint | undefined) ?? 0n) / 10n ** 18n)}
                format={(n) => "₩" + n.toLocaleString("ko-KR")}
              />
            </p>
          </div>
        </FadeUp>

        {/* First-timer guide */}
        <GuideSteps
          id="jeonse"
          title={t("전세 에스크로, 이렇게 진행돼요", "How a Jeonse escrow works")}
          steps={[
            {
              t: t("집주인이 개설", "Landlord creates"),
              d: t(
                "두 세입자의 지갑 주소, 전세금·반환 보증금, 정산일(입주일)을 정해 에스크로를 만듭니다.",
                "The landlord sets both tenants' addresses, the amounts, and the settlement (move-in) date."
              ),
            },
            {
              t: t("전세금 락", "Deposit locked"),
              d: t(
                "새로 들어올 세입자가 전세금을 컨트랙트에 잠급니다. 정산 전까지 누구도 손댈 수 없어요.",
                "The incoming tenant locks the deposit in the contract. No one can touch it before settlement."
              ),
            },
            {
              t: t("미리 받기 (선택)", "Early refund (optional)"),
              d: t(
                "이사가 급한 기존 세입자는 브리지 풀에서 보증금을 즉시 선지급받을 수 있어요 (수수료 0.5%).",
                "If moving is urgent, the outgoing tenant can get the refund advanced instantly from the pool (0.5% fee)."
              ),
            },
            {
              t: t("정산일 자동 정산", "Auto settle"),
              d: t(
                "정산일이 되면 보증금 반환·집주인 잔금이 한 트랜잭션으로 동시에 확정됩니다.",
                "On settlement day the refund and the landlord's balance finalize together in one transaction."
              ),
            },
          ]}
        />

        <FadeUp delay={0.16} className="mt-14">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-[0.15em] text-white/35">
              {t("에스크로 목록", "Escrow List")}
            </h2>
            <div className="flex items-center rounded-full border border-white/10 p-0.5 text-xs font-medium">
              {(
                [
                  ["mine", t("내 거래", "My Deals")],
                  ["all", t("전체", "All")],
                ] as const
              ).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`pressable rounded-full px-4 py-1.5 transition-colors ${
                    view === v ? "bg-white text-black" : "text-white/40 hover:text-white"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
            {!mounted && <div className="skeleton m-4 h-24" />}
            {mounted && (<>
            <div className="hidden grid-cols-[1fr_150px_150px_150px_120px_48px] gap-4 border-b border-white/[0.06] px-6 py-3 text-xs uppercase tracking-[0.12em] text-white/30 md:grid">
              <span>{t("컨트랙트", "Contract")}</span>
              <span className="text-right">{t("신규 전세금", "New Deposit")}</span>
              <span className="text-right">{t("반환 보증금", "Refund")}</span>
              <span className="text-right">{t("정산일", "Settlement")}</span>
              <span className="text-right">{t("상태", "Status")}</span>
              <span />
            </div>
            {view === "mine" && !address && (
              <div className="flex flex-col items-center gap-4 px-6 py-16">
                <p className="text-sm text-white/40">
                  {t(
                    "지갑을 연결하면 내가 당사자인 거래만 모아서 보여드려요.",
                    "Connect a wallet to see only the deals you're a party to."
                  )}
                </p>
                <button
                  onClick={() => setWalletOpen(true)}
                  className="pressable rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black"
                >
                  {t("지갑 연결", "Connect Wallet")}
                </button>
                <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
              </div>
            )}
            {(view === "all" || address) && escrows.length === 0 && (
              <p className="px-6 py-16 text-center text-sm text-white/30">
                {t("아직 개설된 에스크로가 없습니다.", "No escrows have been created yet.")}
              </p>
            )}
            {(view === "all" || address) &&
              (() => {
                const rows = [...escrows].reverse().filter((e) => {
                  if (view === "all") return true;
                  const base = escrows.indexOf(e) * N;
                  const parties = [
                    infos?.[base + 5]?.result,
                    infos?.[base + 6]?.result,
                    infos?.[base + 7]?.result,
                  ] as (string | undefined)[];
                  return parties.some(
                    (p) => p?.toLowerCase() === address?.toLowerCase()
                  );
                });
                if (view === "mine" && escrows.length > 0 && rows.length === 0)
                  return (
                    <p className="px-6 py-16 text-center text-sm text-white/30">
                      {t(
                        "이 지갑이 당사자인 거래가 아직 없어요. 에스크로를 개설하거나 전체 탭을 확인해 보세요.",
                        "This wallet isn't a party to any deals yet. Create an escrow or check the All tab."
                      )}
                    </p>
                  );
                return rows.map((e, idx) => {
              const i = escrows.indexOf(e);
              const base = i * N;
              const st = infos?.[base]?.result as number | undefined;
              const jeonse = infos?.[base + 1]?.result as bigint | undefined;
              const refund = infos?.[base + 2]?.result as bigint | undefined;
              const date = infos?.[base + 3]?.result as bigint | undefined;
              const bridged = infos?.[base + 4]?.result as boolean | undefined;
              const parties = [
                infos?.[base + 5]?.result,
                infos?.[base + 6]?.result,
                infos?.[base + 7]?.result,
              ] as (string | undefined)[];
              const mine =
                address && parties.some((p) => p?.toLowerCase() === address.toLowerCase());
              const meta = STATE_META[st ?? 0];
              return (
                <Link
                  key={e}
                  href={`/jeonse/${e}`}
                  style={{ animationDelay: `${Math.min(idx * 40, 320)}ms` }}
                  className="stagger-item group grid grid-cols-2 items-center gap-3 border-b border-white/[0.06] px-6 py-5 transition-colors last:border-b-0 hover:bg-white/[0.03] md:grid-cols-[1fr_150px_150px_150px_120px_48px] md:gap-4"
                >
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-sm text-white/70">
                    <span className="shrink-0">{shortAddr(e)}</span>
                    {mine && (
                      <span className="shrink-0 whitespace-nowrap rounded-full border border-white/15 px-2 py-0.5 text-[10px] tracking-wide text-white/50">
                        {t("내 거래", "Mine")}
                      </span>
                    )}
                    {bridged && (
                      <span className="shrink-0 whitespace-nowrap rounded-full border border-sky-400/30 px-2 py-0.5 text-[10px] tracking-wide text-sky-300">
                        {t("브리지", "Bridged")}
                      </span>
                    )}
                  </span>
                  <span className="text-right text-sm font-medium text-white tabular-nums">
                    {fmtKRW(jeonse ?? 0n)}
                  </span>
                  <span className="hidden text-right text-sm text-white/50 tabular-nums md:block">
                    {fmtKRW(refund ?? 0n)}
                  </span>
                  <span className="hidden text-right text-sm text-white/50 tabular-nums md:block">
                    {date ? new Date(Number(date) * 1000).toLocaleDateString("ko-KR") : "—"}
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
                });
              })()}
            </>)}
          </div>
        </FadeUp>
      </main>
    </div>
  );
}
