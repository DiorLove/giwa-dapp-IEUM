import { defineChain } from "viem";

export const giwaSepolia = defineChain({
  id: 91342,
  name: "GIWA Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://sepolia-rpc.giwa.io"] } },
  blockExplorers: {
    default: { name: "GIWA Explorer", url: "https://sepolia-explorer.giwa.io" },
  },
  // 표준 Multicall3 (GIWA Sepolia 에 배포 확인됨) — 다수의 컨트랙트 read 를
  // 단일 eth_call 로 묶어 RPC 요청 수를 줄인다. GIWA RPC 의 요청당 호출 수
  // 한도(-32016 "over rate limit")를 넘지 않도록 하는 핵심 설정.
  contracts: {
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" },
  },
  testnet: true,
});
