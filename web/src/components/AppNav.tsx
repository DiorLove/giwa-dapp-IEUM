"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Fuel, HelpCircle, Menu } from "lucide-react";
import { ConnectButton } from "@/components/ConnectButton";
import { Onboarding, OPEN_TOUR_EVENT } from "@/components/Onboarding";
import { MobileMenu } from "@/components/MobileMenu";
import { MyPage } from "@/components/MyPage";
import { LangToggle, useLang } from "@/lib/i18n";

const LINKS: { href: string; label: [string, string]; tour: string }[] = [
  { href: "/jeonse", label: ["전세 에스크로", "Jeonse Escrow"], tour: "nav-jeonse" },
  { href: "/pool", label: ["브리지 풀", "Bridge Pool"], tour: "nav-pool" },
  { href: "/app", label: ["계모임", "Gye Circles"], tour: "nav-gye" },
];

export function AppNav() {
  const { t } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const { isConnected } = useAccount();
  const [menuOpen, setMenuOpen] = useState(false);

  // 지갑 연결이 해제되면(연결됨→해제됨 전환) dapp 첫 기능 페이지로 이동.
  // 지갑 없이 둘러보던 경우엔 이동하지 않도록 이전 연결 여부를 추적.
  const wasConnected = useRef(false);
  useEffect(() => {
    if (isConnected) {
      wasConnected.current = true;
    } else if (wasConnected.current) {
      wasConnected.current = false;
      router.push("/jeonse");
    }
  }, [isConnected, router]);

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-10">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-display text-xl tracking-tight text-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-7 w-7 rounded-full" />
            이음 <span className="text-white/40">IEUM</span>
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                data-tour={l.tour}
                className={`rounded-lg px-1 text-sm transition-colors hover:text-white ${
                  pathname.startsWith(l.href) ? "text-white" : "text-white/60"
                }`}
              >
                {t(l.label[0], l.label[1])}
              </Link>
            ))}
            <a
              href="https://sepolia-explorer.giwa.io/address/0xeec2bc9B6B9E281b2FafDEB38D40719547a95eC2"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-white/60 transition-colors hover:text-white"
            >
              {t("컨트랙트", "Contracts")}
            </a>
          </nav>
        </div>

        {/* 데스크톱 우측 유틸리티 */}
        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={() => window.dispatchEvent(new Event(OPEN_TOUR_EVENT))}
            title="사용법 다시 보기"
            aria-label="사용법 다시 보기"
            className="pressable rounded-full p-1.5 text-white/40 transition-colors hover:text-white"
          >
            <HelpCircle size={17} />
          </button>
          <a
            href="https://faucet.giwa.io"
            target="_blank"
            rel="noreferrer"
            data-tour="gas"
            title="GIWA Sepolia 가스 ETH 받기"
            className="pressable hidden items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50 transition-colors hover:border-white/25 hover:text-white sm:flex"
          >
            <Fuel size={12} />
            {t("가스 받기", "Get Gas")}
          </a>
          <LangToggle />
          <span className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50 lg:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            GIWA Sepolia
          </span>
          <span data-tour="wallet" className="inline-flex rounded-full">
            <ConnectButton />
          </span>
        </div>

        {/* 모바일 우측: 지갑 + 햄버거 */}
        <div className="flex items-center gap-2 md:hidden">
          <span data-tour="wallet" className="inline-flex rounded-full">
            <ConnectButton />
          </span>
          <button
            onClick={() => setMenuOpen(true)}
            aria-label={t("메뉴 열기", "Open menu")}
            className="pressable rounded-full border border-white/10 p-2 text-white/70 transition-colors hover:border-white/25 hover:text-white"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} links={LINKS} />
      <MyPage />
      <Onboarding />
    </header>
  );
}
