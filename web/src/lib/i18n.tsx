"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Lang = "ko" | "en";

const LangCtx = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (ko: string, en: string) => string;
}>({ lang: "ko", setLang: () => {}, t: (ko) => ko });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ko");

  useEffect(() => {
    if (localStorage.getItem("ieum-lang") === "en") setLangState("en");
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("ieum-lang", l);
  };

  const t = (ko: string, en: string) => (lang === "ko" ? ko : en);

  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);

/** KR | EN 세그먼트 토글 */
export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div
      className={`flex items-center rounded-full border border-white/10 p-0.5 text-[11px] font-semibold ${className}`}
    >
      {(["ko", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`pressable rounded-full px-2.5 py-1 transition-colors ${
            lang === l ? "bg-white text-black" : "text-white/40 hover:text-white"
          }`}
        >
          {l === "ko" ? "KR" : "EN"}
        </button>
      ))}
    </div>
  );
}
