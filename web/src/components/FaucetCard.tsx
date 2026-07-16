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
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-stone-400">내 모의 원화 잔액</div>
      <div className="mt-0.5 text-2xl font-black tabular-nums">
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
        className="mt-3 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
      >
        {isPending ? "발급 중…" : "₩10,000,000 무료 발급 (테스트넷)"}
      </button>
    </div>
  );
}
