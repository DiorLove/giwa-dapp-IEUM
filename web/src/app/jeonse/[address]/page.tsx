"use client";
import { use, useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient, useReadContracts, useWriteContract } from "wagmi";
import { keccak256, maxUint256, toBytes } from "viem";
import { ArrowUpRight, FileCheck, Lock, Eye, Paperclip, X, Share2, Check } from "lucide-react";
import {
  BRIDGE_POOL_ADDRESS,
  MOCKKRW_ADDRESS,
  bridgePoolAbi,
  errMsg,
  explorerUrl,
  fmtKRW,
  jeonseAbi,
  mockKrwAbi,
  shortAddr,
} from "@/lib/contracts";
import { AppNav } from "@/components/AppNav";
import { StateFlow } from "@/components/Guide";
import { InfoTip } from "@/components/InfoTip";
import { FadeUp, SwapIn } from "@/components/Motion";
import { giwaSepolia } from "@/lib/chain";
import { useLang } from "@/lib/i18n";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

/** 문서 원본은 온체인이 아니라 로컬(브라우저)에 저장하고, 체인엔 keccak256 해시만 앵커한다.
 *  공개 원장 특성상 파일 자체는 체인에 올리지 않으며(누구나 열람 가능해지므로),
 *  열람 권한은 온체인 당사자 검증 + 로컬 보관으로 통제한다.
 *  운영 단계에선 IPFS + 지갑 서명 기반 대칭키 암호화로 확장 예정. */
type LocalDoc = { name: string; type: string; dataUrl: string };
const docKey = (esc: string, hash: string) =>
  `ieum-doc:${esc.toLowerCase()}:${hash.toLowerCase()}`;

