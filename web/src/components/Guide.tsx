"use client";
import { Fragment, useEffect, useState } from "react";
import { Check, Compass, X } from "lucide-react";
import { useLang } from "@/lib/i18n";

/** "이렇게 진행돼요" 단계 가이드 카드 — 닫으면 localStorage에 기억 */
export function GuideSteps({
  id,
  title,
  steps,
}: {
  id: string;
  title: string;
  steps: { t: string; d: string }[];
}) {
  const { t } = useLang();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem(`ieum-guide:${id}`)) setVisible(true);
  }, [id]);
  if (!visible) return null;
  return (
    <section className="stagger-item mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-7">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-white/35">
          <Compass size={13} />
          {title}
        </p>
        <button
          onClick={() => {
            localStorage.setItem(`ieum-guide:${id}`, "1");
            setVisible(false);
          }}
          aria-label={t("가이드 닫기", "Dismiss guide")}
          className="pressable -m-1 p-1 text-white/30 transition-colors hover:text-white"
        >
          <X size={15} />
        </button>
      </div>
      <ol
        style={{ "--n": steps.length } as React.CSSProperties}
        className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-[repeat(var(--n),minmax(0,1fr))]"
      >
        {steps.map((s, i) => (
          <li key={i}>
            <span className="font-mono text-xs text-white/25 tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="mt-1.5 text-sm font-medium text-white">{s.t}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/40">{s.d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** 상세 페이지 라이프사이클 표시기 — 지금 어느 단계인지. active === steps.length 면 전부 완료 */
export function StateFlow({ steps, active }: { steps: string[]; active: number }) {
  return (
    <div className="flex items-center gap-2.5 overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.01] px-5 py-4">
      {steps.map((s, i) => {
        const done = i < active;
        const cur = i === active;
        return (
          <Fragment key={s}>
            {i > 0 && (
              <span
                aria-hidden
                className={`h-px min-w-4 flex-1 ${done || cur ? "bg-white/25" : "bg-white/[0.08]"}`}
              />
            )}
            <span className="flex shrink-0 items-center gap-2">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] tabular-nums ${
                  done
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                    : cur
                      ? "border-white/60 text-white"
                      : "border-white/15 text-white/30"
                }`}
              >
                {done ? <Check size={11} /> : i + 1}
              </span>
              <span
                className={`text-xs ${cur ? "font-medium text-white" : done ? "text-white/60" : "text-white/30"}`}
              >
                {s}
              </span>
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}
