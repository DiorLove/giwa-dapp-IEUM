const ITEMS = [
  "계주 먹튀 원천 차단",
  "온체인 제비뽑기",
  "보증금 슬래싱",
  "GIWA Sepolia에서 실제 동작 중",
  "장부는 체인에, 곗돈은 컨트랙트에",
  "Foundry 테스트 28/28",
];

export function Marquee() {
  const row = (
    <div className="flex shrink-0 items-center">
      {ITEMS.map((item) => (
        <span key={item} className="flex items-center whitespace-nowrap">
          <span className="px-6 text-sm tracking-wide text-white/40">{item}</span>
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
