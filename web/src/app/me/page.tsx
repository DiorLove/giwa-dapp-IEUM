"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  useAccount,
  useBalance,
  useDisconnect,
  usePublicClient,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import { parseAbiItem } from "viem";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Copy,
  Fuel,
  Landmark,
  LogOut,
  Plus,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { giwaSepolia } from "@/lib/chain";
import {
  BRIDGE_POOL_ADDRESS,
  FACTORY_ADDRESS,
  JEONSE_FACTORY_ADDRESS,
  LEGACY_FACTORY_ADDRESS,
  LEGACY_JEONSE_FACTORY_ADDRESS,
  MOCKKRW_ADDRESS,
  bridgePoolAbi,
  explorerUrl,
  factoryAbi,
  fmtKRW,
  jeonseAbi,
  jeonseFactoryAbi,
  mockKrwAbi,
  mulleAbi,
  shortAddr,
} from "@/lib/contracts";
import { AppNav } from "@/components/AppNav";
import { AnimatedNumber, FadeUp, useMounted } from "@/components/Motion";
import { WalletModal } from "@/components/WalletModal";
import { useLang } from "@/lib/i18n";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

const CIRCLE_STATE: { label: [string, string]; cls: string }[] = [
  { label: ["모집 중", "Recruiting"], cls: "border-amber-400/30 text-amber-300" },
  { label: ["진행 중", "Active"], cls: "border-emerald-400/30 text-emerald-300" },
  { label: ["완주", "Completed"], cls: "border-indigo-400/30 text-indigo-300" },
  { label: ["종료", "Closed"], cls: "border-white/15 text-white/40" },
];
const ESCROW_STATE: { label: [string, string]; cls: string }[] = [
  { label: ["자금 대기", "Awaiting"], cls: "border-amber-400/30 text-amber-300" },
  { label: ["락 완료", "Funded"], cls: "border-emerald-400/30 text-emerald-300" },
  { label: ["정산 완료", "Settled"], cls: "border-indigo-400/30 text-indigo-300" },
  { label: ["취소됨", "Cancelled"], cls: "border-white/15 text-white/40" },
];

type Flow = {
  dir: "in" | "out" | "mint";
  counterparty: string;
  value: bigint;
  hash: string;
  ts?: number;
};

const TRANSFER = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

