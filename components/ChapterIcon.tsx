// 8개 장(章) 전통 오브제 아이콘
// 각 아이콘은 한국 전통 사물을 모티프로 한 심플한 라인 드로잉

const S = "currentColor";
const W = 1.4;

export function ChapterIcon({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const base = {
    viewBox: "0 0 64 64",
    fill: "none" as const,
    stroke: S,
    strokeWidth: W,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (slug) {

    // 一 연기(緣起) — 인장(印章): 도장과 손잡이
    case "yeongi":
    case "yeon-gi":
      return (
        <svg {...base}>
          {/* 손잡이 */}
          <rect x="24" y="9" width="16" height="12" rx="3" />
          {/* 몸통 */}
          <rect x="16" y="21" width="32" height="28" rx="2" />
          {/* 인면(印面) 테두리 */}
          <rect x="21" y="26" width="22" height="18" />
          {/* 글자 획 암시 */}
          <line x1="26" y1="32" x2="37" y2="32" />
          <line x1="26" y1="37" x2="37" y2="37" />
        </svg>
      );

    // 二 모임 — 사발(沙鉢): 함께 나누는 그릇
    case "moim":
      return (
        <svg {...base}>
          {/* 아가리 타원 */}
          <ellipse cx="32" cy="20" rx="18" ry="5" />
          {/* 왼쪽 곡선 */}
          <path d="M14 20 C12 34 18 46 23 50" />
          {/* 오른쪽 곡선 */}
          <path d="M50 20 C52 34 46 46 41 50" />
          {/* 굽(足) */}
          <ellipse cx="32" cy="50" rx="9" ry="3" />
          {/* 어깨선 — 사발의 곡선 */}
          <path d="M14 20 Q18 24 23 50" strokeOpacity="0" />
          {/* 문양 암시: 동심원 하나 */}
          <ellipse cx="32" cy="34" rx="10" ry="3" strokeOpacity="0.4" />
        </svg>
      );

    // 三 글 — 죽간(竹簡): 묶인 대나무 서판
    case "geul":
      return (
        <svg {...base}>
          {/* 죽간 4편 */}
          <rect x="11" y="14" width="8" height="36" rx="3" />
          <rect x="22" y="14" width="8" height="36" rx="3" />
          <rect x="33" y="14" width="8" height="36" rx="3" />
          <rect x="44" y="14" width="8" height="36" rx="3" />
          {/* 결속 끈 */}
          <path d="M10 24 Q22 22 32 24 Q42 26 54 24" />
          <path d="M10 40 Q22 38 32 40 Q42 42 54 40" />
        </svg>
      );

    // 四 사람 — 갓(笠): 선비의 전통 모자
    case "saram":
      return (
        <svg {...base}>
          {/* 모자 위 둥근 정수리 */}
          <path d="M26 14 Q32 9 38 14" />
          {/* 모정(帽頂) — 원통형 정수리 */}
          <line x1="26" y1="14" x2="26" y2="38" />
          <line x1="38" y1="14" x2="38" y2="38" />
          {/* 챙(帽) — 넓은 차양 */}
          <path d="M8 38 Q32 44 56 38" />
          <path d="M8 38 Q32 33 56 38" />
          {/* 갓끈 */}
          <line x1="32" y1="44" x2="32" y2="54" />
          <path d="M28 54 Q32 57 36 54" />
        </svg>
      );

    // 五 자취 — 와당(瓦當): 기와 끝의 연화문
    case "jachui":
    case "jachwi":
      return (
        <svg {...base}>
          {/* 외곽 원 */}
          <circle cx="32" cy="32" r="20" />
          {/* 내권(內圈) */}
          <circle cx="32" cy="32" r="13" />
          {/* 중심 유두(乳頭) */}
          <circle cx="32" cy="32" r="4" fill={S} fillOpacity="0.9" stroke="none" />
          {/* 연화문 — 4엽 */}
          <path d="M32 19 Q38 25 32 28 Q26 25 32 19" />
          <path d="M45 32 Q39 38 36 32 Q39 26 45 32" />
          <path d="M32 45 Q26 39 32 36 Q38 39 32 45" />
          <path d="M19 32 Q25 26 28 32 Q25 38 19 32" />
        </svg>
      );

    // 六 향(鄕) — 산과 강: 안동 낙동강이 감싸는 산세
    case "hyang":
      return (
        <svg {...base}>
          {/* 산봉우리 3개 */}
          <path d="M6 44 L18 22 L26 34 L36 14 L48 34 L56 44" />
          {/* 지평선 */}
          <line x1="6" y1="44" x2="58" y2="44" />
          {/* 강(낙동강) — S자 굽이 */}
          <path d="M6 53 C16 47 24 58 34 52 C44 46 52 56 58 52" />
        </svg>
      );

    // 七 영상(影像) — 창호(窓戶): 전통 격자 창
    case "yeongsang":
      return (
        <svg {...base}>
          {/* 바깥 창틀 */}
          <rect x="10" y="10" width="44" height="44" rx="2" />
          {/* 가로살 2개 */}
          <line x1="10" y1="25" x2="54" y2="25" />
          <line x1="10" y1="39" x2="54" y2="39" />
          {/* 세로살 2개 */}
          <line x1="25" y1="10" x2="25" y2="54" />
          <line x1="39" y1="10" x2="39" y2="54" />
        </svg>
      );

    // 八 동영(動影) — 청사초롱(燈籠): 전통 등불
    case "dongyeong":
      return (
        <svg {...base}>
          {/* 걸이 고리 */}
          <line x1="32" y1="7" x2="32" y2="13" />
          <circle cx="32" cy="7" r="3" />
          {/* 윗갓 */}
          <path d="M22 18 Q32 13 42 18" />
          {/* 등체 왼쪽 */}
          <path d="M22 18 C18 32 20 44 24 50" />
          {/* 등체 오른쪽 */}
          <path d="M42 18 C46 32 44 44 40 50" />
          {/* 아랫갓 */}
          <path d="M24 50 Q32 55 40 50" />
          {/* 세로 살 3개 */}
          <path d="M27 18 C25 32 25 44 27 50" />
          <line x1="32" y1="17" x2="32" y2="51" />
          <path d="M37 18 C39 32 39 44 37 50" />
          {/* 술(流蘇) */}
          <line x1="29" y1="55" x2="28" y2="61" />
          <line x1="32" y1="55" x2="32" y2="61" />
          <line x1="35" y1="55" x2="36" y2="61" />
        </svg>
      );

    default:
      return null;
  }
}
