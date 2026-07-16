"use client";
import Link from "next/link";
import { ConnectButton } from "@/components/ConnectButton";

export function AppNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-10">
          <Link href="/" className="font-display text-xl tracking-tight text-white">
            물레 <span className="text-white/40">MULLE</span>
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            <Link href="/app" className="text-sm text-white/60 transition-colors hover:text-white">
              대시보드
            </Link>
            <Link href="/create" className="text-sm text-white/60 transition-colors hover:text-white">
              계 개설
            </Link>
            <a
              href="https://sepolia-explorer.giwa.io/address/0x41e70B75eE359A86F54daE3B342C5b876b0Cdd2e"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-white/60 transition-colors hover:text-white"
            >
              컨트랙트
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-white/50 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            GIWA Sepolia
          </span>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
