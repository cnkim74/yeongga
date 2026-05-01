export type Chapter = {
  slug: string;
  number: string; // 한자 또는 표기용 — "一", "二" 등
  title: string;
  subtitle: string;
  description: string;
};

export const chapters: Chapter[] = [
  {
    slug: "yeon-gi",
    number: "一",
    title: "연기(緣起)",
    subtitle: "영가회의 시작",
    description: "회(會)의 발자취와 첫 모임의 기록.",
  },
  {
    slug: "moim",
    number: "二",
    title: "모임",
    subtitle: "회보·정기 모임의 기록",
    description: "정기 모임에서 나눈 이야기와 회의록.",
  },
  {
    slug: "geul",
    number: "三",
    title: "글",
    subtitle: "회원이 남긴 글",
    description: "회원들이 남긴 수필, 기고문, 회상록.",
  },
  {
    slug: "saram",
    number: "四",
    title: "사람",
    subtitle: "회원 소개와 인터뷰",
    description: "한 분 한 분의 이야기를 기록합니다.",
  },
  {
    slug: "jachwi",
    number: "五",
    title: "자취",
    subtitle: "사진과 자료",
    description: "행사 사진, 자료, 문서 모음. 한 사람·한 모임이 남긴 발자취.",
  },
];

export function getChapter(slug: string): Chapter | undefined {
  return chapters.find((c) => c.slug === slug);
}
