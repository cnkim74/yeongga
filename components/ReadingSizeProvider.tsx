"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ReadingLevel = 1 | 2 | 3 | 4 | 5;
const STORAGE_KEY = "yeongga.reading-level";
const DEFAULT: ReadingLevel = 3;

type Ctx = {
  level: ReadingLevel;
  setLevel: (l: ReadingLevel) => void;
  inc: () => void;
  dec: () => void;
};

const ReadingSizeCtx = createContext<Ctx | null>(null);

export function ReadingSizeProvider({ children }: { children: React.ReactNode }) {
  const [level, setLevelState] = useState<ReadingLevel>(DEFAULT);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const n = saved ? Number(saved) : DEFAULT;
    if ([1, 2, 3, 4, 5].includes(n)) {
      setLevelState(n as ReadingLevel);
      document.documentElement.dataset.reading = String(n);
    } else {
      document.documentElement.dataset.reading = String(DEFAULT);
    }
  }, []);

  const setLevel = useCallback((l: ReadingLevel) => {
    setLevelState(l);
    document.documentElement.dataset.reading = String(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(l));
    } catch {}
  }, []);

  const inc = useCallback(
    () => setLevel(Math.min(5, level + 1) as ReadingLevel),
    [level, setLevel]
  );
  const dec = useCallback(
    () => setLevel(Math.max(1, level - 1) as ReadingLevel),
    [level, setLevel]
  );

  const value = useMemo(() => ({ level, setLevel, inc, dec }), [level, setLevel, inc, dec]);

  return <ReadingSizeCtx.Provider value={value}>{children}</ReadingSizeCtx.Provider>;
}

export function useReadingSize() {
  const ctx = useContext(ReadingSizeCtx);
  if (!ctx) throw new Error("useReadingSize must be used inside ReadingSizeProvider");
  return ctx;
}

// 첫 페인트 전에 저장된 레벨을 적용해 깜빡임을 방지하는 인라인 스크립트
export const READING_INIT_SCRIPT = `(function(){try{var v=localStorage.getItem('${STORAGE_KEY}');var n=v?parseInt(v,10):${DEFAULT};if([1,2,3,4,5].indexOf(n)===-1){n=${DEFAULT}};document.documentElement.setAttribute('data-reading',String(n));}catch(e){document.documentElement.setAttribute('data-reading','${DEFAULT}');}})();`;
