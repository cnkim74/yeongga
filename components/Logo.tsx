// 永嘉會 · 영가회 아카이브 — 브랜드 로고 컴포넌트
// 마크는 인라인 SVG, 워드마크·부제는 HTML 텍스트로 — 사이트의 폰트 흐름과
// 그대로 어울리고 색·크기를 부모 흐름에 맡길 수 있도록.

type Variant = "mark" | "horizontal" | "stacked";
type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<
  Size,
  {
    mark: number;
    main: number;
    sub: number;
    sub2: number;
    gap: number;
    subTracking: number;
  }
> = {
  sm: { mark: 30, main: 16, sub: 9, sub2: 8, gap: 8, subTracking: 0.18 },
  md: { mark: 40, main: 22, sub: 11, sub2: 10, gap: 12, subTracking: 0.2 },
  lg: { mark: 64, main: 34, sub: 13, sub2: 12, gap: 16, subTracking: 0.22 },
  xl: { mark: 96, main: 50, sub: 18, sub2: 16, gap: 20, subTracking: 0.24 },
};

const ANNIVERSARY_LABEL = "創立 45周年";

export function LogoMark({
  size = 36,
  inverse = false,
  className,
}: {
  size?: number;
  inverse?: boolean;
  className?: string;
}) {
  const bg = inverse ? "#0a0a0a" : "#fbfaf7";
  const fg = inverse ? "#fbfaf7" : "#0a0a0a";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="10" fill={bg} />
      <text
        x="32"
        y="48"
        fontFamily="'Noto Serif KR','Nanum Myeongjo','Apple SD Gothic Neo',serif"
        fontSize="46"
        fontWeight="700"
        textAnchor="middle"
        fill={fg}
      >
        永
      </text>
    </svg>
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

  const textBlock = (
    <div className="leading-tight text-left">
      <div
        style={{
          fontSize: s.main,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        永嘉會
      </div>
      <div
        style={{
          fontSize: s.sub,
          opacity: 0.7,
          letterSpacing: `${s.subTracking}em`,
          fontFamily:
            "'Noto Sans KR','Pretendard',var(--font-sans),sans-serif",
          marginTop: 2,
        }}
      >
        YEONGGA · ARCHIVE
      </div>
      {showAnniversary && (
        <div
          style={{
            fontSize: s.sub2,
            opacity: 0.55,
            letterSpacing: `${s.subTracking * 0.85}em`,
            fontFamily:
              "'Noto Serif KR','Nanum Myeongjo',var(--font-serif),serif",
            marginTop: 4,
          }}
        >
          {ANNIVERSARY_LABEL}
        </div>
      )}
    </div>
  );

  if (variant === "stacked") {
    return (
      <div className={`inline-flex flex-col items-center ${className}`}>
        <LogoMark size={s.mark} inverse={inverse} />
        <div className="text-center mt-2 leading-tight">
          <div
            style={{
              fontSize: s.main,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            永嘉會
          </div>
          <div
            style={{
              fontSize: s.sub,
              opacity: 0.7,
              letterSpacing: `${s.subTracking}em`,
              fontFamily:
                "'Noto Sans KR','Pretendard',var(--font-sans),sans-serif",
              marginTop: 2,
            }}
          >
            YEONGGA · ARCHIVE
          </div>
          {showAnniversary && (
            <div
              style={{
                fontSize: s.sub2,
                opacity: 0.55,
                letterSpacing: `${s.subTracking * 0.85}em`,
                fontFamily:
                  "'Noto Serif KR','Nanum Myeongjo',var(--font-serif),serif",
                marginTop: 4,
              }}
            >
              {ANNIVERSARY_LABEL}
            </div>
          )}
        </div>
      </div>
    );
  }

  // horizontal
  return (
    <div
      className={`inline-flex items-center ${className}`}
      style={{ gap: s.gap }}
    >
      <LogoMark size={s.mark} inverse={inverse} />
      {textBlock}
    </div>
  );
}
