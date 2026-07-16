"use client";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { giwaSepolia } from "@/lib/chain";
import { shortAddr } from "@/lib/contracts";

export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  // SSR과 클라이언트의 지갑 상태가 달라 생기는 하이드레이션 불일치 방지
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted)
    return (
      <span className="inline-block h-9 w-[92px] rounded-full border border-white/10" />
    );

  if (!isConnected)
    return (
      <button
        onClick={() => connect({ connector: connectors[0] })}
        className="pressable rounded-full bg-white px-4 py-2 text-sm font-bold text-black"
      >
        지갑 연결
      </button>
    );

  if (chainId !== giwaSepolia.id)
    return (
      <button
        onClick={() => switchChain({ chainId: giwaSepolia.id })}
        className="pressable rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-black"
      >
        GIWA로 전환
      </button>
    );

  return (
    <button
      onClick={() => disconnect()}
      className="liquid-glass glass-hover pressable rounded-full px-4 py-2 text-xs font-semibold text-white/70"
      title="클릭하면 연결 해제"
    >
      {shortAddr(address!)}
    </button>
  );
}
