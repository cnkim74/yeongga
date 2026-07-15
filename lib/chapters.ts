export type Chapter = {
  slug: string;
  number: string; // 한자 표기 — "一", "二" 등
  title: string;
  subtitle: string;
  description: string;
  comingSoon?: boolean;
  // 이 장을 아카이브(/archive/{slug})가 아닌 다른 페이지로 연결할 때 사용.
  // 예: 동영(動影)은 영상 페이지(/videos)와 같은 내용이라 그리로 보낸다.
  // href 가 있으면 자체 글 목록·사이트맵·챕터 메타에서는 제외된다.
  href?: string;
};

export const chapters: Chapter[] = [
  {
    slug: "yeongi",
    number: "一",
    title: "연기(緣起)",
    subtitle: "영가회의 시작",
    description: "회(會)의 발자취와 첫 모임의 기록. 창립의 인연과 정체성을 담았습니다.",
  },
  {
    slug: "moim",
    number: "二",
    title: "모임",
    subtitle: "회장별·정기 행사 기록",
    description: "정기 모임, 신년하례, 탐방, 시상식 — 함께 모인 자리의 기록.",
  },
  {
    slug: "geul",
    number: "三",
    title: "글",
    subtitle: "회원이 남긴 글",
    description: "회원들이 남긴 수필, 기고문, 회상록. 한 사람의 목소리가 기록이 됩니다.",
  },
  {
    slug: "saram",
    number: "四",
    title: "사람",
    subtitle: "인물 평전",
    description: "역대 회장과 명사들의 이야기. 한 분 한 분의 삶을 기록합니다.",
  },
  {
    slug: "jachui",
    number: "五",
    title: "자취",
    subtitle: "사진과 자료",
    description: "행사 사진, 문서, 서화 모음. 한 모임이 남긴 발자취.",
  },
  {
    slug: "hyang",
    number: "六",
    title: "향(鄕)",
    subtitle: "안동, 회의 뿌리",
    description: "영가회의 고향 안동을 기록합니다. 정신·문화·사람의 뿌리.",
  },
  {
    slug: "yeongsang",
    number: "七",
    title: "영상(影像)",
    subtitle: "사진 아카이브",
    description: "회의 사진은 갤러리 메뉴에서 확인하실 수 있습니다.",
    comingSoon: true,
  },
  {
    slug: "dongyeong",
    number: "八",
    title: "동영(動影)",
    subtitle: "영상 아카이브",
    description: "회의 영상은 '영상' 메뉴에서 보실 수 있습니다.",
    href: "/videos",
  },
];

export function getChapter(slug: string): Chapter | undefined {
  return chapters.find((c) => c.slug === slug);
}
