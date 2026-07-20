<div align="center">

<img src="web/public/logo.png" alt="이음 IEUM" width="104" height="104" />

# 이음 · IEUM

### 돈이 사람 손을 거치지 않는, 한국형 온체인 에스크로 프로토콜

전세 보증금 · 이사 잔금 · 계모임(kye)을 **하나의 트랜잭션**으로 정산합니다.
중개자가 목돈을 쥐는 순간을 **0초**로 만듭니다.

<br/>

[![Live Demo](https://img.shields.io/badge/▶_Live_Demo-ieum--protocol.vercel.app-000000?style=for-the-badge)](https://ieum-protocol.vercel.app)
[![GIWA Sepolia](https://img.shields.io/badge/Chain-GIWA_Sepolia_(91342)-4F46E5?style=for-the-badge)](https://sepolia-explorer.giwa.io)

![Foundry](https://img.shields.io/badge/tests-68_passing-3fb950?style=flat-square&logo=solidity)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?style=flat-square&logo=solidity)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

**UPBIT × GIWA · GASOK Builder Program**

[데모](https://ieum-protocol.vercel.app) · [익스플로러](https://sepolia-explorer.giwa.io) · [배포 주소](#-배포-주소--giwa-sepolia) · [보안](#-보안--audit-ready)

<br/>

**🇰🇷 한국어**  ·  [🇬🇧 English](README.en.md)

</div>

---

## 🧩 한 문장으로

> **이음은 목돈이 "사람의 손"을 거칠 때 생기는 사고를 코드로 없앱니다.**
> 전세사기·이사 잔금 펑크·계주 먹튀 — 셋 다 *중개자가 돈을 쥐는 시간* 때문에 생기고, 그건 정확히 스마트 컨트랙트가 풀도록 설계된 문제입니다.

| 제품 | 현실의 문제 | 이음의 해법 |
|------|------------|-------------|
| 🏠 **전세 에스크로** *(메인)* | 이사 날짜가 안 맞아 보증금이 붕 뜨는 "날짜 맞추기 지옥", 전세사기 | 신규 세입자 전세금을 락 → 정산일에 **한 트랜잭션**으로 기존 세입자 반환 + 집주인 차액을 *동시* 확정 |
| 💧 **이음 Earn** *(머니마켓)* | 이사 날짜 사이 유동성 공백, 역전세(전세가 하락) 부족분 조달 | mKRW 예치 → 실질 APY. mETH 담보 대출 + 전세 브리지 선지급이 **하나의 풀**에서 도는 통합 머니마켓 |
| 🎏 **계모임 (kye)** | 계주가 곗돈 들고 튀는 신뢰 리스크 | 계주가 곧 컨트랙트. **조작 불가 온체인 추첨** · 자동 정산 · 미납 시 보증금 슬래싱 |

---

## ⚙️ 작동 원리 — 원자적 연쇄 정산

```
   신규 세입자 B ──[ 전세금 락 ]──▶ ┌────────────────────┐
                                   │   JeonseEscrow     │
   기존 세입자 A ◀─[ 보증금 반환 ]── │   settle() 한 번에  │
                                   │   세 정산이 동시 확정 │
   집주인 L    ◀──[ 차액 수령 ]──── │   (중간에 돈 쥐는     │
                                   │    사람이 없음)      │
   이음 Earn ──[ 날짜 공백 선지급 ]─▶└────────────────────┘
                └ 전세금이 이미 온체인에 락된 거래에만 ┘
```

정산일 이후 **누구나** `settle()` 을 부르면, 세 당사자의 정산이 **하나의 트랜잭션**에서 함께 확정됩니다. 한쪽만 지급되는 중간 상태가 **원천적으로 불가능**합니다.

**역전세(전세가 하락)** 도 대응합니다 — 반환할 보증금이 신규 전세금보다 크면, 집주인이 부족분을 지갑에서 채우거나 이음 Earn에서 담보 대출로 조달해 개설합니다.

---

## 💧 이음 Earn — 통합 머니마켓

전세 브리지와 담보 대출이 **같은 유동성 풀**에서 돌아가는 것이 이음의 수익 엔진입니다.

- **예치자**: mKRW 예치 → 대출 이자 + 브리지 수수료를 지분만큼 실질 APY로 수령
- **집주인/차입자**: mETH 담보로 mKRW 대출 (LTV 70%) → 역전세 부족분 조달
- **이용률 기반 2-슬로프 금리** · **Health Factor < 1 청산** (청산 보너스 7%)
- 브리지 선지급 채권은 에스크로에 잠긴 실물 토큰으로 **100% 백킹** → 예치자가 못 빼가는 유령 자산이 아님

---

## 🔐 보안 — Audit-Ready

실자금을 다루는 프로토콜답게, **직접 자가 감사 후 발견한 취약점을 전부 수정**했습니다.

| # | 취약점 | 수정 |
|---|--------|------|
| 1 | **위조 에스크로 풀 드레인** (임의 컨트랙트가 `refundAmount`를 부풀려 담보 없이 브리지 선지급 탈취) | 팩토리 등록(`authorizeEscrow`) 기반 화이트리스트로 **신뢰된 에스크로만** 브리지 허용 |
| 2 | **채권 위조 소멸** (`onRepaid` 무권한 호출) | 동일 화이트리스트 게이트로 차단 |
| 3 | **계 추첨 그라인딩** (계주가 유리한 순번 나올 때까지 블록 재시도) | **커밋–리빌 2단계 추첨**: 미래 블록해시로 확정 → 예측·조작 불가 |

추가 방어선 (데스 스파이럴 대비):

- 🧯 **오라클 서킷브레이커** — 1회 가격 변동 ±20% 제한 → 오라클 오설정·조작이 즉시 대량청산으로 번지지 않음
- ⏸ **긴급정지 (guardian)** — 이상 시 신규 대출·브리지 정지, 상환·출금·청산은 항상 허용
- ⏱ **스테일 가드** — 멈춘 오라클로 인한 과다대출·부당청산 차단
- ✅ **Foundry 테스트 68개 전부 통과** (원자적 정산 · 슬래싱 · 최초 예치자 인플레이션 방어 · 위 취약점 회귀 테스트 포함)
- 모든 외부 전송은 상태 갱신 **후** 실행 (checks-effects-interactions) · SafeERC20 · pull-payment

---

## 📦 배포 주소 · GIWA Sepolia

체인 ID `91342` · RPC `https://sepolia-rpc.giwa.io` · **전부 Verified ✅**

| 컨트랙트 | 역할 | 주소 |
|----------|------|------|
| **IeumEarn** | 통합 머니마켓 (예치·대출·브리지) | [`0xe4556aaa…151E`](https://sepolia-explorer.giwa.io/address/0xe4556aaaA3b6bE83F16c3DF3687136f0B9C7151E) |
| **JeonseFactory** | 전세 에스크로 개설 | [`0xEF5D1a63…3e49`](https://sepolia-explorer.giwa.io/address/0xEF5D1a636c18737B9dCFa75ddfa38bfd8fBA3e49) |
| **MulleFactory** | 계모임 개설 | [`0xFc6cc4eE…24a3`](https://sepolia-explorer.giwa.io/address/0xFc6cc4eEa2e8dAb1318d52482db82e68873F24a3) |
| **PriceOracle** | 담보 가격 (서킷브레이커) | [`0xC7383631…2d81`](https://sepolia-explorer.giwa.io/address/0xC7383631538124b8B19973b2DD83F9D948432d81) |
| **MockKRW** | 모의 원화 (교체 예정) | [`0x34e78932…c18BB`](https://sepolia-explorer.giwa.io/address/0x34e78932cB132e248EEf189ed66574E9dffc18BB) |
| **MockETH** | 담보 토큰 | [`0x9AaB1E96…5296`](https://sepolia-explorer.giwa.io/address/0x9AaB1E96a0E800beA9E1dC2aBc0378067b375296) |

---

## 💰 수익 모델 *(전부 온체인 구현)*

| 항목 | 수수료 | 부과 위치 |
|------|--------|-----------|
| 전세 정산 | 전세금의 0.05% | **집주인 차액에서만** 차감 (반환 보증금은 불가침) |
| 브리지 선지급 | 선지급액의 0.5% | 프로토콜 몫 + 예치자(LP) 수익 |
| 대출 이자 | 이용률 기반 | 이자의 10%(reserveFactor)가 프로토콜 수익 |
| 계모임 곗돈 | 곗돈의 0.1% | 매 회차 지급 시 |

모든 수수료 파라미터는 생성자 상한으로 보호됩니다 (예: 정산 수수료 ≤ 1%).

---

## 🚀 빠른 시작

```bash
# 1) 컨트랙트 — 테스트 & 배포
cd contracts
forge test                     # 68개 테스트 전부 통과
forge script script/DeployUnified.s.sol \
  --rpc-url https://sepolia-rpc.giwa.io --broadcast

# 2) 웹 dApp
cd web && npm install && npm run dev   # http://localhost:3000
```

> 🌐 **라이브 데모** — https://ieum-protocol.vercel.app
> 접속 → 지갑 연결 → 테스트 mKRW/mETH 무료 발급 → 전세 에스크로·이음 Earn·계모임 체험

---

## 🛠 기술 스택

- **컨트랙트** — Solidity 0.8.24 · Foundry · OpenZeppelin v5 · SafeERC20 + pull-payment
- **프론트엔드** — Next.js 16 (Turbopack) · wagmi v2 + viem · TanStack Query · Tailwind v4 · framer-motion
- **체인** — GIWA Sepolia (OP Stack L2) · Multicall3 집계로 RPC 부하 최적화
- **UX** — 한/영 i18n · 스포트라이트 온보딩 · 실시간 숫자 애니메이션 · EIP-6963 멀티 지갑

---

## 📁 저장소 구조

```
├── contracts/          # Foundry 프로젝트
│   ├── src/            # IeumEarn · JeonseEscrow · Mulle · 팩토리 · PriceOracle · Mock*
│   ├── test/           # 68개 테스트
│   └── script/         # 배포 스크립트
├── web/                # Next.js dApp (랜딩 + 전세 / Earn / 계모임 / 대시보드)
└── docs/               # 스펙 · 온체인 증거 · GASOK 지원서
```

---

<div align="center">
<sub><b>이음 · IEUM</b> — 목돈의 길을, 잇다.</sub>
</div>
