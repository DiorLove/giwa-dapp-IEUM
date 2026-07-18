"use client";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import {
  ArrowUpRight,
  Coins,
  FileText,
  Fuel,
  Landmark,
  Plus,
  User,
  Users,
} from "lucide-react";
import {
  BRIDGE_POOL_ADDRESS,
  FACTORY_ADDRESS,
  JEONSE_FACTORY_ADDRESS,
  LEGACY_FACTORY_ADDRESS,
  LEGACY_JEONSE_FACTORY_ADDRESS,
  MOCKKRW_ADDRESS,
  bridgePoolAbi,
  factoryAbi,
  fmtKRW,
  jeonseFactoryAbi,
  mockKrwAbi,
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

  const escrowCount =
    ((stats?.[0]?.result as unknown[] | undefined)?.length ?? 0) +
    ((stats?.[1]?.result as unknown[] | undefined)?.length ?? 0);
  const circleCount =
    ((stats?.[2]?.result as unknown[] | undefined)?.length ?? 0) +
    ((stats?.[3]?.result as unknown[] | undefined)?.length ?? 0);
  const poolAssets = (stats?.[4]?.result as bigint | undefined) ?? 0n;
  const poolOutstanding = (stats?.[5]?.result as bigint | undefined) ?? 0n;
  const myBalance = (balance as bigint | undefined) ?? 0n;

  // 브리지 풀 예상 APY (pool 페이지와 동일 모델: 0.5% × 연 회전수 26 × 이용률)
  const utilization =
    poolAssets > 0n ? Number((poolOutstanding * 1_000_000n) / poolAssets) / 1_000_000 : 0;
  const poolApy = 0.005 * 26 * utilization * 100;

  const label = "text-xs uppercase tracking-[0.15em] text-white/35";

  const features = [
    {
      href: "/jeonse",
      icon: FileText,
      badge: t("메인", "Core"),
      title: t("전세 에스크로", "Jeonse Escrow"),
      desc: t(
        "신규 세입자의 전세금을 락하고, 정산일에 보증금 반환과 잔금 지급을 한 트랜잭션으로 동시에 실행합니다.",
        "Lock the incoming deposit; refund and balance settle together in one transaction."
      ),
      stat: t(`전체 ${escrowCount}건`, `${escrowCount} deals`),
    },
    {
      href: "/pool",
      icon: Landmark,
      title: t("브리지 풀", "Bridge Pool"),
      desc: t(
        "이사 날짜 사이 며칠을 잇는 초단기 유동성. 예치하면 선지급 수수료를 수익으로 받습니다.",
        "Ultra-short liquidity bridging moving-date gaps. Deposit to earn the advance fees."
      ),
      stat: t(
        `예상 APY ${poolApy.toFixed(1)}% · 풀 자산 ${fmtKRW(poolAssets)}`,
        `~${poolApy.toFixed(1)}% APY · ${fmtKRW(poolAssets)} pooled`
      ),
    },
    {
      href: "/app",
      icon: Users,
      title: t("계모임", "Gye Circles"),
      desc: t(
        "계주 없는 온체인 계. 초대 링크로 모이고 온체인 추첨으로 순번을 정해 순서대로 곗돈을 받습니다.",
        "Organizer-free rotating savings. Gather by invite, draw the order on-chain, collect in turn."
      ),
      stat: t(`전체 ${circleCount}개`, `${circleCount} circles`),
    },
    {
      href: "/me",
      icon: User,
      title: t("마이페이지", "My Page"),
      desc: t(
        "내 자산과 거래 내역을 한곳에서. mKRW·가스·수령 가능 금액과 참여 중인 계·전세 거래를 확인합니다.",
        "Your assets and activity in one place: balances, claimables, and the deals you're in."
      ),
      stat:
        mounted && address
          ? t(`내 잔액 ${fmtKRW(myBalance)}`, `${fmtKRW(myBalance)} balance`)
          : t("지갑 연결 필요", "Connect wallet"),
    },
  ];

  return (
    <div className="min-h-screen bg-black">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 pb-24 md:px-6">
        {/* 헤더 */}
        <FadeUp className="pt-12 pb-8 md:pt-14">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/35">IEUM</p>
          <h1 className="font-display text-4xl tracking-tight text-white md:text-5xl">
            {t("대시보드", "Dashboard")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/40">
            {t(
              "한국인의 목돈이 움직이는 세 갈래 길 — 전세금, 이사 잔금, 곗돈. 원하는 기능을 골라 시작하세요.",
              "Three paths where Korea's big money moves — jeonse deposits, moving-day balances, and savings circles. Pick one to begin."
            )}
          </p>
        </FadeUp>

        {/* 프로토콜 요약 */}
        <FadeUp
          delay={0.06}
          className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] md:grid-cols-4"
        >
          {[
            { k: t("전세 에스크로", "Escrows"), v: <AnimatedNumber value={escrowCount} /> },
            { k: t("계모임", "Circles"), v: <AnimatedNumber value={circleCount} /> },
            {
              k: t("브리지 풀 자산", "Pool Assets"),
              v: (
                <AnimatedNumber
                  value={Number(poolAssets / 10n ** 18n)}
                  format={(n) => "₩" + n.toLocaleString("ko-KR")}
                />
              ),
            },
            {
              k: t("내 mKRW", "My mKRW"),
              v:
                mounted && address ? (
                  <AnimatedNumber
                    value={Number(myBalance / 10n ** 18n)}
                    format={(n) => "₩" + n.toLocaleString("ko-KR")}
                  />
                ) : (
                  "—"
                ),
            },
          ].map((s) => (
            <div key={String(s.k)} className="bg-black p-5 md:p-6">
              <p className={label}>{s.k}</p>
              <p className="mt-2 text-xl font-medium text-white tabular-nums md:text-2xl">{s.v}</p>
            </div>
          ))}
        </FadeUp>

        {/* 기능 카드 */}
        <FadeUp delay={0.12} className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          {features.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group flex flex-col justify-between gap-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-colors hover:border-white/20 hover:bg-white/[0.04] md:p-7"
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80">
                    <f.icon size={20} />
                  </span>
                  {f.badge && (
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                      {f.badge}
                    </span>
                  )}
                </div>
                <h2 className="flex items-center gap-2 text-lg font-medium text-white">
                  {f.title}
                  <ArrowUpRight
                    size={16}
                    className="text-white/25 transition-all group-hover:translate-x-0.5 group-hover:text-white/60"
                  />
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/45">{f.desc}</p>
              </div>
              <p className="text-xs text-white/40 tabular-nums">{f.stat}</p>
            </Link>
          ))}
        </FadeUp>

        {/* 빠른 작업 + 테스트 자금 */}
        <FadeUp delay={0.18} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { href: "/jeonse/create", icon: Plus, label: t("에스크로 개설", "New Escrow") },
            { href: "/create", icon: Users, label: t("계모임 개설", "New Circle") },
            { href: "/pool", icon: Landmark, label: t("풀 예치", "Deposit to Pool") },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="pressable flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:border-white/20 hover:text-white"
            >
              <a.icon size={16} className="shrink-0 text-white/40" />
              <span className="truncate">{a.label}</span>
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
              className="pressable flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:border-white/20 hover:text-white disabled:opacity-40"
            >
              <Coins size={16} className="shrink-0 text-white/40" />
              <span className="truncate">
                {minting ? t("발급 중", "Minting") : t("테스트 원화 발급", "Mint Test KRW")}
              </span>
            </button>
          ) : (
            <a
              href="https://faucet.giwa.io"
              target="_blank"
              rel="noreferrer"
              className="pressable flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:border-white/20 hover:text-white"
            >
              <Fuel size={16} className="shrink-0 text-white/40" />
              <span className="truncate">{t("가스 받기", "Get Gas")}</span>
            </a>
          )}
        </FadeUp>

        <p className="mt-10 text-xs leading-relaxed text-white/25">
          {t(
            "GIWA Sepolia 테스트넷에서 동작하는 데모입니다. 납입 통화는 모의 원화(mKRW)이며 무료로 발급받을 수 있습니다.",
            "A demo on GIWA Sepolia testnet. Payments use mock KRW (mKRW), mintable for free."
          )}
        </p>
      </main>
    </div>
  );
}
