"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useLang } from "@/lib/i18n";

const EASE = [0.23, 1, 0.32, 1] as const;
const VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4";

export function PhilosophySection() {
  const { t } = useLang();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="overflow-hidden bg-black px-6 py-28 md:py-40">
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: EASE }}
          className="mb-16 text-5xl tracking-tight text-white md:mb-24 md:text-7xl lg:text-8xl"
        >
          {t("전통", "Tradition")}{" "}
          <span className="font-display italic text-white/40">×</span>{" "}
          {t("체인", "Chain")}
        </motion.h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
            className="aspect-[4/3] overflow-hidden rounded-3xl"
          >
            <video
              src={VIDEO}
              muted
              autoPlay
              loop
              playsInline
              preload="auto"
              className="h-full w-full object-cover"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
            className="flex flex-col justify-center"
          >
            <div>
              <p className="mb-4 text-xs uppercase tracking-widest text-white/40">
                {t("돈이 사람 손을 거치지 않는다", "Money never touches human hands")}
              </p>
              <p className="text-base leading-relaxed text-white/70 md:text-lg">
                {t(
                  "전세금은 집주인을 거쳐 흐르지 않습니다. 컨트랙트에 락된 돈이 정산일에 보증금 반환과 차액 지급으로 동시에 갈라집니다. 한 트랜잭션 안에서 — 그래서 먹튀도, 지연도 구조적으로 불가능합니다.",
                  "Deposits never flow through the landlord. Funds locked in the contract split into the refund and the balance simultaneously on settlement day — inside a single transaction. Fraud and delay become structurally impossible."
                )}
              </p>
            </div>
            <div className="my-8 h-px w-full bg-white/10" />
            <div>
              <p className="mb-4 text-xs uppercase tracking-widest text-white/40">
                {t("며칠의 공백은 풀이 잇는다", "The pool bridges the gap of days")}
              </p>
              <p className="text-base leading-relaxed text-white/70 md:text-lg">
                {t(
                  "이사 날짜가 어긋나는 그 며칠 — 브리지 풀이 잇습니다. 다음 세입자의 돈이 이미 락된 것을 컨트랙트가 확인한 뒤에만 선지급하니, 담보가 눈에 보이는 초단기 유동성입니다. 수수료는 예치자의 수익이 됩니다.",
                  "Those few days when moving dates misalign — the bridge pool links them. It advances funds only after the contract confirms the next tenant's money is already locked: ultra-short liquidity with visible collateral. Fees go to depositors."
                )}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
