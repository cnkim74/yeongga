"use client";

import {
  useReadingSize,
  type ReadingLevel,
  type ReadingFont,
  type ReadingTheme,
} from "./ReadingSizeProvider";

const LEVELS: { level: ReadingLevel; label: string }[] = [
  { level: 1, label: "작게" },
  { level: 2, label: "조금 작게" },
  { level: 3, label: "보통" },
  { level: 4, label: "크게" },
  { level: 5, label: "아주 크게" },
];

const FONTS: { value: ReadingFont; label: string; sample: string }[] = [
  { value: "serif", label: "명조 (明朝)", sample: "글" },
  { value: "sans",  label: "고딕 (Gothic)", sample: "글" },
];

const THEMES: { value: ReadingTheme; label: string; icon: string }[] = [
  { value: "light", label: "밝게",   icon: "☼" },
  { value: "dark",  label: "어둡게", icon: "☾" },
];

/**
 * 통합 보기 설정 컨트롤 — 글자 크기 / 본문 폰트 / 화면 모드
 * 헤더 우측 상단 패널과 모바일 메뉴 시트에서 사용됨.
 */
export function ReadingSizeControl() {
  const { level, setLevel, font, setFont, theme, setTheme } = useReadingSize();

  return (
    <div className="space-y-5 min-w-[260px]">
      {/* ── 글자 크기 ── */}
      <section>
        <div className="text-[11px] font-semibold tracking-widest text-[var(--color-ink-mute)] mb-2 px-1 uppercase">
          글자 크기
        </div>
        <div
          role="group"
          aria-label="본문 글자 크기"
          className="flex items-center gap-1"
        >
          {LEVELS.map((l, i) => {
            const active = level === l.level;
            const fontPx = 13 + i * 2;
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
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: `${fontPx}px`,
                  lineHeight: 1,
                }}
              >
                가
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 본문 폰트 ── */}
      <section>
        <div className="text-[11px] font-semibold tracking-widest text-[var(--color-ink-mute)] mb-2 px-1 uppercase">
          본문 폰트
        </div>
        <div
          role="group"
          aria-label="본문 폰트"
          className="grid grid-cols-2 gap-1.5"
        >
          {FONTS.map((f) => {
            const active = font === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFont(f.value)}
                aria-pressed={active}
                className={`flex items-center justify-center gap-2 h-12 rounded-xl border transition ${
                  active
                    ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                    : "border-[var(--color-rule)] text-[var(--color-ink-soft)] hover:border-[var(--color-ink-mute)]"
                }`}
              >
                <span
                  className="text-xl leading-none"
                  style={{
                    fontFamily: f.value === "serif" ? "var(--font-serif)" : "var(--font-sans)",
                    fontWeight: f.value === "serif" ? 500 : 700,
                  }}
                >
                  {f.sample}
                </span>
                <span className="text-[11px] font-medium tracking-wide">
                  {f.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 화면 모드 ── */}
      <section>
        <div className="text-[11px] font-semibold tracking-widest text-[var(--color-ink-mute)] mb-2 px-1 uppercase">
          화면 모드
        </div>
        <div
          role="group"
          aria-label="화면 모드"
          className="grid grid-cols-2 gap-1.5"
        >
          {THEMES.map((t) => {
            const active = theme === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                aria-pressed={active}
                className={`flex items-center justify-center gap-2 h-10 rounded-xl border transition ${
                  active
                    ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                    : "border-[var(--color-rule)] text-[var(--color-ink-soft)] hover:border-[var(--color-ink-mute)]"
                }`}
              >
                <span className="text-base leading-none" aria-hidden="true">
                  {t.icon}
                </span>
                <span className="text-xs font-medium">{t.label}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
