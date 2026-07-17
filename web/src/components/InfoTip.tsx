"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

const W = 248;

/** 용어 설명 툴팁 — 호버/포커스/탭 모두 지원, 포탈로 렌더링해 overflow-hidden 컨테이너에서도 잘리지 않는다 */
export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const show = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.min(Math.max(r.left + r.width / 2 - W / 2, 12), vw - W - 12);
    // 아래 공간이 부족하면 위로 뒤집기
    if (r.bottom + 150 < vh) setPos({ left, top: r.bottom + 8 });
    else setPos({ left, bottom: vh - r.top + 8 });
    setOpen(true);
  }, []);
  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, hide]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={text}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (open) hide();
          else show();
        }}
        className="pressable -my-1 inline-flex shrink-0 cursor-pointer items-center p-1 align-middle text-white/30 outline-none transition-colors hover:text-white/70 focus-visible:text-white/70"
      >
        <Info size={13} />
      </button>
      {open &&
        pos &&
        createPortal(
          <span
            role="tooltip"
            style={{ width: W, left: pos.left, top: pos.top, bottom: pos.bottom }}
            className="pointer-events-none fixed z-[80] rounded-xl border border-white/10 bg-neutral-900 p-3.5 text-xs font-normal tracking-normal normal-case whitespace-normal text-white/75 shadow-xl shadow-black/60 leading-relaxed"
          >
            {text}
          </span>,
          document.body
        )}
    </>
  );
}
