export type Chapter = {
  slug: string;
  number: string; // 한자 표기 — "一", "二" 등
  title: string; // 2026-11-26 클라이언트 요청 문구로 바꿈(메뉴·페이지 제목·카드 공통)
  subtitle: string;
  description: string;
  comingSoon?: boolean;
  // 이 장을 아카이브(/archive/{slug})가 아닌 다른 페이지로 연결할 때 사용.
  // 예: 사진(寫眞)→갤러리(/gallery), 영상(映像)→영상 페이지(/videos).
  // href 가 있으면 자체 글 목록·사이트맵·챕터 메타에서는 제외된다.
  href?: string;
  // 아카이브 페이지에서 연결 버튼에 쓰는 문구 (예: "영상 보러 가기").
  linkLabel?: string;
  // blinded: 공개 화면 전체에서 가린다(메인·아카이브·메뉴·검색·사이트맵·글 주소).
  // 관리자 화면과 DB·원고 파일은 그대로 둔다. 다시 열려면 이 줄만 지우면 된다.
  blinded?: boolean;
};

// 모든 장 — 관리자 화면·원고 동기화용. 공개 화면은 아래 chapters 를 쓴다.
export const allChapters: Chapter[] = [
  {
    slug: "yeongi",
    number: "一",
    title: "연혁",
    subtitle: "영가회의 발자취",
    description:
      "회(會)의 발자취와 첫 모임의 기록. 창립의 인연과 정체성을 담았습니다. 1977년 창립이후 각 회장 시기별 성과와 역사를 정리했습니다",
  },
  {
    slug: "moim",
    number: "二",
    title: "행사",
    subtitle: "회장별·정기 행사 기록",
    description:
      "정기 모임, 신년하례, 탐방, 시상식 — 함께 모인 자리의 기록. 시기별 시대별로 주요 행사와 관련 사진을 모았습니다.",
  },
  {
    slug: "geul",
    number: "三",
    title: "기고문(연사, 영가회보)",
    subtitle: "회원이 남긴 글과 인물 기록",
    description:
      "회원들이 남긴 수필과 기고문, 그리고 역대 회장과 명사들의 인물 기록을 함께 담았습니다. 영가회 40연사와 2021년 이후 영가회보에 게재된 기고문을 정리해두었습니다",
  },
  {
    slug: "jachui",
    number: "四",
    title: "자취",
    subtitle: "사진과 자료",
    description: "행사 사진, 문서, 서화 모음. 한 모임이 남긴 발자취.",
    blinded: true, // 2026-11-23 요청 — 자취·향 전체 블라인드
  },
  {
    slug: "hyang",
    number: "五",
    title: "향(鄕)",
    subtitle: "안동, 회의 뿌리",
    description: "영가회의 고향 안동을 기록합니다. 정신·문화·사람의 뿌리.",
    blinded: true, // 2026-11-23 요청 — 자취·향 전체 블라인드
  },
  {
    slug: "yeongsang",
    number: "六",
    title: "사진",
    subtitle: "사진 아카이브",
    description: "회의 사진을 모아 둔 갤러리입니다.",
    href: "/gallery",
    linkLabel: "갤러리 보러 가기",
  },
  {
    slug: "dongyeong",
    number: "七",
    title: "영상",
    subtitle: "영상 아카이브",
    description: "회의 영상을 모아 둔 자리입니다.",
    href: "/videos",
    linkLabel: "영상 보러 가기",
  },
  {
    slug: "hoewon",
    number: "八",
    title: "회원",
    subtitle: "회원 명단",
    description:
      "회원수첩에 오른 회원들입니다. 성명과 직장·직위만 실었고 주소와 연락처는 공개하지 않습니다.",
    href: "/members",
    linkLabel: "회원 명단 보러 가기",
  },
  {
    slug: "munhwasang",
    number: "九",
    title: "역대 영가문화상·선행상·공로상 수상자",
    subtitle: "영가문화상 · 선행상 · 공로상",
    description:
      "영가회가 드린 상의 기록입니다. 영가문화상, 영가선행상, 그리고 회에 공을 세운 분께 드린 공로패·감사패를 모았습니다.",
    href: "/awards",
    linkLabel: "수상 기록 보러 가기",
  },
];

const HANJA_NUMBERS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

// 공개 장 — 가린 장을 빼고 번호(一, 二, …)를 빈칸 없이 다시 매긴다.
export const chapters: Chapter[] = allChapters
  .filter((c) => !c.blinded)
  .map((c, i) => ({ ...c, number: HANJA_NUMBERS[i] ?? c.number }));

// 공개 장 수를 우리말로 — "일곱 장", "일곱 개의 장"
const KO_COUNTS = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];
export const CHAPTER_COUNT_KO: string = KO_COUNTS[chapters.length] ?? String(chapters.length);

export const BLINDED_CHAPTER_SLUGS: string[] = allChapters
  .filter((c) => c.blinded)
  .map((c) => c.slug);

/** 공개 장만 찾는다 — 가린 장은 undefined (글·목록 주소가 404 가 된다). */
/** 장 제목이 긴가(예: "역대 영가문화상·선행상·공로상 수상자") — 큰 제목 글자 크기를 한 단계 줄일 때 쓴다. */
export function isLongChapterTitle(title: string): boolean {
  return title.length > 8;
}

export function getChapter(slug: string): Chapter | undefined {
  return chapters.find((c) => c.slug === slug);
}

/** 관리자용 — 가린 장도 찾는다. */
export function getAnyChapter(slug: string): Chapter | undefined {
  return allChapters.find((c) => c.slug === slug);
}

export function isPublicChapter(slug: string): boolean {
  return !BLINDED_CHAPTER_SLUGS.includes(slug);
}

/** /archive/<가린 장>/… 로 가는 주소인지 */
export function isBlindedHref(href: string): boolean {
  const m = href.match(/^\/archive\/([^/?#]+)/);
  return !!m && BLINDED_CHAPTER_SLUGS.includes(m[1]);
}

/** 본문 HTML 속 가린 장으로 가는 링크를 글자만 남기고 푼다. */
export function unlinkBlindedChapters(html: string): string {
  if (BLINDED_CHAPTER_SLUGS.length === 0) return html;
  const re = new RegExp(
    `<a\\b[^>]*href="(?:https?://(?:www\\.)?yeongga\\.com)?/archive/(?:${BLINDED_CHAPTER_SLUGS.join("|")})(?:[/?#][^"]*)?"[^>]*>([\\s\\S]*?)</a>`,
    "gi",
  );
  return html.replace(re, "$1");
}
