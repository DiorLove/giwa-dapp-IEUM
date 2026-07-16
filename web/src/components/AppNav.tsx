"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fuel, HelpCircle } from "lucide-react";
import { ConnectButton } from "@/components/ConnectButton";
import { Onboarding, OPEN_TOUR_EVENT } from "@/components/Onboarding";
import { LangToggle, useLang } from "@/lib/i18n";

const LINKS: { href: string; label: [string, string] }[] = [
  { href: "/jeonse", label: ["전세 에스크로", "Jeonse Escrow"] },
  { href: "/pool", label: ["브리지 풀", "Bridge Pool"] },
  { href: "/app", label: ["계모임", "Gye Circles"] },
];

export function AppNav() {
  const { t } = useLang();
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-10">
          <Link href="/" className="font-display text-xl tracking-tight text-white">
            이음 <span className="text-white/40">IEUM</span>
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm transition-colors hover:text-white ${
                  pathname.startsWith(l.href) ? "text-white" : "text-white/60"
                }`}
              >
                {t(l.label[0], l.label[1])}
              </Link>
            ))}
            <a
              href="https://sepolia-explorer.giwa.io/address/0xD37eD0FBEeD8BC364982F2E60B90B48D8067DE08"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-white/60 transition-colors hover:text-white"
            >
              {t("컨트랙트", "Contracts")}
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-3">
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
            title="GIWA Sepolia 가스 ETH 받기"
            className="pressable hidden items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50 transition-colors hover:border-white/25 hover:text-white sm:flex"
          >
            <Fuel size={12} />
            {t("가스 받기", "Get Gas")}
          </a>
          <LangToggle className="hidden md:flex" />
          <span className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50 lg:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            GIWA Sepolia
          </span>
          <ConnectButton />
        </div>
      </div>
      <Onboarding />
    </header>
  );
}
