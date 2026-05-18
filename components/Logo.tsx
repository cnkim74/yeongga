// 永嘉會 아카이브 — 브랜드 로고 컴포넌트
// 마크는 영가회보 1면 제호의 필체를 그대로 추출한 PNG (흰 글씨/투명 배경).
// 부제는 옵션으로 〈창립 50주년〉을 우측에 곁들임.

type Variant = "mark" | "horizontal" | "stacked";
type Size = "sm" | "md" | "lg" | "xl";

// 제호 이미지 원본 비율: 가로 518 × 세로 171 ≈ 3.03 : 1
const JEHO_RATIO = 518 / 171;

const SIZES: Record<
  Size,
  { mark: number; sub: number; gap: number; subTracking: number }
> = {
  sm: { mark: 26, sub: 11, gap: 10, subTracking: 0.14 },
  md: { mark: 34, sub: 13, gap: 14, subTracking: 0.16 },
  lg: { mark: 56, sub: 15, gap: 18, subTracking: 0.18 },
  xl: { mark: 88, sub: 20, gap: 22, subTracking: 0.2 },
};

const SUB_LINES = ["디지털 아카이브", "창립 50주년"];

export function LogoMark({
  size = 36,
  inverse = false,
  className,
}: {
  // 마크 높이(px). 가로는 비율로 자동 산출.
  size?: number;
  // 밝은 배경에서 쓸 때 검정 글씨로 (기본은 어두운 배경용 흰 글씨).
  inverse?: boolean;
  className?: string;
}) {
  const src = inverse ? "/brand/jeho-black.png" : "/brand/jeho-white.png";
  const w = Math.round(size * JEHO_RATIO);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="永嘉會"
      width={w}
      height={size}
      className={className}
      draggable={false}
      style={{ width: w, height: size, objectFit: "contain" }}
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

  if (variant === "mark") {
    return <LogoMark size={s.mark} inverse={inverse} className={className} />;
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
        <LogoMark size={s.mark} inverse={inverse} />
        {anniversaryBlock && <div className="mt-2">{anniversaryBlock}</div>}
      </div>
    );
  }

  // horizontal — 제호 + (옵션) 세로 구분선 + 두 줄 부제
  return (
    <div
      className={`inline-flex items-center ${className}`}
      style={{ gap: s.gap }}
    >
      <LogoMark size={s.mark} inverse={inverse} />
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
