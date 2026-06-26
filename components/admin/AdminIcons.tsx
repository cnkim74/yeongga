/**
 * 집무실 사이드바·페이지용 미니멀 라인 아이콘
 * - 전통 모티프(서책·인장·문)를 현대 라인으로 추상화
 * - 1.5 stroke, 18×18, currentColor 사용으로 톤 일관성 유지
 */

type IconProps = { className?: string; size?: number };

function Svg({
  children,
  size = 18,
  className,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/* 집무실 홈 — 한옥의 문 */
export const IconHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 21V10l8-6 8 6v11" />
    <path d="M9 21v-6h6v6" />
    <path d="M4 10h16" />
  </Svg>
);

/* 슬라이드 — 액자 */
export const IconSlides = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="1.5" />
    <path d="M3 16l5-5 4 4 3-3 6 6" />
    <circle cx="8.5" cy="9.5" r="1.2" />
  </Svg>
);

/* 영상 — 필름 */
export const IconVideo = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="6" width="18" height="12" rx="1.5" />
    <path d="M10 9.5v5l4.5-2.5z" />
  </Svg>
);

/* 글 — 서책 */
export const IconArticle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
    <path d="M5 17h14" />
    <path d="M9 8h6M9 11.5h6" />
  </Svg>
);

/* 갤러리 — 격자 산수 */
export const IconGallery = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="8" height="8" rx="1" />
    <rect x="13" y="3" width="8" height="8" rx="1" />
    <rect x="3" y="13" width="8" height="8" rx="1" />
    <rect x="13" y="13" width="8" height="8" rx="1" />
  </Svg>
);

/* 이북 — 펼친 책 */
export const IconEbook = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 5.5C5 5 8 5 12 6.5 16 5 19 5 21 5.5v12c-2-.5-5-.5-9 1-4-1.5-7-1.5-9-1z" />
    <path d="M12 6.5v12" />
  </Svg>
);

/* 회원 — 인영(印) */
export const IconMembers = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="9" r="3.5" />
    <path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <circle cx="17" cy="7.5" r="2.5" />
    <path d="M21 17c0-2.5-1.8-4.5-4-4.5" />
  </Svg>
);

/* 태그 — 낙관 */
export const IconTag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12V4h8l10 10-8 8z" />
    <circle cx="7.5" cy="7.5" r="1.3" />
  </Svg>
);

/* 배경 — 산수화 */
export const IconBackground = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="1.5" />
    <path d="M3 17l5-6 4 4 3-3 6 5" />
    <circle cx="16" cy="9" r="1.6" />
  </Svg>
);

/* 설정 — 톱니 */
export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
  </Svg>
);

/* 외부 이동 — 화살표 */
export const IconExternal = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4h6v6" />
    <path d="M20 4l-9 9" />
    <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
  </Svg>
);

/* 인장 — 영가회 로고 마크 대용 */
export const IconSeal = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="1" />
    <path d="M8 8h8M8 12h8M8 16h8" />
  </Svg>
);

/* 자료실 — 서류함(폴더) */
export const IconArchive = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M9 13h6" />
  </Svg>
);
