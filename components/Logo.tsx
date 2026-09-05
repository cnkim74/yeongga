// 永嘉會 아카이브 — 브랜드 로고 컴포넌트
// 로고 락업 = [원형 메달리온] + [永嘉會 워드마크(붓글씨)] + (옵션)〈디지털 아카이브 / 창립 50주년〉
//   · 메달리온: 금색 엔소(원) 안에 永嘉會 세로 붓글씨. 자체 어두운 배경 + 금빛이라
//     밝은/어두운 테마 양쪽에서 원형으로 잘 어울린다(테마 무관).
//   · 워드마크: 영가회보 제호 필체 PNG(흰/검 글씨 — 테마에 따라 전환).

import Image from "next/image";

type Variant = "mark" | "horizontal" | "stacked";
type Size = "sm" | "md" | "lg" | "xl";

const ENSO_SRC = "/brand/logo-enso.png";

// 제호(워드마크) 원본 비율: 가로 518 × 세로 171 ≈ 3.03 : 1
const JEHO_RATIO = 518 / 171;

const SIZES: Record<
  Size,
  { mark: number; word: number; sub: number; gap: number; subTracking: number }
> = {
  sm: { mark: 38, word: 24, sub: 11, gap: 11, subTracking: 0.14 },
  md: { mark: 46, word: 30, sub: 13, gap: 14, subTracking: 0.16 },
  lg: { mark: 64, word: 40, sub: 15, gap: 18, subTracking: 0.18 },
  xl: { mark: 96, word: 56, sub: 20, gap: 22, subTracking: 0.2 },
};

const SUB_LINES = ["디지털 아카이브", "창립 50주년"];

// 원형 금색 메달리온 마크
export function LogoMark({
  size = 44,
  className,
}: {
  // 메달리온 지름(px).
  size?: number;
  // 메달리온은 테마와 무관 — 호출부 호환용으로만 받고 무시.
  inverse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        lineHeight: 0,
      }}
    >
      <Image
        src={ENSO_SRC}
        alt="永嘉會"
        width={size}
        height={size}
        draggable={false}
        priority
        style={{ width: size, height: size, objectFit: "cover", display: "block" }}
      />
    </span>
  );
}

// 永嘉會 워드마크(제호 붓글씨) — 밝은 배경에선 검정, 어두운 배경에선 흰 글씨
function Wordmark({
  height,
  inverse = false,
}: {
  height: number;
  inverse?: boolean;
}) {
  const src = inverse ? "/brand/jeho-black.png" : "/brand/jeho-white.png";
  const w = Math.round(height * JEHO_RATIO);
  return (
    <Image
      src={src}
      alt="永嘉會"
      width={w}
      height={height}
      draggable={false}
      priority
      style={{ width: w, height, objectFit: "contain", flexShrink: 0 }}
    />
  );
}

export function Logo({
  variant = "horizontal",
  size = "md",
  inverse = false,
  showAnniversary = false,
  className = "",
}: {
  variant?: Variant;
  size?: Size;
  inverse?: boolean;
  showAnniversary?: boolean;
  className?: string;
}) {
  const s = SIZES[size];

  // mark 단독 — 메달리온만
  if (variant === "mark") {
    return <LogoMark size={s.mark} className={className} />;
  }

  const subColor = inverse ? "rgba(10,10,10,0.85)" : "rgba(255,255,255,0.92)";
  const dividerColor = inverse ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.32)";

  const anniversaryBlock = showAnniversary ? (
    <div
      style={{
        fontSize: s.sub,
        color: subColor,
        letterSpacing: `${s.subTracking}em`,
        fontFamily:
          "'Noto Serif KR','Nanum Myeongjo',var(--font-serif),serif",
        whiteSpace: "nowrap",
        lineHeight: 1.35,
      }}
    >
      {SUB_LINES.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  ) : null;

  if (variant === "stacked") {
    return (
      <div className={`inline-flex flex-col items-center ${className}`}>
        <LogoMark size={s.mark} />
        <div className="mt-2">
          <Wordmark height={s.word} inverse={inverse} />
        </div>
        {anniversaryBlock && <div className="mt-2">{anniversaryBlock}</div>}
      </div>
    );
  }

  // horizontal — 메달리온 + 워드마크 + (옵션) 세로 구분선 + 두 줄 부제
  return (
    <div
      className={`inline-flex items-center ${className}`}
      style={{ gap: s.gap }}
    >
      <LogoMark size={s.mark} />
      <Wordmark height={s.word} inverse={inverse} />
      {showAnniversary && (
        <div
          style={{
            borderLeft: `1px solid ${dividerColor}`,
            paddingLeft: s.gap,
          }}
        >
          {anniversaryBlock}
        </div>
      )}
    </div>
  );
}
