"use client";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { ArrowUpRight, FileText, Landmark, TrendingUp, User, Users } from "lucide-react";
import {
  BRIDGE_POOL_ADDRESS,
  EARN_ADDRESS,
  FACTORY_ADDRESS,
  JEONSE_FACTORY_ADDRESS,
  LEGACY_FACTORY_ADDRESS,
  LEGACY_FACTORY_ADDRESS_2,
  LEGACY_JEONSE_FACTORY_ADDRESS,
  LEGACY_JEONSE_FACTORY_ADDRESS_2,
  LEGACY_JEONSE_FACTORY_ADDRESS_3,
  LEGACY_JEONSE_FACTORY_ADDRESS_4,
  LEGACY_JEONSE_FACTORY_ADDRESS_5,
  MOCKKRW_ADDRESS,
  bridgePoolAbi,
  earnAbi,
  factoryAbi,
  fmtKRW,
  jeonseAbi,
  jeonseFactoryAbi,
  mockKrwAbi,
  rayToApy,
} from "@/lib/contracts";
import { AppNav } from "@/components/AppNav";
import { AnimatedNumber, FadeUp, useMounted } from "@/components/Motion";
import { useLang } from "@/lib/i18n";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

export default function Dashboard() {
  const { t } = useLang();
  const mounted = useMounted();
  const { address } = useAccount();
  const { writeContract, isPending: minting } = useWriteContract();

  const { data: stats, refetch } = useReadContracts({
    contracts: [
      { address: JEONSE_FACTORY_ADDRESS, abi: jeonseFactoryAbi, functionName: "getAll" },
      { address: LEGACY_JEONSE_FACTORY_ADDRESS, abi: jeonseFactoryAbi, functionName: "getAll" },
      { address: FACTORY_ADDRESS, abi: factoryAbi, functionName: "getAll" },
      { address: LEGACY_FACTORY_ADDRESS, abi: factoryAbi, functionName: "getAll" },
      { address: BRIDGE_POOL_ADDRESS, abi: bridgePoolAbi, functionName: "totalAssets" },
      { address: BRIDGE_POOL_ADDRESS, abi: bridgePoolAbi, functionName: "totalOutstanding" },
      { address: EARN_ADDRESS, abi: earnAbi, functionName: "supplyRatePerYear" },
      { address: EARN_ADDRESS, abi: earnAbi, functionName: "totalAssets" },
      { address: LEGACY_JEONSE_FACTORY_ADDRESS_2, abi: jeonseFactoryAbi, functionName: "getAll" },
      { address: LEGACY_JEONSE_FACTORY_ADDRESS_3, abi: jeonseFactoryAbi, functionName: "getAll" },
      { address: LEGACY_JEONSE_FACTORY_ADDRESS_4, abi: jeonseFactoryAbi, functionName: "getAll" },
      { address: LEGACY_FACTORY_ADDRESS_2, abi: factoryAbi, functionName: "getAll" },
      { address: LEGACY_JEONSE_FACTORY_ADDRESS_5, abi: jeonseFactoryAbi, functionName: "getAll" },
    ],
    query: { refetchInterval: 6000 },
  });

  const { data: balance } = useReadContract({
    address: MOCKKRW_ADDRESS,
    abi: mockKrwAbi,
    functionName: "balanceOf",
    args: [address ?? ZERO],
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  const escrows = [
    ...(((stats?.[1]?.result as `0x${string}`[]) ?? []) as `0x${string}`[]),
    ...(((stats?.[8]?.result as `0x${string}`[]) ?? []) as `0x${string}`[]),
    ...(((stats?.[9]?.result as `0x${string}`[]) ?? []) as `0x${string}`[]),
    ...(((stats?.[10]?.result as `0x${string}`[]) ?? []) as `0x${string}`[]),
    ...(((stats?.[12]?.result as `0x${string}`[]) ?? []) as `0x${string}`[]),
    ...(((stats?.[0]?.result as `0x${string}`[]) ?? []) as `0x${string}`[]),
  ];
  const escrowCount = escrows.length;
  const circleCount =
    ((stats?.[2]?.result as unknown[] | undefined)?.length ?? 0) +
    ((stats?.[3]?.result as unknown[] | undefined)?.length ?? 0) +
    ((stats?.[11]?.result as unknown[] | undefined)?.length ?? 0);
  const earnApy = rayToApy((stats?.[6]?.result as bigint | undefined) ?? 0n);
  const earnSupplied = (stats?.[7]?.result as bigint | undefined) ?? 0n;
  const myBalance = (balance as bigint | undefined) ?? 0n;

  const { data: escInfos } = useReadContracts({
    contracts: escrows.flatMap((e) => [
      { address: e, abi: jeonseAbi, functionName: "state" } as const,
      { address: e, abi: jeonseAbi, functionName: "jeonseAmount" } as const,
    ]),
    query: { enabled: escrows.length > 0, refetchInterval: 8000 },
  });
  const lockedEscrow = escrows.reduce((acc, _, i) => {
    const st = escInfos?.[i * 2]?.result as number | undefined;
    const amt = escInfos?.[i * 2 + 1]?.result as bigint | undefined;
    return st === 1 ? acc + (amt ?? 0n) : acc;
  }, 0n);
  // 통합: 이음 Earn 유동성(브리지 통합) + 전세 락.
  // 구 BridgePool(poolAssets)은 Earn으로 융화되어 더 이상 합산하지 않음 — /earn 의 totalAssets 와 일치시킴.
  const tvl = earnSupplied + lockedEscrow;

  const features = [
    {
      href: "/jeonse",
      icon: FileText,
      tag: t("메인", "Core"),
      title: t("전세 에스크로", "Jeonse Escrow"),
      desc: t(
        "신규 세입자의 전세금을 락하고, 정산일에 보증금 반환과 잔금 지급을 한 트랜잭션으로 동시에 실행합니다.",
        "Lock the incoming deposit; refund and balance settle together in one transaction."
      ),
      stat: t(`${escrowCount}건 · 락 ${fmtKRW(lockedEscrow)}`, `${escrowCount} deals · ${fmtKRW(lockedEscrow)} locked`),
    },
    {
      href: "/earn",
      icon: TrendingUp,
      tag: `APY ${earnApy.toFixed(1)}%`,
      title: t("이음 Earn", "IEUM Earn"),
      desc: t(
        "mKRW를 예치해 대출 이자로 실질 연이자를 받고, mETH 담보로 대출받습니다. 역전세 부족분 조달과 이음 수익의 핵심.",
        "Supply mKRW for real yield from borrower interest; borrow against mETH collateral. Core of reverse-jeonse loans and protocol revenue."
      ),
      stat: t(`예치 APY ${earnApy.toFixed(2)}% · 유동성 ${fmtKRW(earnSupplied)}`, `${earnApy.toFixed(2)}% APY · ${fmtKRW(earnSupplied)}`),
    },
    {
      href: "/app",
      icon: Users,
      tag: null,
      title: t("계모임", "Gye Circles"),
      desc: t(
        "계주 없는 온체인 계. 초대 링크로 모이고 온체인 추첨으로 순번을 정해 순서대로 곗돈을 받습니다.",
        "Organizer-free rotating savings. Gather by invite, draw the order on-chain, collect in turn."
      ),
      stat: t(`${circleCount}개 운영 중`, `${circleCount} circles`),
    },
    {
      href: "/me",
      icon: User,
      tag: null,
      title: t("마이페이지", "My Page"),
      desc: t(
        "내 자산과 거래 내역을 한곳에서. mKRW·가스·수령 가능 금액과 참여 중인 계·전세 거래를 확인합니다.",
        "Your assets and activity in one place: balances, claimables, and the deals you're in."
      ),
      stat:
        mounted && address
          ? t(`내 잔액 ${fmtKRW(myBalance)}`, `${fmtKRW(myBalance)}`)
          : t("지갑 연결 필요", "Connect wallet"),
    },
  ];

  const quick = [
    { href: "/jeonse/create", label: t("에스크로 개설", "New Escrow") },
    { href: "/create", label: t("계모임 개설", "New Circle") },
    { href: "/earn", label: t("예치·대출", "Earn") },
  ];

  const kicker = "text-[11px] uppercase tracking-[0.22em] text-white/30";

  return (
    <div className="min-h-screen bg-black">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 pb-28 md:px-6">
        {/* 헤더 */}
        <FadeUp className="pt-12 pb-8 md:pt-16">
          <p className={`mb-2.5 ${kicker}`}>IEUM Protocol</p>
          <h1 className="font-display text-4xl tracking-tight text-white md:text-5xl">
            {t("대시보드", "Dashboard")}
          </h1>
        </FadeUp>

        {/* 총 예치 자산 — 박스 (기능 박스들과 폭·정렬 일치) */}
        <FadeUp
          delay={0.05}
          className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-8"
        >
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={kicker}>{t("총 예치 자산", "Total Value Locked")}</p>
              <p className="mt-3 font-display text-5xl tracking-tight text-white tabular-nums md:text-[3.75rem] md:leading-[1]">
                <AnimatedNumber
                  value={Number(tvl / 10n ** 18n)}
                  format={(n) => "₩" + n.toLocaleString("ko-KR")}
                />
              </p>
              <p className="mt-3 text-xs text-white/35">
                {t(
                  `이음 Earn ${fmtKRW(earnSupplied)}  ·  전세 락 ${fmtKRW(lockedEscrow)}`,
                  `IEUM Earn ${fmtKRW(earnSupplied)}  ·  Jeonse locked ${fmtKRW(lockedEscrow)}`
                )}
              </p>
            </div>
            <dl className="grid grid-cols-3 divide-x divide-white/[0.09] md:flex md:items-stretch">
              {[
                { k: t("에스크로", "Escrows"), v: String(escrowCount), accent: false },
                { k: t("계모임", "Circles"), v: String(circleCount), accent: false },
                { k: t("Earn APY", "Earn APY"), v: `${earnApy.toFixed(1)}%`, accent: true },
              ].map((c) => (
                <div key={c.k} className="px-4 text-left first:pl-0 last:pr-0 md:px-6 md:text-right">
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-white/30">{c.k}</dt>
                  <dd
                    className={`mt-1.5 text-lg font-medium tabular-nums md:text-xl ${
                      c.accent ? "text-emerald-300" : "text-white"
                    }`}
                  >
                    {c.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </FadeUp>

        {/* 기능 박스 */}
        <FadeUp delay={0.12} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {features.map((f, i) => (
            <Link
              key={f.href}
              href={f.href}
              className="group flex flex-col justify-between gap-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-colors hover:border-white/20 hover:bg-white/[0.04] md:p-7"
            >
              <div>
                <div className="mb-5 flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/70">
                      <f.icon size={18} strokeWidth={1.5} />
                    </span>
                    <span className="font-mono text-xs text-white/25 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </span>
                  {f.tag && (
                    <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-medium tabular-nums text-white/50">
                      {f.tag}
                    </span>
                  )}
                </div>
                <h2 className="flex items-center gap-1.5 text-lg tracking-tight text-white">
                  {f.title}
                  <ArrowUpRight
                    size={16}
                    strokeWidth={1.5}
                    className="text-white/20 transition-all group-hover:translate-x-0.5 group-hover:text-white/60"
                  />
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/40">{f.desc}</p>
              </div>
              <p className="border-t border-white/[0.06] pt-4 text-xs text-white/40 tabular-nums">
                {f.stat}
              </p>
            </Link>
          ))}
        </FadeUp>

        {/* 빠른 작업 */}
        <FadeUp delay={0.18} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quick.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="pressable flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:border-white/20 hover:text-white"
            >
              <span className="truncate">{q.label}</span>
              <ArrowUpRight size={14} strokeWidth={1.5} className="shrink-0 text-white/30" />
            </Link>
          ))}
          {mounted && address ? (
            <button
              disabled={minting}
              onClick={() =>
                writeContract(
                  { address: MOCKKRW_ADDRESS, abi: mockKrwAbi, functionName: "faucet" },
                  { onSuccess: () => setTimeout(() => refetch(), 2000) }
                )
              }
              className="pressable flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:border-white/20 hover:text-white disabled:opacity-40"
            >
              <span className="truncate">{minting ? t("발급 중…", "Minting…") : t("테스트 원화 발급", "Mint KRW")}</span>
            </button>
          ) : (
            <a
              href="https://faucet.giwa.io"
              target="_blank"
              rel="noreferrer"
              className="pressable flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:border-white/20 hover:text-white"
            >
              <span className="truncate">{t("가스 받기", "Get gas")}</span>
              <ArrowUpRight size={14} strokeWidth={1.5} className="shrink-0 text-white/30" />
            </a>
          )}
        </FadeUp>

        <p className="mt-16 border-t border-white/[0.06] pt-6 text-xs leading-relaxed text-white/25">
          {t(
            "GIWA Sepolia 테스트넷에서 동작하는 데모입니다. 납입 통화는 모의 원화(mKRW)이며 무료로 발급받을 수 있습니다.",
            "A demo on GIWA Sepolia testnet. Payments use mock KRW (mKRW), mintable for free."
          )}
        </p>
      </main>
    </div>
  );
}
