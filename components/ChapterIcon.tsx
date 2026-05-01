// 5개 장에 대응되는 단순한 라인 아이콘
// (WISE의 "Wise의 제품들" 라인 아이콘 톤)

const stroke = "currentColor";
const sw = 1.4;

export function ChapterIcon({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  switch (slug) {
    case "yeon-gi": // 緣起 — 뿌리 / 시작
      return (
        <svg viewBox="0 0 64 64" fill="none" stroke={stroke} strokeWidth={sw}
             strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="32" cy="20" r="6" />
          <path d="M32 26v12" />
          <path d="M32 38c-6 4-10 8-12 14" />
          <path d="M32 38c6 4 10 8 12 14" />
          <path d="M32 38v14" />
        </svg>
      );
    case "moim": // 모임 — 둘러앉은 점들
      return (
        <svg viewBox="0 0 64 64" fill="none" stroke={stroke} strokeWidth={sw}
             strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="32" cy="32" r="14" />
          <circle cx="32" cy="14" r="3" />
          <circle cx="50" cy="22" r="3" />
          <circle cx="50" cy="42" r="3" />
          <circle cx="32" cy="50" r="3" />
          <circle cx="14" cy="42" r="3" />
          <circle cx="14" cy="22" r="3" />
        </svg>
      );
    case "geul": // 글 — 펼친 책 / 만년필
      return (
        <svg viewBox="0 0 64 64" fill="none" stroke={stroke} strokeWidth={sw}
             strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M10 14h18c2 0 4 1 4 4v32c0-3-2-4-4-4H10z" />
          <path d="M54 14H36c-2 0-4 1-4 4v32c0-3 2-4 4-4h18z" />
          <path d="M32 18v32" />
        </svg>
      );
    case "saram": // 사람 — 어른 두 사람
      return (
        <svg viewBox="0 0 64 64" fill="none" stroke={stroke} strokeWidth={sw}
             strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="22" cy="20" r="6" />
          <path d="M10 50c0-7 5-12 12-12s12 5 12 12" />
          <circle cx="44" cy="24" r="5" />
          <path d="M34 50c0-6 4-10 10-10s10 4 10 10" />
        </svg>
      );
    case "natnal": // 낫낱 — 카메라 / 사진
      return (
        <svg viewBox="0 0 64 64" fill="none" stroke={stroke} strokeWidth={sw}
             strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="8" y="18" width="48" height="32" rx="3" />
          <path d="M22 18l4-6h12l4 6" />
          <circle cx="32" cy="34" r="9" />
          <circle cx="32" cy="34" r="4" />
          <circle cx="48" cy="26" r="1.5" fill={stroke} />
        </svg>
      );
    default:
      return null;
  }
}
