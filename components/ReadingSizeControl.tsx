"use client";

import { useReadingSize, type ReadingLevel } from "./ReadingSizeProvider";

const LEVELS: { level: ReadingLevel; label: string }[] = [
  { level: 1, label: "작게" },
  { level: 2, label: "조금 작게" },
  { level: 3, label: "보통" },
  { level: 4, label: "크게" },
  { level: 5, label: "아주 크게" },
];

export function ReadingSizeControl() {
  const { level, setLevel } = useReadingSize();

  return (
    <div
      role="group"
      aria-label="본문 글자 크기"
      className="flex items-center gap-1"
    >
      {LEVELS.map((l, i) => {
        const active = level === l.level;
        const fontPx = 13 + i * 2; // 13,15,17,19,21
        return (
          <button
            key={l.level}
            type="button"
            onClick={() => setLevel(l.level)}
            aria-pressed={active}
            aria-label={`${l.label} (${l.level}단계)`}
            title={`${l.label} (${l.level}단계)`}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
              active
                ? "bg-[var(--color-ink)] text-white"
                : "text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-deep)]"
            }`}
            style={{ fontFamily: "var(--font-serif)", fontSize: `${fontPx}px`, lineHeight: 1 }}
          >
            가
          </button>
        );
      })}
    </div>
  );
}
