import { http, createConfig } from "wagmi";
import { injected, metaMask, walletConnect } from "wagmi/connectors";
import { giwaSepolia } from "./chain";

// WalletConnect projectId — 공개 값(프론트 노출용). env 로 덮어쓸 수 있음
const wcProjectId =
  process.env.NEXT_PUBLIC_WC_PROJECT_ID || "a18211f380cf7e23ffa4a687e12c0e57";

export const config = createConfig({
  chains: [giwaSepolia],
  connectors: [
    injected(),
    // MetaMask SDK: 모바일에서 앱으로 넘어가 인증(연결) 요청을 띄우고 세션을 맺는다
    metaMask({
      dappMetadata: {
        name: "이음 IEUM",
        url: "https://ieum-protocol.vercel.app",
      },
    }),
    // WalletConnect: projectId 가 있으면 나머지 모바일 지갑도 QR/딥링크로 연결 (선택)
    ...(wcProjectId
      ? [
          walletConnect({
            projectId: wcProjectId,
            // 자체 모달 대신 우리가 display_uri 를 받아 지갑별 딥링크로 직접 연다
            showQrModal: false,
            metadata: {
              name: "이음 IEUM",
              description: "한국형 온체인 에스크로",
              url: "https://ieum-protocol.vercel.app",
              icons: ["https://ieum-protocol.vercel.app/icon.png"],
            },
          }),
        ]
      : []),
  ],
  // ── 동시 접속·트랜잭션 시 화면이 0으로 깜빡이던 근본 원인 해결 ──────────────
  // GIWA RPC 는 "한 요청에 담긴 호출 수"에 한도가 있어(약 20개 초과 시
  // -32016 "over rate limit"), 요청 하나가 거부되면 그 안의 모든 read 가 함께
  // 실패해 페이지 전체가 0/1970/₩0 으로 튀었다. 특히 트랜잭션 직후 모든 쿼리가
  // 동시에 리페치되면서 수십 개의 호출이 한 배치로 뭉쳐 한도를 넘겼다.
  //
  // 1) Multicall3 집계: 여러 컨트랙트 read 를 단일 eth_call 로 묶는다.
  //    (me/대시보드의 수십 개 read → 요청 서너 개로 축소, 한도에 여유)
  batch: { multicall: { batchSize: 512, wait: 16 } },
  transports: {
    // 2) JSON-RPC 배치는 요청당 최대 10개로 제한 → GIWA 한도(~20+)를 절대 안 넘김
    // 3) retry: 일시적 rate-limit 도 지수 백오프로 재시도
    [giwaSepolia.id]: http(undefined, {
      batch: { batchSize: 10, wait: 20 },
      retryCount: 4,
      retryDelay: 500,
      timeout: 20_000,
    }),
  },
});
