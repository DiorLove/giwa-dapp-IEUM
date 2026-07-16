import { parseAbi } from "viem";

export const MOCKKRW_ADDRESS = process.env.NEXT_PUBLIC_MOCKKRW_ADDRESS as `0x${string}`;
export const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`;
export const JEONSE_FACTORY_ADDRESS = process.env
  .NEXT_PUBLIC_JEONSE_FACTORY_ADDRESS as `0x${string}`;
export const BRIDGE_POOL_ADDRESS = process.env
  .NEXT_PUBLIC_BRIDGE_POOL_ADDRESS as `0x${string}`;

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
  "function join()",
  "function start()",
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
  "function landlord() view returns (address)",
  "function tenantIn() view returns (address)",
  "function tenantOut() view returns (address)",
  "function jeonseAmount() view returns (uint256)",
  "function refundAmount() view returns (uint256)",
  "function settleDate() view returns (uint256)",
  "function bridged() view returns (bool)",
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

export const fmtKRW = (wei: bigint) =>
  "₩" + (wei / 10n ** 18n).toLocaleString("ko-KR");

export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

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
