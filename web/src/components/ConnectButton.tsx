"use client";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { giwaSepolia } from "@/lib/chain";
import { shortAddr } from "@/lib/contracts";

export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected)
    return (
      <button
        onClick={() => connect({ connector: connectors[0] })}
        className="rounded-full bg-stone-900 px-4 py-2 text-sm font-bold text-white active:scale-95 transition"
      >
        지갑 연결
      </button>
    );

  if (chainId !== giwaSepolia.id)
    return (
      <button
        onClick={() => switchChain({ chainId: giwaSepolia.id })}
        className="rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white active:scale-95 transition"
      >
        GIWA로 전환
      </button>
    );

  return (
    <button
      onClick={() => disconnect()}
      className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-600"
      title="클릭하면 연결 해제"
    >
      {shortAddr(address!)}
    </button>
  );
}
