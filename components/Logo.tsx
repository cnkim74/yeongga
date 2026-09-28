// 永嘉會 아카이브 — 브랜드 로고 컴포넌트
// 로고 락업 = [원형 메달리온] + [永嘉會 워드마크(붓글씨)] + (옵션)〈영가회 디지털 50년사 | 슬로건〉
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
  {
    mark: number;
    word: number;
    sub: number;
    gap: number;
    // 메달리온 ↔ 永嘉會 워드마크 사이는 한 덩어리로 보이게 더 좁힌다.
    markGap: number;
    subTracking: number;
  }
> = {
  sm: { mark: 40, word: 26, sub: 11, gap: 8, markGap: 6, subTracking: 0.02 },
  md: { mark: 56, word: 42, sub: 13, gap: 12, markGap: 9, subTracking: 0.02 },
  lg: { mark: 64, word: 46, sub: 14, gap: 14, markGap: 10, subTracking: 0.02 },
  xl: { mark: 96, word: 60, sub: 18, gap: 16, markGap: 12, subTracking: 0.02 },
};

const SUB_TITLE = "영가회 디지털 50년사";
const SLOGAN = "친목도모 상부상조 후진양성 고향발전";

const SERIF = "'Noto Serif KR','Nanum Myeongjo',var(--font-serif),serif";

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
  const sloganColor = inverse ? "rgba(10,10,10,0.6)" : "rgba(255,255,255,0.7)";
  const dividerColor = inverse ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.32)";

  const subTitleStyle = {
    fontSize: Math.max(11, s.sub - 2),
    color: subColor,
    letterSpacing: `${s.subTracking}em`,
    fontFamily: SERIF,
    whiteSpace: "nowrap" as const,
    lineHeight: 1.2,
  };

  const sloganStyle = {
    fontSize: s.sub + 2,
    color: sloganColor,
    letterSpacing: "0.02em",
    fontFamily: SERIF,
    whiteSpace: "nowrap" as const,
    lineHeight: 1.2,
  };

  // 세로 구분선 — 락업 높이의 60% 정도만 차지하게
  const divider = (key: string, extraClass = "") => (
    <span
      key={key}
      aria-hidden="true"
      className={extraClass}
      style={{
        width: 1,
        height: Math.round(s.mark * 0.6),
        background: dividerColor,
        flexShrink: 0,
      }}
    />
  );

  if (variant === "stacked") {
    return (
      <div className={`inline-flex flex-col items-center ${className}`}>
        <LogoMark size={s.mark} />
        <div className="mt-2">
          <Wordmark height={s.word} inverse={inverse} />
        </div>
        {showAnniversary && (
          <div className="mt-2 text-center">
            <div style={subTitleStyle}>{SUB_TITLE}</div>
            <div style={{ ...sloganStyle, marginTop: 2 }}>{SLOGAN}</div>
          </div>
        )}
      </div>
    );
  }

  // horizontal — [메달리온] [永嘉會 + 그 아래 '영가회 디지털 50년사'] | [슬로건]
  //   부제는 워드마크 폭에 맞춰 넣고, 슬로건은 오른쪽에 조금 크게 둔다.
  const wordWidth = Math.round(s.word * JEHO_RATIO);
  return (
    <div
      className={`inline-flex items-center ${className}`}
      style={{ gap: s.gap }}
    >
      <LogoMark size={s.mark} />
      <span
        className="inline-flex flex-col items-center"
        style={{ gap: 2, marginLeft: s.markGap - s.gap }}
      >
        <Wordmark height={s.word} inverse={inverse} />
        {showAnniversary && (
          <span
            aria-label={SUB_TITLE}
            style={{
              ...subTitleStyle,
              // 워드마크와 같은 폭으로 글자를 고르게 벌린다.
              width: wordWidth,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            {Array.from(SUB_TITLE.replace(/ /g, "\u2009")).map((ch, i) => (
              <span key={i} aria-hidden="true">
                {ch}
              </span>
            ))}
          </span>
        )}
      </span>
      {showAnniversary && (
        <>
          {divider("d1")}
          <span style={sloganStyle}>{SLOGAN}</span>
        </>
      )}
    </div>
  );
}
