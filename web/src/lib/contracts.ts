import { parseAbi } from "viem";

export const MOCKKRW_ADDRESS = process.env.NEXT_PUBLIC_MOCKKRW_ADDRESS as `0x${string}`;
// 계모임 팩토리 — 조작 불가 2단계 추첨(start→drawOrder) 보안 패치본
export const FACTORY_ADDRESS =
  "0xFc6cc4eEa2e8dAb1318d52482db82e68873F24a3" as `0x${string}`;
// 위조 에스크로 드레인 차단 + 오라클 서킷브레이커 + 긴급정지 포함 최신 팩토리.
// 신규 에스크로는 IeumEarn v3(안전장치본)를 브리지 풀로 사용
export const JEONSE_FACTORY_ADDRESS =
  "0xEF5D1a636c18737B9dCFa75ddfa38bfd8fBA3e49" as `0x${string}`;
export const BRIDGE_POOL_ADDRESS = process.env
  .NEXT_PUBLIC_BRIDGE_POOL_ADDRESS as `0x${string}`;

// 구 배포분 — 목록에 레거시로 병합 표시.
// LEGACY_FACTORY: start() 개설자 강제 패치 전 계모임 팩토리(기존 계 보존용).
// LEGACY_JEONSE_FACTORY: 인플레이션 방어 패치 전 v2 전세 팩토리(데모 거래 보존용).
export const LEGACY_FACTORY_ADDRESS =
  "0x9CB12AD424Ffd1F0349a338631166E087a3dDF70" as `0x${string}`;
// 2단계 추첨 보안 패치 전 계모임 팩토리 — 기존 계 보존용으로 목록에 병합
export const LEGACY_FACTORY_ADDRESS_2 =
  "0xf62cF1562CB15Ab3c48776B9d13F2081cC1B785C" as `0x${string}`;
export const LEGACY_JEONSE_FACTORY_ADDRESS =
  "0x5622e3B98c04507E2185667131C75344Fe077012" as `0x${string}`;
// 직전 팩토리(구 BridgePool 사용) — 기존 에스크로 보존용으로 목록에 병합
export const LEGACY_JEONSE_FACTORY_ADDRESS_2 =
  "0xeec2bc9B6B9E281b2FafDEB38D40719547a95eC2" as `0x${string}`;
// 역전세 톱업 지원 전 통합 팩토리 — 기존 에스크로 보존용으로 목록에 병합
export const LEGACY_JEONSE_FACTORY_ADDRESS_3 =
  "0xD4dD00DB42051B50c4d9a423df8a4EB62C59204D" as `0x${string}`;
// 위조 에스크로 드레인 차단 패치 전 통합 팩토리 — 기존 에스크로 보존용으로 목록에 병합
export const LEGACY_JEONSE_FACTORY_ADDRESS_4 =
  "0x491cE6Cd7ba9493F3624877e29F6F8C202588991" as `0x${string}`;
// 안전장치(서킷브레이커·긴급정지) 추가 전 통합 팩토리 — 기존 에스크로 보존용으로 목록에 병합
export const LEGACY_JEONSE_FACTORY_ADDRESS_5 =
  "0x6b0e095BC32464173a9A7Bf62bc500d3aCE6616D" as `0x${string}`;

// 이음 Earn 통합 머니마켓 (예치·대출 + 브리지 선지급) — GIWA Sepolia v3
// (위조 드레인 차단 + 오라클 서킷브레이커 + 긴급정지)
export const EARN_ADDRESS =
  "0xe4556aaaA3b6bE83F16c3DF3687136f0B9C7151E" as `0x${string}`;
export const METH_ADDRESS =
  "0x9AaB1E96a0E800beA9E1dC2aBc0378067b375296" as `0x${string}`;
// 서킷브레이커(1회 변동 20% 제한) + updatedAt 포함 오라클
export const ORACLE_ADDRESS =
  "0xC7383631538124b8B19973b2DD83F9D948432d81" as `0x${string}`;

