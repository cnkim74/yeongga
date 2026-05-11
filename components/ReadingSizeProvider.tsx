"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/* ─── 글자 크기 (1~5) ─────────────────────────── */
export type ReadingLevel = 1 | 2 | 3 | 4 | 5;
const SIZE_KEY = "yeongga.reading-level";
const SIZE_DEFAULT: ReadingLevel = 3;

/* ─── 본문 폰트 ─────────────────────────────────── */
export type ReadingFont = "serif" | "sans";
const FONT_KEY = "yeongga.reading-font";
const FONT_DEFAULT: ReadingFont = "serif";

/* ─── 화면 모드 ─────────────────────────────────── */
export type ReadingTheme = "light" | "dark";
const THEME_KEY = "yeongga.reading-theme";
const THEME_DEFAULT: ReadingTheme = "light";

type Ctx = {
  level: ReadingLevel;
  setLevel: (l: ReadingLevel) => void;
  inc: () => void;
  dec: () => void;
  font: ReadingFont;
  setFont: (f: ReadingFont) => void;
  theme: ReadingTheme;
  setTheme: (t: ReadingTheme) => void;
};

const ReadingSizeCtx = createContext<Ctx | null>(null);

export function ReadingSizeProvider({ children }: { children: React.ReactNode }) {
  const [level, setLevelState] = useState<ReadingLevel>(SIZE_DEFAULT);
  const [font, setFontState] = useState<ReadingFont>(FONT_DEFAULT);
  const [theme, setThemeState] = useState<ReadingTheme>(THEME_DEFAULT);

  /* 마운트 시 저장값 복원 */
  useEffect(() => {
    try {
      const savedSize = window.localStorage.getItem(SIZE_KEY);
      const n = savedSize ? Number(savedSize) : SIZE_DEFAULT;
      if ([1, 2, 3, 4, 5].includes(n)) {
        setLevelState(n as ReadingLevel);
        document.documentElement.dataset.reading = String(n);
      }
      const savedFont = window.localStorage.getItem(FONT_KEY);
      if (savedFont === "sans" || savedFont === "serif") {
        setFontState(savedFont);
        document.documentElement.dataset.font = savedFont;
      }
      const savedTheme = window.localStorage.getItem(THEME_KEY);
      if (savedTheme === "dark" || savedTheme === "light") {
        setThemeState(savedTheme);
        document.documentElement.dataset.theme = savedTheme;
      }
    } catch {}
  }, []);

  const setLevel = useCallback((l: ReadingLevel) => {
    setLevelState(l);
    document.documentElement.dataset.reading = String(l);
    try { window.localStorage.setItem(SIZE_KEY, String(l)); } catch {}
  }, []);

  const setFont = useCallback((f: ReadingFont) => {
    setFontState(f);
    document.documentElement.dataset.font = f;
    try { window.localStorage.setItem(FONT_KEY, f); } catch {}
  }, []);

  const setTheme = useCallback((t: ReadingTheme) => {
    setThemeState(t);
    document.documentElement.dataset.theme = t;
    try { window.localStorage.setItem(THEME_KEY, t); } catch {}
  }, []);

  const inc = useCallback(
    () => setLevel(Math.min(5, level + 1) as ReadingLevel),
    [level, setLevel]
  );
  const dec = useCallback(
    () => setLevel(Math.max(1, level - 1) as ReadingLevel),
    [level, setLevel]
  );

  const value = useMemo(
    () => ({ level, setLevel, inc, dec, font, setFont, theme, setTheme }),
    [level, setLevel, inc, dec, font, setFont, theme, setTheme]
  );

  return <ReadingSizeCtx.Provider value={value}>{children}</ReadingSizeCtx.Provider>;
}

export function useReadingSize() {
  const ctx = useContext(ReadingSizeCtx);
  if (!ctx) throw new Error("useReadingSize must be used inside ReadingSizeProvider");
  return ctx;
}

/**
 * 첫 페인트 전에 저장값을 적용해 깜빡임(FOUC)을 방지하는 인라인 스크립트.
 * 글자 크기 · 폰트 · 다크모드를 모두 한 번에 처리합니다.
 */
export const READING_INIT_SCRIPT = `(function(){
  try {
    var d = document.documentElement;
    // 글자 크기
    var v = localStorage.getItem('${SIZE_KEY}');
    var n = v ? parseInt(v, 10) : ${SIZE_DEFAULT};
    if ([1,2,3,4,5].indexOf(n) === -1) n = ${SIZE_DEFAULT};
    d.setAttribute('data-reading', String(n));
    // 폰트
    var f = localStorage.getItem('${FONT_KEY}');
    if (f !== 'serif' && f !== 'sans') f = '${FONT_DEFAULT}';
    d.setAttribute('data-font', f);
    // 다크모드
    var t = localStorage.getItem('${THEME_KEY}');
    if (t !== 'light' && t !== 'dark') t = '${THEME_DEFAULT}';
    d.setAttribute('data-theme', t);
  } catch(e) {
    document.documentElement.setAttribute('data-reading', '${SIZE_DEFAULT}');
    document.documentElement.setAttribute('data-font', '${FONT_DEFAULT}');
    document.documentElement.setAttribute('data-theme', '${THEME_DEFAULT}');
  }
})();`;
