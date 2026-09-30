// 8개 장(章) 아이콘 — 각 장의 주제를 한국 전통 사물로 나타낸 라인 드로잉
//   연혁=두루마리 · 행사=북 · 기고=붓과 벼루 · 자취=와당
//   향=산과 강 · 사진=사진틀 · 영상=창호에 비친 장면 · 회원=호패

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

    // 一 연혁(沿革) — 두루마리(卷軸): 펼친 기록
    case "yeongi":
    case "yeon-gi":
      return (
        <svg {...base}>
          {/* 왼쪽 축 */}
          <line x1="13" y1="16" x2="13" y2="48" />
          <ellipse cx="13" cy="16" rx="4" ry="2.5" />
          <ellipse cx="13" cy="48" rx="4" ry="2.5" />
          {/* 오른쪽 축 */}
          <line x1="51" y1="16" x2="51" y2="48" />
          <ellipse cx="51" cy="16" rx="4" ry="2.5" />
          <ellipse cx="51" cy="48" rx="4" ry="2.5" />
          {/* 펼쳐진 종이 */}
          <line x1="13" y1="16" x2="51" y2="16" />
          <line x1="13" y1="48" x2="51" y2="48" />
          {/* 글줄 */}
          <line x1="22" y1="26" x2="42" y2="26" />
          <line x1="22" y1="32" x2="42" y2="32" />
          <line x1="22" y1="38" x2="35" y2="38" />
        </svg>
      );

    case "moim":
      return (
        <svg {...base}>
          {/* 북통 */}
          <ellipse cx="32" cy="18" rx="13" ry="5" />
          <path d="M19 18 C16 26 16 34 19 42" />
          <path d="M45 18 C48 26 48 34 45 42" />
          <ellipse cx="32" cy="42" rx="13" ry="5" />
          {/* 테 */}
          <path d="M18 24 Q32 28 46 24" strokeOpacity="0.45" />
          <path d="M18 36 Q32 40 46 36" strokeOpacity="0.45" />
          {/* 받침 */}
          <path d="M22 47 L18 56" />
          <path d="M42 47 L46 56" />
          <line x1="14" y1="56" x2="50" y2="56" />
        </svg>
      );

    // 三 기고 — 붓과 벼루(筆硯): 글을 남기는 도구
    case "geul":
      return (
        <svg {...base}>
          {/* 붓대 */}
          <line x1="47" y1="10" x2="27" y2="34" />
          <line x1="52" y1="14" x2="32" y2="38" />
          <line x1="47" y1="10" x2="52" y2="14" />
          {/* 붓털 */}
          <path d="M27 34 L32 38 L23 45 Q20 46 21 42 Z" />
          {/* 벼루 */}
          <path d="M12 50 Q12 46 17 46 L40 46 Q45 46 45 50 Q45 55 40 55 L17 55 Q12 55 12 50" />
          <ellipse cx="22" cy="50.5" rx="5" ry="2.5" strokeOpacity="0.5" />
        </svg>
      );

    // 八 회원(會員) — 호패(號牌): 이름을 적어 차던 신분패
    case "hoewon":
    case "saram":
      return (
        <svg {...base}>
          {/* 패 몸통 */}
          <path d="M32 9 L45 18 L45 50 Q45 55 40 55 L24 55 Q19 55 19 50 L19 18 Z" />
          {/* 끈 구멍 */}
          <circle cx="32" cy="16" r="2.2" />
          {/* 새김 글줄 */}
          <line x1="26" y1="28" x2="38" y2="28" />
          <line x1="26" y1="35" x2="38" y2="35" />
          <line x1="26" y1="42" x2="34" y2="42" />
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

    // 六 사진(寫眞) — 사진틀: 틀 안에 담은 풍경
    case "yeongsang":
      return (
        <svg {...base}>
          {/* 바깥 틀 */}
          <rect x="8" y="12" width="48" height="40" rx="3" />
          {/* 안쪽 여백선 */}
          <rect x="13" y="17" width="38" height="30" rx="2" strokeOpacity="0.45" />
          {/* 해 */}
          <circle cx="23" cy="26" r="3.5" />
          {/* 산 */}
          <path d="M14 43 L25 32 L32 39 L40 29 L50 43" />
        </svg>
      );

    // 七 영상(映像) — 창호에 비친 그림자놀이: 빛으로 보는 장면
    case "dongyeong":
      return (
        <svg {...base}>
          {/* 창틀 */}
          <rect x="9" y="13" width="46" height="38" rx="3" />
          {/* 창살 */}
          <line x1="9" y1="22" x2="55" y2="22" strokeOpacity="0.35" />
          <line x1="9" y1="42" x2="55" y2="42" strokeOpacity="0.35" />
          {/* 비치는 장면 — 재생 표시 */}
          <path d="M28 25 L41 32 L28 39 Z" />
          {/* 받침 다리 */}
          <line x1="18" y1="51" x2="18" y2="56" />
          <line x1="46" y1="51" x2="46" y2="56" />
        </svg>
      );

    default:
      return null;
  }
}
