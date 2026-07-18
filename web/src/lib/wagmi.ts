import { http, createConfig } from "wagmi";
import { injected, metaMask, walletConnect } from "wagmi/connectors";
import { giwaSepolia } from "./chain";

const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

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
            showQrModal: true,
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
