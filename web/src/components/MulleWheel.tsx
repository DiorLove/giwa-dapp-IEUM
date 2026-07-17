"use client";
import { useLang } from "@/lib/i18n";

/** 멤버를 원형으로 배치하고 현재 순번을 강조하는 물레 UI (다크) */
export function MulleWheel({
  order,
  current,
  me,
}: {
  order: string[];
  current: number;
  me?: string;
}) {
  const { t } = useLang();
  const n = order.length;
  if (n === 0) return null;
  const R = 80;
  return (
    <svg viewBox="-110 -110 220 220" className="mx-auto w-60">
      <circle
        className="wheel-ring"
        r={R}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={2}
        strokeDasharray="4 4"
      />
      {/* 진행률 아크 */}
      <circle
        r={R}
        fill="none"
        stroke="#f59e0b"
        strokeOpacity={0.5}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={`${(Math.min(current, n) / n) * 2 * Math.PI * R} ${2 * Math.PI * R}`}
        transform="rotate(-90)"
        style={{ transition: "stroke-dasharray 700ms cubic-bezier(0.77, 0, 0.175, 1)" }}
      />
      {order.map((addr, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const x = R * Math.cos(angle);
        const y = R * Math.sin(angle);
        const isCurrent = i === current;
        const isMe = me && addr.toLowerCase() === me.toLowerCase();
        const done = i < current;
        return (
          <g key={addr} transform={`translate(${x},${y})`}>
            {isCurrent && (
              <circle className="wheel-pulse" r={18} fill="none" stroke="#f59e0b" strokeWidth={2} />
            )}
            <circle
              r={isCurrent ? 18 : 14}
              fill={
                done
                  ? "rgba(255,255,255,0.25)"
                  : isCurrent
                    ? "#f59e0b"
                    : "rgba(255,255,255,0.06)"
              }
              stroke={isMe ? "#fff" : "rgba(255,255,255,0.25)"}
              strokeWidth={isMe ? 2.5 : 1.5}
            />
            <text
              textAnchor="middle"
              dy={4}
              fontSize={isCurrent ? 11 : 9}
              fontWeight="bold"
              fill={isCurrent ? "#000" : "rgba(255,255,255,0.8)"}
            >
              {i + 1}
            </text>
            {isMe && (
              <text textAnchor="middle" dy={-24} fontSize={10} fontWeight="bold" fill="#fff">
                {t("나", "me")}
              </text>
            )}
          </g>
        );
      })}
      <text textAnchor="middle" dy={-4} fontSize={13} fontWeight="800" fill="#fff">
        {current < n
          ? t(`${current + 1}번째 회차`, `Round ${current + 1}`)
          : t("완주", "Complete")}
      </text>
      <text textAnchor="middle" dy={14} fontSize={9} fill="rgba(255,255,255,0.4)">
        {current < n
          ? t("물레가 돌고 있어요", "The wheel is turning")
          : t("모두가 목돈을 탔어요", "Everyone got their pot")}
      </text>
    </svg>
  );
}
