"use client";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { FACTORY_ADDRESS, factoryAbi, mulleAbi, fmtKRW } from "@/lib/contracts";
import { ConnectButton } from "@/components/ConnectButton";
import { FaucetCard } from "@/components/FaucetCard";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

const STATE_META = [
  { label: "모집 중", cls: "bg-amber-400/15 text-amber-300" },
  { label: "진행 중", cls: "bg-emerald-400/15 text-emerald-300" },
  { label: "완주 🎉", cls: "bg-indigo-400/15 text-indigo-300" },
  { label: "종료", cls: "bg-white/10 text-white/40" },
];

export default function AppHome() {
  const { address } = useAccount();
  const { data: all } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "getAll",
    query: { refetchInterval: 5000 },
  });
  const mulles = (all ?? []) as `0x${string}`[];

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

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4 pb-16">
      <header className="flex items-center justify-between pt-2">
        <div>
          <Link href="/" className="text-2xl font-black tracking-tight text-white">
            🏺 물레
          </Link>
          <p className="text-xs text-white/40">계주는 컨트랙트, 신뢰는 체인에</p>
        </div>
        <ConnectButton />
      </header>

      <FaucetCard />

      <Link
        href="/create"
        className="pressable rounded-2xl bg-white p-4 text-center font-bold text-black"
      >
        + 새 계모임 열기
      </Link>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-bold text-white/40">계모임 목록</h2>
        {mulles.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/30">
            아직 열린 계가 없어요.
            <br />첫 물레를 돌려보세요!
          </p>
        )}
        {[...mulles].reverse().map((m, idx) => {
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
              style={{ animationDelay: `${Math.min(idx * 50, 400)}ms` }}
              className="liquid-glass glass-hover pressable stagger-item rounded-2xl p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-white tabular-nums">
                  {fmtKRW(contribution ?? 0n)}
                  <span className="text-xs font-medium text-white/40"> / 회</span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${meta.cls}`}>
                  {meta.label}
                </span>
              </div>
              <div className="mt-1 text-xs text-white/40">
                {String(memberCount ?? 0)}/{maxMembers ?? 0}명
                {mine ? " · ✅ 참여 중" : ""}
              </div>
            </Link>
          );
        })}
      </section>

      <footer className="mt-4 text-center text-[10px] leading-relaxed text-white/25">
        GIWA Sepolia 테스트넷 · 모의 원화(mKRW)로 동작하는 데모입니다
      </footer>
    </main>
  );
}
