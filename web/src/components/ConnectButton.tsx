"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useSwitchChain } from "wagmi";
import { giwaSepolia } from "@/lib/chain";
import { shortAddr } from "@/lib/contracts";
import { useLang } from "@/lib/i18n";
import { WalletModal } from "@/components/WalletModal";

export const OPEN_WALLET_EVENT = "ieum:open-wallet";

export function ConnectButton() {
  const { t } = useLang();
  const router = useRouter();
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [modalOpen, setModalOpen] = useState(false);
  // SSR과 클라이언트의 지갑 상태가 달라 생기는 하이드레이션 불일치 방지
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 햄버거 메뉴 등에서 지갑 연결 모달을 열 수 있도록 이벤트 수신
  useEffect(() => {
    const onOpen = () => setModalOpen(true);
    window.addEventListener(OPEN_WALLET_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_WALLET_EVENT, onOpen);
  }, []);

  if (!mounted)
    return (
      <span className="inline-block h-9 w-[92px] rounded-full border border-white/10" />
    );

  if (!isConnected)
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className="pressable rounded-full bg-white px-4 py-2 text-sm font-bold text-black"
        >
          {t("지갑 연결", "Connect Wallet")}
        </button>
        <WalletModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );

  if (chainId !== giwaSepolia.id)
    return (
      <button
        onClick={() => switchChain({ chainId: giwaSepolia.id })}
        className="pressable rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-black"
      >
        {t("GIWA로 전환", "Switch to GIWA")}
      </button>
    );

  return (
    <button
      onClick={() => router.push("/me")}
      className="liquid-glass glass-hover pressable rounded-full px-4 py-2 text-xs font-semibold text-white/70"
      title={t("마이페이지", "My Page")}
    >
      {shortAddr(address!)}
    </button>
  );
}
