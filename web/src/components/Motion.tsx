"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

export const EASE = [0.23, 1, 0.32, 1] as const;

/** SSR과 클라이언트 지갑 상태 불일치로 인한 하이드레이션 오류 방지용 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** 마지막으로 유효(undefined 아님)했던 값을 유지한다.
 *  동시 접속/RPC 부하로 읽기가 일시 실패해 값이 undefined 로 튈 때 화면이 0으로 깜빡이는 것을 방지. */
export function useSticky<T>(value: T | undefined): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  if (value !== undefined && value !== null) ref.current = value;
  return ref.current;
}

/** 마운트 시 아래에서 떠오르는 래퍼 — 페이지 섹션 스태거용 */
export function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** 값이 바뀔 때 스프링으로 굴러가는 숫자 (증가·감소 모두 애니메이션).
 *  decimals>0 이면 소수점 자리까지 부드럽게 굴린다 (APY·Health Factor 등). */
export function AnimatedNumber({
  value,
  format = (n) => n.toLocaleString("ko-KR"),
  decimals = 0,
}: {
  value: number;
  format?: (n: number) => string;
  decimals?: number;
}) {
  const factor = 10 ** decimals;
  const spring = useSpring(value * factor, { stiffness: 90, damping: 24 });
  const display = useTransform(spring, (v) => format(Math.round(v) / factor));
  const prev = useRef<number | null>(null);
  useEffect(() => {
    const scaled = value * factor;
    // 최초 표시값이나 0에서 올라오는 값은 애니메이션 없이 즉시 스냅한다.
    // (데이터 로드/리페치 때 0→수백만 롤업이 '잠깐 줄었다 늘어나는' 착시를 만드는 것을 방지)
    if (prev.current === null || prev.current === 0) {
      spring.jump(scaled);
    } else {
      spring.set(scaled);
    }
    prev.current = scaled;
  }, [value, factor, spring]);
  return <motion.span>{display}</motion.span>;
}

/** 상태 전환 시 부드럽게 교체되는 블록 (액션 패널용) */
export function SwapIn({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 10, filter: "blur(3px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.35, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
