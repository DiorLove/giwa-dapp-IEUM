"use client";

/** 멤버를 원형으로 배치하고 현재 순번을 강조하는 물레 UI */
export function MulleWheel({
  order,
  current,
  me,
}: {
  order: string[];
  current: number;
  me?: string;
}) {
  const n = order.length;
  if (n === 0) return null;
  const R = 80;
  return (
    <svg viewBox="-110 -110 220 220" className="mx-auto w-60">
      <circle r={R} fill="none" stroke="#d6d3d1" strokeWidth={2} strokeDasharray="4 4" />
      {order.map((addr, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const x = R * Math.cos(angle);
        const y = R * Math.sin(angle);
        const isCurrent = i === current;
        const isMe = me && addr.toLowerCase() === me.toLowerCase();
        const done = i < current;
        return (
          <g key={addr} transform={`translate(${x},${y})`}>
            <circle
              r={isCurrent ? 18 : 14}
              fill={done ? "#a8a29e" : isCurrent ? "#f59e0b" : "#fff"}
              stroke={isMe ? "#1c1917" : "#d6d3d1"}
              strokeWidth={isMe ? 3 : 1.5}
            />
            <text
              textAnchor="middle"
              dy={4}
              fontSize={isCurrent ? 11 : 9}
              fontWeight="bold"
              fill={done || isCurrent ? "#fff" : "#57534e"}
            >
              {i + 1}
            </text>
            {isMe && (
              <text textAnchor="middle" dy={-24} fontSize={10} fontWeight="bold" fill="#1c1917">
                나
              </text>
            )}
          </g>
        );
      })}
      <text textAnchor="middle" dy={-4} fontSize={13} fontWeight="800" fill="#1c1917">
        {current < n ? `${current + 1}번째 회차` : "완주 🎉"}
      </text>
      <text textAnchor="middle" dy={14} fontSize={9} fill="#a8a29e">
        {current < n ? "물레가 돌고 있어요" : "모두가 목돈을 탔어요"}
      </text>
    </svg>
  );
}
