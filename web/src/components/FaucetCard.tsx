"use client";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { MOCKKRW_ADDRESS, mockKrwAbi, fmtKRW } from "@/lib/contracts";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

export function FaucetCard() {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const { data: balance, refetch } = useReadContract({
    address: MOCKKRW_ADDRESS,
    abi: mockKrwAbi,
    functionName: "balanceOf",
    args: [address ?? ZERO],
    query: { enabled: !!address, refetchInterval: 4000 },
  });

  if (!address) return null;
  return (
    <div className="liquid-glass rounded-2xl p-4">
      <div className="text-xs font-semibold text-white/40">내 모의 원화 잔액</div>
      <div className="mt-0.5 text-2xl font-black text-white tabular-nums">
        {fmtKRW(balance ?? 0n)}
      </div>
      <button
        disabled={isPending}
        onClick={() =>
          writeContract(
            { address: MOCKKRW_ADDRESS, abi: mockKrwAbi, functionName: "faucet" },
            { onSuccess: () => setTimeout(() => refetch(), 2000) }
          )
        }
        className="pressable mt-3 w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-black disabled:opacity-50"
      >
        {isPending ? "발급 중…" : "₩10,000,000 무료 발급 (테스트넷)"}
      </button>
    </div>
  );
}
