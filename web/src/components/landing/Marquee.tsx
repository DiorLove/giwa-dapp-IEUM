"use client";
import { useLang } from "@/lib/i18n";

const ITEMS: [string, string][] = [
  ["원자적 연쇄 정산 — 한 트랜잭션", "Atomic chain settlement — one transaction"],
  ["브리지 선지급 — 이사 날짜를 잇다", "Bridge advance — linking moving days"],
  ["서류 해시 앵커링", "Document hash anchoring"],
  ["온체인 계모임", "On-chain savings circles"],
  ["GIWA Sepolia에서 실제 동작 중", "Live on GIWA Sepolia"],
  ["Foundry 테스트 40/40", "Foundry tests 40/40"],
];

export function Marquee() {
  const { t } = useLang();
  const row = (
    <div className="flex shrink-0 items-center">
      {ITEMS.map(([ko, en]) => (
        <span key={ko} className="flex items-center whitespace-nowrap">
          <span className="px-6 text-sm tracking-wide text-white/40">{t(ko, en)}</span>
          <span className="font-display italic text-white/25">✳</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="overflow-hidden border-y border-white/5 bg-black py-4">
      <div className="marquee-track">
        {row}
        {row}
      </div>
    </div>
  );
}
