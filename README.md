<div align="center">

# 이음 IEUM

**돈이 사람 손을 거치지 않는 온체인 에스크로 프로토콜**
전세·월세 보증금과 계모임(kye)을 원자적 정산으로 잇습니다.

Built on **GIWA Sepolia** · UPBIT × GIWA GASOK Builder Program

[데모](https://ieum-six.vercel.app) · [익스플로러](https://sepolia-explorer.giwa.io) · [컨트랙트](#-배포-주소-giwa-sepolia)

</div>

---

## 🧩 한눈에 보기

이음은 **"목돈이 사람 손을 거칠 때 생기는 리스크"** 를 온체인으로 없앱니다.

| 제품 | 문제 | 이음의 해법 |
|------|------|-------------|
| **전세 에스크로** (메인) | 이사 날짜가 안 맞아 보증금이 붕 뜨는 "전세 날짜 맞추기 지옥" | 신규 세입자 전세금을 락 → 정산일에 **한 트랜잭션**으로 기존 세입자 반환 + 집주인 차액을 동시 확정 |
| **브리지 풀** | 이사 날짜 사이 며칠간의 유동성 공백 | 다음 세입자 전세금이 **이미 온체인에 락된** 거래에만 선지급하는 초단기 유동성 (담보가 눈에 보이는 대출) |
| **계모임 (kye)** | 계주가 곗돈 들고 튀는 신뢰 리스크 | 계주가 컨트랙트. 제비뽑기 순번·자동 정산·미납 시 보증금 슬래싱까지 코드로 |

---

## ⚙️ 작동 원리 — 원자적 연쇄 정산

```
신규 세입자 B ──[전세금 락]──▶ ┌─────────────────┐
                              │  JeonseEscrow   │
기존 세입자 A ◀─[보증금 반환]── │  (정산일에      │
                              │   단 한 번의    │
집주인 L   ◀──[차액 수령]───── │   트랜잭션)     │
                              └─────────────────┘
                                      ▲
       브리지 풀 ──[날짜 공백 선지급]──┘  (전세금 락 확인 후에만)
```

정산일 이후 **누구나** `settle()` 를 호출하면, 세 당사자의 정산이 하나의 트랜잭션에서 동시에 확정됩니다. 중간에 돈을 쥐는 사람이 없습니다.

---

## 🚀 빠른 시작

```bash
# 1) 컨트랙트 — 테스트 & 배포
cd contracts
forge test                                    # 44개 테스트 전부 통과
forge script script/DeployBridgeFix.s.sol --rpc-url https://sepolia-rpc.giwa.io --broadcast

# 2) 웹 dApp
cd web
npm install
npm run dev                                   # http://localhost:3000
```

`web/.env.local` 에 배포된 컨트랙트 주소를 넣으세요 (아래 표 참고).

---

## 📦 배포 주소 (GIWA Sepolia)

체인 ID `91342` · RPC `https://sepolia-rpc.giwa.io` · 전부 **Verified**

| 컨트랙트 | 주소 |
|----------|------|
| MockKRW (모의 원화) | [`0x34e78932…c18BB`](https://sepolia-explorer.giwa.io/address/0x34e78932cB132e248EEf189ed66574E9dffc18BB) |
| BridgePool | [`0x2688F441…AA9d`](https://sepolia-explorer.giwa.io/address/0x2688F44121555301952a1fd58A6A1b24A67AAA9d) |
| JeonseFactory | [`0xeec2bc9B…5eC2`](https://sepolia-explorer.giwa.io/address/0xeec2bc9B6B9E281b2FafDEB38D40719547a95eC2) |
| MulleFactory (계모임) | [`0x9CB12AD4…DF70`](https://sepolia-explorer.giwa.io/address/0x9CB12AD424Ffd1F0349a338631166E087a3dDF70) |

---

## 💰 프로토콜 수익 모델 (전부 온체인 구현)

| 항목 | 수수료 | 부과 위치 |
|------|--------|-----------|
| 전세 정산 수수료 | 전세금의 0.05% | **집주인 차액에서만** 차감 (보증금은 불가침) |
| 브리지 선지급 수수료 | 선지급액의 0.5% | 이 중 20%가 프로토콜 몫, 나머지는 LP 수익 |
| 계모임 곗돈 수수료 | 곗돈의 0.1% | 매 회차 지급 시 |

수수료 파라미터는 전부 생성자 상한(bound)으로 보호됩니다 (예: 정산 수수료 ≤ 1%).

---

## 🛠 기술 스택

- **컨트랙트** — Solidity 0.8.24, Foundry, OpenZeppelin v5, SafeERC20 + pull-payment 패턴
- **프론트엔드** — Next.js 16 (Turbopack), wagmi v2 + viem, Tailwind v4, framer-motion
- **체인** — GIWA Sepolia (OP Stack L2)
- **부가** — 한/영 i18n, Toss 스타일 스포트라이트 온보딩, EIP-6963 멀티 지갑 연결

---

## 🔐 보안

- 44개 Foundry 테스트 (원자적 정산·슬래싱·수수료 상한·**최초 예치자 인플레이션 방어** 포함)
- 브리지 풀은 가상 오프셋(+1) 지분 회계로 도네이션 인플레이션 공격 무력화
- 모든 외부 전송은 상태 갱신 **후** 실행 (checks-effects-interactions)
- 배포용 개인키·헬퍼 지갑 키는 `contracts/.env` (gitignored) 에만 존재

---

## 📁 저장소 구조

```
├── contracts/          # Foundry 프로젝트
│   ├── src/            # JeonseEscrow · BridgePool · Mulle · 팩토리 · MockKRW
│   ├── test/           # 44개 테스트
│   └── script/         # 배포 스크립트
├── web/                # Next.js dApp (랜딩 + 전세/풀/계모임 페이지)
└── docs/               # 스펙 · 계획 · 온체인 증거 · GASOK 지원서
```

---

<div align="center">
<sub>이음 IEUM — 목돈의 길을, 잇다.</sub>
</div>