export default function MyPage() {
  const { t } = useLang();
  const mounted = useMounted();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { disconnect } = useDisconnect();
  const { writeContract, isPending: minting } = useWriteContract();
  const [copied, setCopied] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [flowsLoading, setFlowsLoading] = useState(false);

  // mKRW Transfer 로그에서 자금 흐름 이력 구성 (받음/보냄/발급)
  useEffect(() => {
    if (!address || !publicClient) return;
    let cancelled = false;
    (async () => {
      setFlowsLoading(true);
      try {
        // GIWA RPC 는 getLogs 범위를 제한하므로(약 10만 블록) 최신부터 청크로 역순 조회.
        // 최근 이력 12건을 채우거나 최대 청크 수에 도달하면 멈춘다.
        const CHUNK = 90_000n;
        const MAX_CHUNKS = 8;
        const latest = await publicClient.getBlockNumber();
        const logs: {
          blockNumber: bigint | null;
          logIndex: number | null;
          transactionHash: `0x${string}` | null;
          args: { from?: `0x${string}`; to?: `0x${string}`; value?: bigint };
        }[] = [];
        let hi = latest;
        for (let c = 0; c < MAX_CHUNKS && logs.length < 12; c++) {
          const lo = hi > CHUNK ? hi - CHUNK : 0n;
          const [ins, outs] = await Promise.all([
            publicClient.getLogs({
              address: MOCKKRW_ADDRESS,
              event: TRANSFER,
              args: { to: address },
              fromBlock: lo,
              toBlock: hi,
            }),
            publicClient.getLogs({
              address: MOCKKRW_ADDRESS,
              event: TRANSFER,
              args: { from: address },
              fromBlock: lo,
              toBlock: hi,
            }),
          ]);
          logs.push(...ins, ...outs);
          if (lo === 0n) break;
          hi = lo - 1n;
        }

        logs.sort((a, b) => {
          const ba = a.blockNumber ?? 0n;
          const bb = b.blockNumber ?? 0n;
          if (ba !== bb) return bb > ba ? 1 : -1;
          return (b.logIndex ?? 0) - (a.logIndex ?? 0);
        });
        const top = logs.slice(0, 12);

        // 블록 타임스탬프 (중복 제거 후 배치 조회)
        const blockNums = [
          ...new Set(top.map((l) => l.blockNumber).filter((b): b is bigint => b != null)),
        ];
        const blocks = await Promise.all(
          blockNums.map((bn) => publicClient.getBlock({ blockNumber: bn }))
        );
        const tsMap = new Map(blocks.map((b) => [b.number, Number(b.timestamp)]));

        const meLower = address.toLowerCase();
        const items: Flow[] = top.map((l) => {
          const from = (l.args.from as string) ?? "";
          const to = (l.args.to as string) ?? "";
          const incoming = to.toLowerCase() === meLower;
          const isMint = from === ZERO;
          return {
            dir: isMint && incoming ? "mint" : incoming ? "in" : "out",
            counterparty: incoming ? from : to,
            value: (l.args.value as bigint) ?? 0n,
            hash: l.transactionHash ?? "",
            ts: l.blockNumber != null ? tsMap.get(l.blockNumber) : undefined,
          };
        });
        if (!cancelled) setFlows(items);
      } catch {
        if (!cancelled) setFlows([]);
      } finally {
        if (!cancelled) setFlowsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, publicClient]);

  const me = address ?? ZERO;
  const enabled = !!address;

  // 네이티브 ETH(가스) 잔액
  const { data: eth } = useBalance({
    address,
    chainId: giwaSepolia.id,
    query: { enabled, refetchInterval: enabled ? 8000 : undefined },
  });
  const lowGas = !!eth && eth.value < 10n ** 15n; // < 0.001 ETH

  const { data: base, refetch } = useReadContracts({
    contracts: [
      { address: FACTORY_ADDRESS, abi: factoryAbi, functionName: "getAll" },
      { address: LEGACY_FACTORY_ADDRESS, abi: factoryAbi, functionName: "getAll" },
      { address: JEONSE_FACTORY_ADDRESS, abi: jeonseFactoryAbi, functionName: "getAll" },
      { address: LEGACY_JEONSE_FACTORY_ADDRESS, abi: jeonseFactoryAbi, functionName: "getAll" },
      { address: BRIDGE_POOL_ADDRESS, abi: bridgePoolAbi, functionName: "totalAssets" },
      { address: BRIDGE_POOL_ADDRESS, abi: bridgePoolAbi, functionName: "totalShares" },
      { address: BRIDGE_POOL_ADDRESS, abi: bridgePoolAbi, functionName: "shares", args: [me] },
      { address: MOCKKRW_ADDRESS, abi: mockKrwAbi, functionName: "balanceOf", args: [me] },
    ],
    query: { enabled, refetchInterval: enabled ? 5000 : undefined },
  });

  const circles = [
    ...(((base?.[1]?.result as `0x${string}`[]) ?? []) as `0x${string}`[]),
    ...(((base?.[0]?.result as `0x${string}`[]) ?? []) as `0x${string}`[]),
  ];
  const escrows = [
    ...(((base?.[3]?.result as `0x${string}`[]) ?? []) as `0x${string}`[]),
    ...(((base?.[2]?.result as `0x${string}`[]) ?? []) as `0x${string}`[]),
  ];
  const totalAssets = (base?.[4]?.result as bigint | undefined) ?? 0n;
  const totalShares = (base?.[5]?.result as bigint | undefined) ?? 0n;
  const myShares = (base?.[6]?.result as bigint | undefined) ?? 0n;
  const balance = (base?.[7]?.result as bigint | undefined) ?? 0n;
  const poolValue = totalShares > 0n ? (myShares * totalAssets) / totalShares : 0n;

  const { data: cInfos } = useReadContracts({
    contracts: circles.flatMap((m) => [
      { address: m, abi: mulleAbi, functionName: "isMember", args: [me] } as const,
      { address: m, abi: mulleAbi, functionName: "contribution" } as const,
      { address: m, abi: mulleAbi, functionName: "state" } as const,
      { address: m, abi: mulleAbi, functionName: "claimable", args: [me] } as const,
      { address: m, abi: mulleAbi, functionName: "maxMembers" } as const,
    ]),
    query: { enabled: enabled && circles.length > 0, refetchInterval: 5000 },
  });

  const { data: eInfos } = useReadContracts({
    contracts: escrows.flatMap((e) => [
      { address: e, abi: jeonseAbi, functionName: "landlord" } as const,
      { address: e, abi: jeonseAbi, functionName: "tenantIn" } as const,
      { address: e, abi: jeonseAbi, functionName: "tenantOut" } as const,
      { address: e, abi: jeonseAbi, functionName: "jeonseAmount" } as const,
      { address: e, abi: jeonseAbi, functionName: "state" } as const,
      { address: e, abi: jeonseAbi, functionName: "claimable", args: [me] } as const,
    ]),
    query: { enabled: enabled && escrows.length > 0, refetchInterval: 5000 },
  });

  const lower = address?.toLowerCase();
  const myCircles = circles
    .map((m, i) => ({
      addr: m,
      isMember: cInfos?.[i * 5]?.result as boolean | undefined,
      contribution: (cInfos?.[i * 5 + 1]?.result as bigint | undefined) ?? 0n,
      state: (cInfos?.[i * 5 + 2]?.result as number | undefined) ?? 0,
      claimable: (cInfos?.[i * 5 + 3]?.result as bigint | undefined) ?? 0n,
      maxMembers: (cInfos?.[i * 5 + 4]?.result as number | undefined) ?? 0,
    }))
    .filter((c) => c.isMember)
    .reverse();

  const myEscrows = escrows
    .map((e, i) => {
      const parties = [
        eInfos?.[i * 6]?.result,
        eInfos?.[i * 6 + 1]?.result,
        eInfos?.[i * 6 + 2]?.result,
      ] as (string | undefined)[];
      let role: [string, string] = ["당사자", "Party"];
      if (parties[0]?.toLowerCase() === lower) role = ["집주인", "Landlord"];
      else if (parties[1]?.toLowerCase() === lower) role = ["신규 세입자", "Incoming"];
      else if (parties[2]?.toLowerCase() === lower) role = ["기존 세입자", "Outgoing"];
      return {
        addr: e,
        mine: parties.some((p) => p?.toLowerCase() === lower),
        role,
        amount: (eInfos?.[i * 6 + 3]?.result as bigint | undefined) ?? 0n,
        state: (eInfos?.[i * 6 + 4]?.result as number | undefined) ?? 0,
        claimable: (eInfos?.[i * 6 + 5]?.result as bigint | undefined) ?? 0n,
      };
    })
    .filter((e) => e.mine)
    .reverse();

  const claimableTotal =
    myCircles.reduce((a, c) => a + c.claimable, 0n) +
    myEscrows.reduce((a, e) => a + e.claimable, 0n);

  async function copy() {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  const label = "text-xs uppercase tracking-[0.15em] text-white/35";

  return (
    <div className="min-h-screen bg-black">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 pb-24 md:px-6">
        {/* 헤더 */}
        <FadeUp className="flex flex-col gap-6 pt-12 pb-10 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-4">
            <span
              className="h-14 w-14 shrink-0 rounded-full ring-1 ring-white/10"
              style={{
                background: "conic-gradient(from 140deg, #f5c451, #b07c2b, #f5c451, #d9a441)",
              }}
            />
            <div>
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-white/35">
                {t("마이페이지", "My Page")}
              </p>
              <h1 className="font-mono text-2xl tracking-tight text-white md:text-3xl">
                {mounted && address ? shortAddr(address) : "—"}
              </h1>
            </div>
          </div>
          {mounted && address && (
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                onClick={copy}
                className="pressable inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-2 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white"
              >
                {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                {copied ? t("복사됨", "Copied") : t("주소 복사", "Copy")}
              </button>
              <a
                href={explorerUrl(`address/${address}`)}
                target="_blank"
                rel="noreferrer"
                className="pressable inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] px-3.5 py-2 text-sm text-white/40 transition-colors hover:text-white"
              >
                {t("익스플로러", "Explorer")}
                <ArrowUpRight size={14} />
              </a>
              <button
                onClick={() => disconnect()}
                aria-label={t("연결 해제", "Disconnect")}
                className="pressable inline-flex items-center gap-1.5 rounded-full border border-red-400/20 px-3.5 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-400/10"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </FadeUp>

        {mounted && !isConnected ? (
          <FadeUp className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/15 py-20">
            <p className="text-sm text-white/40">
              {t("지갑을 연결하면 내 자산과 거래 내역을 볼 수 있어요.", "Connect a wallet to see your assets and activity.")}
            </p>
            <button
              onClick={() => setWalletOpen(true)}
              className="pressable rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black"
            >
              {t("지갑 연결", "Connect Wallet")}
            </button>
            <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
          </FadeUp>
        ) : (
          <>
            {/* 총 보유 자산 히어로 */}
            <FadeUp delay={0.08} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className={label}>{t("총 보유 자산 (mKRW 기준)", "Net Worth (in mKRW)")}</p>
                  <p className="mt-2 font-display text-4xl tracking-tight text-white tabular-nums md:text-5xl">
                    <AnimatedNumber
                      value={Number((balance + poolValue + claimableTotal) / 10n ** 18n)}
                      format={(n) => "₩" + n.toLocaleString("ko-KR")}
                    />
                  </p>
                  <p className="mt-2 text-xs text-white/35">
                    {t("지갑 잔액 + 풀 예치 + 수령 가능", "Wallet + pool deposit + claimable")}
                  </p>
                </div>
                {lowGas && (
                  <a
                    href="https://faucet.giwa.io"
                    target="_blank"
                    rel="noreferrer"
                    className="pressable inline-flex items-center gap-1.5 self-start rounded-full border border-amber-400/30 bg-amber-400/5 px-4 py-2 text-xs font-medium text-amber-300 md:self-auto"
                  >
                    <Fuel size={13} />
                    {t("가스(ETH)가 부족해요 — 받기", "Low on gas — get ETH")}
                  </a>
                )}
              </div>
            </FadeUp>

            {/* 자산 타일 */}
            <FadeUp
              delay={0.12}
              className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] lg:grid-cols-4"
            >
              <div className="bg-black p-5 md:p-6">
                <div className="flex items-start justify-between">
                  <p className={label}>{t("mKRW 잔액", "mKRW")}</p>
                  <button
                    disabled={minting}
                    onClick={() =>
                      writeContract(
                        { address: MOCKKRW_ADDRESS, abi: mockKrwAbi, functionName: "faucet" },
                        { onSuccess: () => setTimeout(() => refetch(), 2000) }
                      )
                    }
                    className="pressable rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-medium text-white/60 transition-colors hover:border-white/30 hover:text-white disabled:opacity-40"
                  >
                    {minting ? t("발급 중", "Minting") : t("발급", "Mint")}
                  </button>
                </div>
                <p className="mt-2 text-xl font-medium text-white tabular-nums md:text-2xl">
                  <AnimatedNumber
                    value={Number(balance / 10n ** 18n)}
                    format={(n) => "₩" + n.toLocaleString("ko-KR")}
                  />
                </p>
              </div>
              <div className="bg-black p-5 md:p-6">
                <p className={label}>{t("가스 (ETH)", "Gas (ETH)")}</p>
                <p className={`mt-2 text-xl font-medium tabular-nums md:text-2xl ${lowGas ? "text-amber-300" : "text-white"}`}>
                  {eth ? Number(eth.formatted).toFixed(4) : "—"}
                </p>
              </div>
              <div className="bg-black p-5 md:p-6">
                <p className={label}>{t("브리지 풀 예치", "Pool Deposit")}</p>
                <p className="mt-2 text-xl font-medium text-white tabular-nums md:text-2xl">
                  <AnimatedNumber
                    value={Number(poolValue / 10n ** 18n)}
                    format={(n) => "₩" + n.toLocaleString("ko-KR")}
                  />
                </p>
              </div>
              <div className="bg-black p-5 md:p-6">
                <p className={label}>{t("수령 가능", "Claimable")}</p>
                <p
                  className={`mt-2 text-xl font-medium tabular-nums md:text-2xl ${
                    claimableTotal > 0n ? "text-emerald-300" : "text-white"
                  }`}
                >
                  <AnimatedNumber
                    value={Number(claimableTotal / 10n ** 18n)}
                    format={(n) => "₩" + n.toLocaleString("ko-KR")}
                  />
                </p>
              </div>
            </FadeUp>

            {/* 빠른 작업 */}
            <FadeUp delay={0.16} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { href: "/jeonse/create", icon: Plus, label: t("에스크로 개설", "New Escrow") },
                { href: "/create", icon: Users, label: t("계모임 개설", "New Circle") },
                { href: "/pool", icon: Landmark, label: t("풀 예치", "Deposit to Pool") },
                { href: "/jeonse", icon: Wallet, label: t("전세 거래 보기", "Browse Deals") },
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
            </FadeUp>

            {/* 자금 흐름 (mKRW 이력) */}
            <FadeUp delay={0.18} className="mt-14">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm uppercase tracking-[0.15em] text-white/35">
                  {t("자금 흐름 (mKRW)", "Money Flow (mKRW)")}
                  {flows.length > 0 && <span className="ml-2 text-white/25">{flows.length}</span>}
                </h2>
                <a
                  href={explorerUrl(`address/${address}`)}
                  target="_blank"
                  rel="noreferrer"
                  className="pressable text-xs text-white/40 hover:text-white"
                >
                  {t("전체 내역 →", "Full history →")}
                </a>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
                {flowsLoading && flows.length === 0 && <div className="skeleton m-4 h-16" />}
                {!flowsLoading && flows.length === 0 && (
                  <p className="px-6 py-14 text-center text-sm text-white/30">
                    {t("아직 자금 이동 내역이 없습니다.", "No money movements yet.")}
                  </p>
                )}
                {flows.map((f, i) => {
                  const inbound = f.dir === "in" || f.dir === "mint";
                  const meta =
                    f.dir === "mint"
                      ? { icon: Sparkles, label: t("테스트 발급", "Minted"), cls: "text-amber-300" }
                      : f.dir === "in"
                        ? { icon: ArrowDownLeft, label: t("받음", "Received"), cls: "text-emerald-300" }
                        : { icon: ArrowUpRight, label: t("보냄", "Sent"), cls: "text-white/70" };
                  return (
                    <a
                      key={`${f.hash}-${i}`}
                      href={explorerUrl(`tx/${f.hash}`)}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3.5 transition-colors last:border-b-0 hover:bg-white/[0.03] md:px-6"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] ${meta.cls}`}
                        >
                          <meta.icon size={15} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm text-white/80">{meta.label}</span>
                          <span className="block truncate font-mono text-[11px] text-white/35">
                            {f.dir === "mint"
                              ? t("파우셋", "Faucet")
                              : `${inbound ? t("보낸 사람", "from") : t("받는 사람", "to")} ${shortAddr(f.counterparty)}`}
                            {f.ts ? ` · ${new Date(f.ts * 1000).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}
                          </span>
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-sm font-medium tabular-nums ${inbound ? "text-emerald-300" : "text-white/70"}`}
                      >
                        {inbound ? "+" : "−"}
                        {fmtKRW(f.value)}
                      </span>
                    </a>
                  );
                })}
              </div>
            </FadeUp>

            {/* 내 계모임 */}
            <FadeUp delay={0.16} className="mt-14">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm uppercase tracking-[0.15em] text-white/35">
                  {t("참여 중인 계모임", "My Circles")}
                  <span className="ml-2 text-white/25">{myCircles.length}</span>
                </h2>
                <Link href="/app" className="pressable text-xs text-white/40 hover:text-white">
                  {t("계모임 홈 →", "All circles →")}
                </Link>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
                {myCircles.length === 0 ? (
                  <p className="px-6 py-14 text-center text-sm text-white/30">
                    {t("참여 중인 계가 없습니다.", "No circles yet.")}
                  </p>
                ) : (
                  myCircles.map((c) => {
                    const meta = CIRCLE_STATE[c.state];
                    return (
                      <Link
                        key={c.addr}
                        href={`/g/${c.addr}`}
                        className="group flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4 transition-colors last:border-b-0 hover:bg-white/[0.03] md:px-6"
                      >
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-sm text-white/70">
                          <span className="shrink-0">{shortAddr(c.addr)}</span>
                          <span className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] ${meta.cls}`}>
                            {t(meta.label[0], meta.label[1])}
                          </span>
                          {c.claimable > 0n && (
                            <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                              {t("수령", "Claim")} {fmtKRW(c.claimable)}
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-3 text-sm text-white/50 tabular-nums">
                          {fmtKRW(c.contribution)}
                          <span className="hidden text-white/25 sm:inline">/ {t("회", "rd")}</span>
                          <ArrowUpRight size={15} className="text-white/25 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            </FadeUp>

            {/* 내 전세 거래 */}
            <FadeUp delay={0.2} className="mt-12">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm uppercase tracking-[0.15em] text-white/35">
                  {t("내 전세 거래", "My Jeonse Deals")}
                  <span className="ml-2 text-white/25">{myEscrows.length}</span>
                </h2>
                <Link href="/jeonse" className="pressable text-xs text-white/40 hover:text-white">
                  {t("전세 홈 →", "All deals →")}
                </Link>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
                {myEscrows.length === 0 ? (
                  <p className="px-6 py-14 text-center text-sm text-white/30">
                    {t("당사자인 거래가 없습니다.", "No deals yet.")}
                  </p>
                ) : (
                  myEscrows.map((e) => {
                    const meta = ESCROW_STATE[e.state];
                    return (
                      <Link
                        key={e.addr}
                        href={`/jeonse/${e.addr}`}
                        className="group flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4 transition-colors last:border-b-0 hover:bg-white/[0.03] md:px-6"
                      >
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-sm text-white/70">
                          <span className="shrink-0">{shortAddr(e.addr)}</span>
                          <span className="shrink-0 whitespace-nowrap rounded-full border border-white/15 px-2 py-0.5 text-[10px] tracking-wide text-white/50">
                            {t(e.role[0], e.role[1])}
                          </span>
                          <span className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] ${meta.cls}`}>
                            {t(meta.label[0], meta.label[1])}
                          </span>
                          {e.claimable > 0n && (
                            <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                              {t("수령", "Claim")} {fmtKRW(e.claimable)}
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-3 text-sm text-white/50 tabular-nums">
                          {fmtKRW(e.amount)}
                          <ArrowUpRight size={15} className="text-white/25 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            </FadeUp>
          </>
        )}
      </main>
    </div>
  );
}