function readLocalDoc(esc: string, hash: string): LocalDoc | null {
  try {
    const raw = localStorage.getItem(docKey(esc, hash));
    return raw ? (JSON.parse(raw) as LocalDoc) : null;
  } catch {
    return null;
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const STATE_LABEL: [string, string][] = [
  ["자금 대기", "Awaiting funds"],
  ["락 완료", "Funded"],
  ["정산 완료", "Settled"],
  ["취소됨", "Cancelled"],
];
const STATE_CLS = [
  "border-amber-400/30 text-amber-300",
  "border-emerald-400/30 text-emerald-300",
  "border-indigo-400/30 text-indigo-300",
  "border-white/15 text-white/40",
];

export default function JeonseDetail({ params }: { params: Promise<{ address: string }> }) {
  const { t } = useLang();
  const { address: escAddr } = use(params);
  const esc = escAddr as `0x${string}`;
  const { address: me, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [docLabel, setDocLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [localDocs, setLocalDocs] = useState<Record<string, { name: string; type: string }>>({});
  const [shared, setShared] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function shareEscrow() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: t("이음 전세 에스크로", "IEUM Jeonse Escrow"),
      text: t(
        "이음에서 전세 에스크로에 참여해 주세요.",
        "Join this jeonse escrow on IEUM."
      ),
      url,
    };
    try {
      if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      /* 사용자가 공유 취소 → 링크 복사로 폴백 */
    }
    await navigator.clipboard.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 1600);
  }

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: esc, abi: jeonseAbi, functionName: "state" },
      { address: esc, abi: jeonseAbi, functionName: "landlord" },
      { address: esc, abi: jeonseAbi, functionName: "tenantIn" },
      { address: esc, abi: jeonseAbi, functionName: "tenantOut" },
      { address: esc, abi: jeonseAbi, functionName: "jeonseAmount" },
      { address: esc, abi: jeonseAbi, functionName: "refundAmount" },
      { address: esc, abi: jeonseAbi, functionName: "settleDate" },
      { address: esc, abi: jeonseAbi, functionName: "bridged" },
      { address: esc, abi: jeonseAbi, functionName: "claimable", args: [me ?? ZERO] },
      { address: esc, abi: jeonseAbi, functionName: "documentCount" },
      { address: esc, abi: jeonseAbi, functionName: "cancelApproved", args: [me ?? ZERO] },
    ],
    query: { refetchInterval: 4000 },
  });

  const state = data?.[0]?.result as number | undefined;
  const landlord = data?.[1]?.result as string | undefined;
  const tenantIn = data?.[2]?.result as string | undefined;
  const tenantOut = data?.[3]?.result as string | undefined;
  const jeonse = (data?.[4]?.result as bigint | undefined) ?? 0n;
  const refund = (data?.[5]?.result as bigint | undefined) ?? 0n;
  const settleDate = Number((data?.[6]?.result as bigint | undefined) ?? 0n);
  const bridged = data?.[7]?.result as boolean | undefined;
  const claimable = (data?.[8]?.result as bigint | undefined) ?? 0n;
  const docCount = Number((data?.[9]?.result as bigint | undefined) ?? 0n);
  const iApprovedCancel = data?.[10]?.result as boolean | undefined;

  const docsQuery = useReadContracts({
    contracts: Array.from({ length: docCount }, (_, i) => ({
      address: esc,
      abi: jeonseAbi,
      functionName: "documents" as const,
      args: [BigInt(i)] as const,
    })),
    query: { enabled: docCount > 0 },
  });

  async function run(name: string, fn: () => Promise<`0x${string}`>) {
    setBusy(name);
    setError(null);
    try {
      const hash = await fn();
      await publicClient!.waitForTransactionReceipt({ hash });
      await refetch();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  // 앵커된 각 문서에 대해 로컬 보관 원본이 있는지 조회 (하이드레이션 안전하게 마운트 후)
  useEffect(() => {
    const rows = docsQuery.data;
    if (!rows) return;
    const map: Record<string, { name: string; type: string }> = {};
    for (const d of rows) {
      const doc = d.result as readonly [`0x${string}`, string, `0x${string}`, bigint] | undefined;
      if (!doc) continue;
      const meta = readLocalDoc(esc, doc[0]);
      if (meta) map[doc[0].toLowerCase()] = { name: meta.name, type: meta.type };
    }
    setLocalDocs(map);
  }, [docsQuery.data, esc]);

  // 당사자만 호출: 로컬 보관 원본을 Blob 으로 복원해 새 탭에서 연다
  function openDoc(hash: string) {
    const meta = readLocalDoc(esc, hash);
    if (!meta) return;
    fetch(meta.dataUrl)
      .then((r) => r.blob())
      .then((b) => {
        const url = URL.createObjectURL(b);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      });
  }

  // 문서 앵커: 파일이 있으면 파일 바이트의 keccak256 을 해시로, 원본은 로컬 저장
  async function anchorDoc() {
    let hash: `0x${string}`;
    const nameForLabel = docLabel || file?.name || "document";
    if (file) {
      const buf = new Uint8Array(await file.arrayBuffer());
      hash = keccak256(buf);
      const dataUrl = await fileToDataUrl(file);
      try {
        localStorage.setItem(
          docKey(esc, hash),
          JSON.stringify({ name: file.name, type: file.type, dataUrl })
        );
      } catch {
        throw new Error(
          t(
            "파일이 너무 커서 로컬에 저장할 수 없습니다 (데모 한도). 더 작은 파일을 사용하세요.",
            "File too large to store locally (demo limit). Please use a smaller file."
          )
        );
      }
    } else {
      hash = keccak256(toBytes(`${nameForLabel}:${Date.now()}`));
    }
    const tx = await writeContractAsync({
      address: esc,
      abi: jeonseAbi,
      functionName: "anchorDocument",
      args: [hash, nameForLabel],
    });
    setDocLabel("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    return tx;
  }

  if (!data)
    return (
      <div className="min-h-screen bg-black">
        <AppNav />
        <main className="mx-auto max-w-6xl px-6">
          <div className="pt-12 pb-10">
            <div className="skeleton mb-3 h-4 w-24" />
            <div className="skeleton h-12 w-72" />
          </div>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px]">
            <div className="skeleton h-72 w-full" />
            <div className="skeleton h-56 w-full" />
          </div>
        </main>
      </div>
    );

  const meL = me?.toLowerCase();
  const isLandlord = meL === landlord?.toLowerCase();
  const isTenantIn = meL === tenantIn?.toLowerCase();
  const isTenantOut = meL === tenantOut?.toLowerCase();
  const isParty = isLandlord || isTenantIn || isTenantOut;
  const now = Math.floor(Date.now() / 1000);
  const canSettle = state === 1 && now >= settleDate;
  const label = "text-xs uppercase tracking-[0.15em] text-white/35";
  const primaryBtn =
    "pressable h-12 w-full rounded-full text-sm font-semibold disabled:opacity-40";

  const parties = [
    { role: t("집주인", "Landlord"), addr: landlord, meFlag: isLandlord, gets: t(`차액 ${fmtKRW(jeonse - refund)}`, `Balance ${fmtKRW(jeonse - refund)}`) },
    { role: t("신규 세입자", "Incoming tenant"), addr: tenantIn, meFlag: isTenantIn, gets: t(`전세금 ${fmtKRW(jeonse)} 락`, `Locks ${fmtKRW(jeonse)}`) },
    { role: t("기존 세입자", "Outgoing tenant"), addr: tenantOut, meFlag: isTenantOut, gets: t(`보증금 ${fmtKRW(refund)} 수령`, `Receives ${fmtKRW(refund)}`) },
  ];

  return (
    <div className="min-h-screen bg-black">
      <AppNav />
      <main className="mx-auto max-w-6xl px-6 pb-24">
        <FadeUp className="flex flex-col gap-4 pt-12 pb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/35">
              {t("전세 에스크로", "Jeonse Escrow")}
              <span
                className={`rounded-full border px-2.5 py-0.5 normal-case tracking-normal ${STATE_CLS[state ?? 0]}`}
              >
                {t(STATE_LABEL[state ?? 0][0], STATE_LABEL[state ?? 0][1])}
              </span>
              {bridged && (
                <span className="rounded-full border border-sky-400/30 px-2.5 py-0.5 normal-case tracking-normal text-sky-300">
                  {t("브리지 선지급됨", "Bridge advanced")}
                </span>
              )}
            </p>
            <h1 className="font-display text-4xl tracking-tight text-white md:text-5xl">
              {fmtKRW(jeonse)}
            </h1>
            <p className="mt-2 text-sm text-white/40">
              {t("정산일", "Settles")} {new Date(settleDate * 1000).toLocaleString("ko-KR")}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={shareEscrow}
              className="pressable inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-2 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white"
            >
              {shared ? <Check size={14} className="text-emerald-300" /> : <Share2 size={14} />}
              {shared ? t("링크 복사됨", "Link copied") : t("상대방에게 공유", "Share with counterparty")}
            </button>
            <a
              href={explorerUrl(`address/${esc}`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] px-3.5 py-2 text-sm text-white/40 transition-colors hover:text-white"
            >
              <span className="font-mono">{shortAddr(esc)}</span>
              <ArrowUpRight size={14} />
            </a>
          </div>
        </FadeUp>

        {/* Lifecycle */}
        {state !== 3 && (
          <FadeUp delay={0.04} className="mb-8">
            <StateFlow
              steps={[
                t("전세금 락", "Lock deposit"),
                t("정산일 대기", "Await settlement"),
                t("정산 완료", "Settled"),
              ]}
              active={state === 0 ? 0 : state === 1 ? 1 : 3}
            />
          </FadeUp>
        )}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px]">
          <FadeUp delay={0.08} className="flex flex-col gap-10">
            {/* 정산 구조 시각화 */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-8">
              <p className={`mb-6 flex items-center gap-1.5 ${label}`}>
                {t("원자적 연쇄 정산 구조", "Atomic chain settlement")}
                <InfoTip
                  text={t(
                    "'원자적'이란 세 사람의 몫이 한 트랜잭션에서 전부 처리되거나 전부 취소된다는 뜻입니다. 한쪽만 돈을 보내고 못 받는 상황이 원천적으로 불가능해요.",
                    "'Atomic' means all three parties' shares execute in one transaction — or none do. It's impossible for one side to pay and not get paid."
                  )}
                />
              </p>
              <div className="flex flex-col gap-3">
                {parties.map((p) => (
                  <div
                    key={p.role}
                    className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${
                      p.meFlag ? "border-white/30 bg-white/[0.04]" : "border-white/[0.06]"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {p.role} {p.meFlag && <span className="text-white/40">{t("— 나", "— you")}</span>}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-white/35">
                        {p.addr ? shortAddr(p.addr) : "—"}
                      </p>
                    </div>
                    <span className="text-sm text-white/60 tabular-nums">{p.gets}</span>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-xs leading-relaxed text-white/30">
                {t(
                  "정산일에 누구든 정산을 실행하면 세 몫이 한 트랜잭션에서 동시에 확정됩니다. 중간에 돈을 쥐는 사람이 없습니다.",
                  "On settlement day anyone can trigger settlement, and all three shares finalize in one transaction. No one holds the money in between."
                )}
              </p>
            </div>

            {/* 문서 앵커 */}
            <section>
              <h2 className={`mb-4 flex items-center gap-1.5 ${label}`}>
                {t("문서 앵커 — 서류 하이패스", "Document anchors — paperwork hi-pass")}
                <InfoTip
                  text={t(
                    "계약서 같은 서류의 '지문'(해시)만 체인에 기록해 나중에 위·변조를 증명할 수 있게 합니다. 원본 파일은 체인에 올라가지 않고, 이 거래의 당사자만 열람할 수 있어요.",
                    "Only a document's 'fingerprint' (hash) is recorded on-chain, proving it was never altered. The file itself never goes on-chain and is viewable only by parties to this deal."
                  )}
                />
              </h2>
              <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
                {docCount === 0 && (
                  <p className="px-6 py-10 text-center text-sm text-white/30">
                    {t("아직 앵커된 문서가 없습니다.", "No documents anchored yet.")}
                  </p>
                )}
                {docsQuery.data?.map((d, i) => {
                  const doc = d.result as
                    | readonly [`0x${string}`, string, `0x${string}`, bigint]
                    | undefined;
                  if (!doc) return null;
                  const local = localDocs[doc[0].toLowerCase()];
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-4 last:border-b-0"
                    >
                      <span className="flex min-w-0 items-center gap-3 text-sm text-white/70">
                        <FileCheck size={15} className="shrink-0 text-emerald-300/70" />
                        <span className="truncate">{doc[1]}</span>
                        <span className="hidden font-mono text-xs text-white/25 sm:inline">
                          {doc[0].slice(0, 10)}…
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-4">
                        <span className="hidden text-xs text-white/30 md:inline">
                          {shortAddr(doc[2])} ·{" "}
                          {new Date(Number(doc[3]) * 1000).toLocaleDateString("ko-KR")}
                        </span>
                        {local ? (
                          isParty ? (
                            <button
                              onClick={() => openDoc(doc[0])}
                              className="pressable flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white"
                            >
                              <Eye size={13} />
                              {t("열람", "View")}
                            </button>
                          ) : (
                            <span className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/30">
                              <Lock size={13} />
                              {t("당사자 전용", "Parties only")}
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-white/25">
                            {t("해시만 앵커됨", "Hash only")}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
                {isParty && state !== 2 && state !== 3 && (
                  <div className="flex flex-col gap-2 border-t border-white/[0.06] p-4">
                    <input
                      value={docLabel}
                      onChange={(e) => setDocLabel(e.target.value)}
                      placeholder={t("문서 이름 (예: 전세계약서)", "Document name (e.g. lease contract)")}
                      suppressHydrationWarning
                      className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-white/30"
                    />
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.hwp,.txt"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      {file ? (
                        <div className="flex h-10 flex-1 items-center justify-between gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.05] px-3 text-xs text-emerald-200">
                          <span className="flex min-w-0 items-center gap-2">
                            <Paperclip size={13} className="shrink-0" />
                            <span className="truncate">{file.name}</span>
                          </span>
                          <button
                            onClick={() => {
                              setFile(null);
                              if (fileRef.current) fileRef.current.value = "";
                            }}
                            className="pressable shrink-0 text-emerald-200/60 hover:text-emerald-200"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => fileRef.current?.click()}
                          className="pressable flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 px-3 text-xs font-medium text-white/50 transition-colors hover:border-white/30 hover:text-white/80"
                        >
                          <Paperclip size={13} />
                          {t("PDF·문서 첨부 (선택)", "Attach PDF / document (optional)")}
                        </button>
                      )}
                      <button
                        disabled={!!busy || (!docLabel && !file)}
                        onClick={() => run("anchor", anchorDoc)}
                        className="pressable shrink-0 rounded-lg border border-white/15 px-4 text-xs font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white disabled:opacity-40"
                      >
                        {busy === "anchor"
                          ? t("앵커 중", "Anchoring")
                          : file
                            ? t("문서 앵커", "Anchor document")
                            : t("해시 앵커", "Anchor hash")}
                      </button>
                    </div>
                    <p className="text-[11px] leading-relaxed text-white/25">
                      {t(
                        "원본은 체인에 올리지 않고 keccak256 해시만 앵커됩니다 (위·변조 증명). 첨부한 원본은 로컬에 안전 보관되며, 이 에스크로의 당사자만 열람할 수 있습니다.",
                        "Only the keccak256 hash is anchored on-chain (tamper-proof); the file itself is never uploaded to the public chain. Attached originals are stored locally and viewable only by parties to this escrow."
                      )}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </FadeUp>

          {/* 액션 패널 */}
          <FadeUp
            delay={0.16}
            className="flex h-fit flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 lg:sticky lg:top-24"
          >
            <p className={`${label} mb-4`}>{t("액션", "Actions")}</p>
            <SwapIn
              id={`${state}-${bridged}-${canSettle}-${claimable > 0n}-${chainId}-${me}`}
              className="flex flex-col gap-4"
            >
              {me && chainId !== giwaSepolia.id && (
                <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-center text-sm text-amber-300">
                  {t("지갑을 GIWA Sepolia로 전환해 주세요.", "Please switch your wallet to GIWA Sepolia.")}
                </p>
              )}
              {!me && (
                <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-white/40">
                  {t("지갑을 연결하면 거래에 참여할 수 있습니다", "Connect a wallet to take part in this deal")}
                </p>
              )}

              {state === 0 && isTenantIn && (
                <button
                  disabled={!!busy}
                  className={`${primaryBtn} bg-white text-black`}
                  onClick={() =>
                    run("fund", async () => {
                      const bal = (await publicClient!.readContract({
                        address: MOCKKRW_ADDRESS,
                        abi: mockKrwAbi,
                        functionName: "balanceOf",
                        args: [me!],
                      })) as bigint;
                      if (bal < jeonse) {
                        throw new Error(
                          t(
                            `mKRW 잔액이 부족합니다 — 필요 ${fmtKRW(jeonse)}, 보유 ${fmtKRW(bal)}. 대시보드에서 '테스트 원화 발급'을 눌러 충전하세요.`,
                            `Insufficient mKRW — need ${fmtKRW(jeonse)}, you have ${fmtKRW(bal)}. Mint test KRW from the dashboard.`
                          )
                        );
                      }
                      const allowance = (await publicClient!.readContract({
                        address: MOCKKRW_ADDRESS,
                        abi: mockKrwAbi,
                        functionName: "allowance",
                        args: [me!, esc],
                      })) as bigint;
                      if (allowance < jeonse) {
                        const h = await writeContractAsync({
                          address: MOCKKRW_ADDRESS,
                          abi: mockKrwAbi,
                          functionName: "approve",
                          args: [esc, maxUint256],
                        });
                        await publicClient!.waitForTransactionReceipt({ hash: h });
                      }
                      return writeContractAsync({
                        address: esc,
                        abi: jeonseAbi,
                        functionName: "fund",
                      });
                    })
                  }
                >
                  {busy === "fund" ? t("락 처리 중", "Locking") : t(`전세금 락 — ${fmtKRW(jeonse)}`, `Lock deposit — ${fmtKRW(jeonse)}`)}
                </button>
              )}
              {state === 0 && !isTenantIn && me && (
                <p className="text-sm leading-relaxed text-white/40">
                  {t("신규 세입자의 전세금 락을 기다리는 중입니다.", "Waiting for the incoming tenant to lock the deposit.")}
                </p>
              )}

              {state === 1 && isTenantOut && !bridged && (
                <div className="flex flex-col gap-3">
                  <button
                    disabled={!!busy}
                    className={`${primaryBtn} bg-sky-400 text-black`}
                    onClick={() =>
                      run("bridge", () =>
                        writeContractAsync({
                          address: BRIDGE_POOL_ADDRESS,
                          abi: bridgePoolAbi,
                          functionName: "bridge",
                          args: [esc],
                        })
                      )
                    }
                  >
                    {busy === "bridge"
                      ? t("선지급 처리 중", "Advancing")
                      : t(`보증금 미리 받기 — ${fmtKRW((refund * 9950n) / 10000n)}`, `Get refund early — ${fmtKRW((refund * 9950n) / 10000n)}`)}
                  </button>
                  <p className="text-xs leading-relaxed text-white/30">
                    {t(
                      "다음 세입자의 전세금이 이미 락되어 있으므로, 브리지 풀이 보증금을 즉시 선지급합니다 (수수료 0.5%). 정산일에 풀이 자동으로 상환받습니다.",
                      "Because the next tenant deposit is already locked, the bridge pool advances your refund instantly (0.5% fee) and gets repaid automatically at settlement."
                    )}
                  </p>
                </div>
              )}

              {canSettle && (
                <button
                  disabled={!!busy}
                  className={`${primaryBtn} bg-emerald-400 text-black`}
                  onClick={() =>
                    run("settle", () =>
                      writeContractAsync({ address: esc, abi: jeonseAbi, functionName: "settle" })
                    )
                  }
                >
                  {busy === "settle" ? t("정산 중", "Settling") : t("연쇄 정산 실행 — 한 트랜잭션", "Execute settlement — one transaction")}
                </button>
              )}
              {state === 1 && !canSettle && (
                <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm leading-relaxed text-emerald-300">
                  {t(
                    `전세금 ${fmtKRW(jeonse)}이 락되었습니다. 정산일이 되면 누구나 정산을 실행할 수 있습니다.`,
                    `${fmtKRW(jeonse)} is locked. Once the settlement date arrives, anyone can execute settlement.`
                  )}
                </p>
              )}

              {claimable > 0n && (
                <button
                  disabled={!!busy}
                  className={`${primaryBtn} bg-white text-black`}
                  onClick={() =>
                    run("claim", () =>
                      writeContractAsync({ address: esc, abi: jeonseAbi, functionName: "claim" })
                    )
                  }
                >
                  {busy === "claim" ? t("수령 중", "Claiming") : t(`${fmtKRW(claimable)} 수령`, `Claim ${fmtKRW(claimable)}`)}
                </button>
              )}

              {state === 1 && (isLandlord || isTenantIn) && !bridged && (
                <button
                  disabled={!!busy || iApprovedCancel}
                  className={`${primaryBtn} border border-white/15 text-white/70 hover:border-white/30`}
                  onClick={() =>
                    run("cancel", () =>
                      writeContractAsync({ address: esc, abi: jeonseAbi, functionName: "cancel" })
                    )
                  }
                >
                  {iApprovedCancel
                    ? t("취소 동의 완료 — 상대방 대기", "Cancel approved — awaiting counterparty")
                    : busy === "cancel"
                      ? t("처리 중", "Processing")
                      : t("상호 취소 동의", "Approve mutual cancel")}
                </button>
              )}
              {state === 0 && isLandlord && (
                <button
                  disabled={!!busy}
                  className={`${primaryBtn} border border-white/15 text-white/70 hover:border-white/30`}
                  onClick={() =>
                    run("cancel", () =>
                      writeContractAsync({ address: esc, abi: jeonseAbi, functionName: "cancel" })
                    )
                  }
                >
                  {busy === "cancel" ? t("처리 중", "Processing") : t("에스크로 취소", "Cancel escrow")}
                </button>
              )}

              {state === 2 && claimable === 0n && (
                <p className="rounded-xl border border-indigo-400/20 bg-indigo-400/5 p-4 text-center text-sm text-indigo-300">
                  {t("정산이 완료된 에스크로입니다.", "This escrow has been settled.")}
                </p>
              )}
              {state === 3 && (
                <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-white/40">
                  {t("취소된 에스크로입니다.", "This escrow was cancelled.")}
                </p>
              )}

              {error && (
                <p className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-xs leading-relaxed break-words text-red-300">
                  {error}
                </p>
              )}
            </SwapIn>
          </FadeUp>
        </div>
      </main>
    </div>
  );
}