export const mockKrwAbi = parseAbi([
  "function faucet()",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

export const factoryAbi = parseAbi([
  "function createMulle(uint8 maxMembers, uint256 contribution, uint256 roundDuration, uint8 depositRounds, uint256 recruitPeriod, uint8 orderMode) returns (address)",
  "function getAll() view returns (address[])",
  "function count() view returns (uint256)",
  "event MulleCreated(address indexed mulle, address indexed organizer)",
]);

export const mulleAbi = parseAbi([
  "function state() view returns (uint8)",
  "function orderMode() view returns (uint8)",
  "function organizer() view returns (address)",
  "function maxMembers() view returns (uint8)",
  "function contribution() view returns (uint256)",
  "function roundDuration() view returns (uint256)",
  "function deposit() view returns (uint256)",
  "function recruitDeadline() view returns (uint256)",
  "function startTime() view returns (uint256)",
  "function currentRound() view returns (uint256)",
  "function memberCount() view returns (uint256)",
  "function getMembers() view returns (address[])",
  "function getPayoutOrder() view returns (address[])",
  "function roundEnd(uint256 round) view returns (uint256)",
  "function isMember(address) view returns (bool)",
  "function depositBalance(address) view returns (uint256)",
  "function claimable(address) view returns (uint256)",
  "function hasReceived(address) view returns (bool)",
  "function paidInRound(uint256, address) view returns (bool)",
  "function orderProposed() view returns (bool)",
  "function orderApproved(address) view returns (bool)",
  "function approvalCount() view returns (uint8)",
  "function drawBlock() view returns (uint256)",
  "function join()",
  "function start()",
  "function drawOrder()",
  "function proposeOrder(address[] order)",
  "function approveOrder()",
  "function pay()",
  "function settle()",
  "function claim()",
  "function cancelRecruitment()",
]);

export const jeonseFactoryAbi = parseAbi([
  "function createEscrow(address tenantIn, address tenantOut, uint256 jeonseAmount, uint256 refundAmount, uint256 settleDate) returns (address)",
  "function getAll() view returns (address[])",
  "function count() view returns (uint256)",
  "event EscrowCreated(address indexed escrow, address indexed landlord, address indexed tenantIn, address tenantOut)",
]);

export const jeonseAbi = parseAbi([
  "function state() view returns (uint8)",
  "function bridgePool() view returns (address)",
  "function landlord() view returns (address)",
  "function tenantIn() view returns (address)",
  "function tenantOut() view returns (address)",
  "function jeonseAmount() view returns (uint256)",
  "function refundAmount() view returns (uint256)",
  "function shortfall() view returns (uint256)",
  "function shortfallCovered() view returns (bool)",
  "function settleDate() view returns (uint256)",
  "function bridged() view returns (bool)",
  "function coverShortfall()",
  "function claimable(address) view returns (uint256)",
  "function cancelApproved(address) view returns (bool)",
  "function documentCount() view returns (uint256)",
  "function documents(uint256) view returns (bytes32 hash, string label, address by, uint256 timestamp)",
  "function fund()",
  "function settle()",
  "function cancel()",
  "function claim()",
  "function anchorDocument(bytes32 hash, string label)",
]);

export const bridgePoolAbi = parseAbi([
  "function deposit(uint256 amount)",
  "function withdraw(uint256 shareAmount)",
  "function bridge(address escrowAddr)",
  "function shares(address) view returns (uint256)",
  "function totalShares() view returns (uint256)",
  "function totalOutstanding() view returns (uint256)",
  "function totalAssets() view returns (uint256)",
  "function FEE_BPS() view returns (uint256)",
]);

export const earnAbi = parseAbi([
  "function supply(uint256 amount)",
  "function withdraw(uint256 shareAmount)",
  "function depositCollateral(uint256 amount)",
  "function withdrawCollateral(uint256 amount)",
  "function borrow(uint256 amount)",
  "function repay(uint256 amount)",
  "function liquidate(address user, uint256 repayAmount)",
  "function bridge(address escrow)",
  "function cash() view returns (uint256)",
  "function totalBorrows() view returns (uint256)",
  "function bridgeOutstanding() view returns (uint256)",
  "function totalAssets() view returns (uint256)",
  "function totalSupplyShares() view returns (uint256)",
  "function reserveAccrued() view returns (uint256)",
  "function utilization() view returns (uint256)",
  "function borrowRatePerYear() view returns (uint256)",
  "function supplyRatePerYear() view returns (uint256)",
  "function supplyShares(address) view returns (uint256)",
  "function supplyValue(address) view returns (uint256)",
  "function debtOf(address) view returns (uint256)",
  "function collateralOf(address) view returns (uint256)",
  "function collateralValue(address) view returns (uint256)",
  "function maxBorrow(address) view returns (uint256)",
  "function healthFactor(address) view returns (uint256)",
  "function ltv() view returns (uint256)",
  "function liquidationThreshold() view returns (uint256)",
]);

export const mockEthAbi = parseAbi([
  "function faucet()",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

export const oracleAbi = parseAbi(["function price() view returns (uint256)"]);

/** ray(1e27) 연이율 → APY 퍼센트 문자열 */
export const rayToApy = (ray: bigint) =>
  (Number(ray / 10n ** 21n) / 1e6) * 100; // ray/1e27 * 100

export const fmtKRW = (wei: bigint) =>
  "₩" + (wei / 10n ** 18n).toLocaleString("ko-KR");

export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** 금액 입력 표시용 — 숫자만 남기고 천단위 콤마. (정밀도 손실 없이 문자열 처리) */
export const withCommas = (s: string) =>
  s.replace(/[^\d]/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
/** 콤마 등 제거하고 순수 숫자 문자열만 (상태 저장·parseUnits 용) */
export const onlyDigits = (s: string) => s.replace(/[^\d]/g, "");

export const explorerUrl = (path: string) =>
  `https://sepolia-explorer.giwa.io/${path}`;

/** viem/wagmi 에러에서 사람이 읽을 사유를 추출 */
export function errMsg(e: unknown): string {
  if (e && typeof e === "object") {
    const err = e as {
      shortMessage?: string;
      message?: string;
      cause?: { reason?: string; shortMessage?: string };
    };
    if (err.cause?.reason) return err.cause.reason;
    if (err.shortMessage) {
      const extra = err.cause?.shortMessage;
      return extra && extra !== err.shortMessage
        ? `${err.shortMessage} — ${extra}`
        : err.shortMessage;
    }
    if (err.message) return err.message.split("\n").slice(0, 5).join(" ");
  }
  return "트랜잭션 실패";
}
