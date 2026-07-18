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
  transports: { [giwaSepolia.id]: http() },
});
