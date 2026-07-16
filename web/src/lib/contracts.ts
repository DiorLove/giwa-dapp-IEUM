import { parseAbi } from "viem";

export const MOCKKRW_ADDRESS = process.env.NEXT_PUBLIC_MOCKKRW_ADDRESS as `0x${string}`;
export const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`;

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

export const fmtKRW = (wei: bigint) =>
  "₩" + (wei / 10n ** 18n).toLocaleString("ko-KR");

export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export const explorerUrl = (path: string) =>
  `https://sepolia-explorer.giwa.io/${path}`;
