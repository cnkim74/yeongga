// 상생지원위원회 — 2026년 10월 1일 편성표를 바탕으로 정리.
// 위원 개인 명단(성명·직장·직위)은 회원 명부에 해당해 저장소에 두지 않는다.
// 명단은 관리자 화면에서 회원 전용 글로 등록하고, 이 페이지에서 연결한다.

export const SANGSAENG_BASE_DATE = "2026년 10월 1일";

/** 위원 명단을 담은 회원 전용 글 (관리자 화면에서 등록) */
export const SANGSAENG_ROSTER = {
  chapter: "jachui",
  slug: "sangsaeng-wiwon-pyeonseongpyo",
} as const;

export const SANGSAENG_PURPOSE = "회원 및 회원 기업의 애로사항 지원";

export const SANGSAENG_ORGANIZE = [
  "다수 민원 분야, 행정부처 경력, 직업별로 나누어 편성",
  "원로회원은 현직 위주로 하고 명예회원 일부를 포함",
];

export const SANGSAENG_OFFICERS = [
  {
    role: "위원장",
    name: "김강욱",
    title: "수석부회장",
    note: "변호사 · 법무법인 율우 대표 · 전 대전고검장",
  },
  { role: "간사", name: "금장수", title: "사무총장", note: "전 국정원 처장" },
  { role: "행정", name: "강원옥", title: "사무국장", note: "" },
];

export const SANGSAENG_METHOD = [
  "회장단에 요청하면 T/F 구성을 지원한다",
  "편성표를 보고 위원과 직접 소통한다",
  "회원수첩에 등재하고 영가회보에 게재해 상시 활용한다",
  "같은 업종·비슷한 업종 사이의 협력 계기로 삼는다",
];

export type SangsaengField = { label: string; count: number };
export type SangsaengGroup = { title: string; fields: SangsaengField[] };

/** 분야 편성 — 분야 이름과 위원 수만 둔다 (명단은 회원 전용 글) */
export const SANGSAENG_GROUPS: SangsaengGroup[] = [
  {
    title: "다수 민원 분야",
    fields: [
      { label: "법률", count: 11 },
      { label: "세무·회계", count: 9 },
      { label: "금감원", count: 2 },
      { label: "관세·특허", count: 3 },
      { label: "노동", count: 3 },
      { label: "감정평가", count: 3 },
      { label: "행정사", count: 2 },
      { label: "언론", count: 8 },
      { label: "선거", count: 3 },
      { label: "군", count: 11 },
      { label: "경찰·소방", count: 3 },
      { label: "국회의원", count: 4 },
    ],
  },
  {
    title: "행정부처 경력",
    fields: [
      { label: "경제부처·국토·세관", count: 6 },
      { label: "산자·과학", count: 3 },
      { label: "법무·행안부", count: 3 },
      { label: "고용노동", count: 5 },
      { label: "농수산·환경", count: 2 },
      { label: "보훈·특허", count: 2 },
      { label: "대통령실·국무총리실", count: 4 },
      { label: "감사·국정원", count: 3 },
      { label: "교육", count: 4 },
      { label: "문화·공정위", count: 2 },
      { label: "한전", count: 4 },
      { label: "농협", count: 6 },
      { label: "공공기관", count: 5 },
      { label: "서울·지자체", count: 8 },
    ],
  },
  {
    title: "직업별",
    fields: [
      { label: "금융·투자", count: 15 },
      { label: "종합·방산", count: 3 },
      { label: "IT·로봇·가전", count: 11 },
      { label: "건설·건축", count: 19 },
      { label: "전기·소방·가스", count: 4 },
      { label: "환경·재활용", count: 6 },
      { label: "자동차·철강", count: 8 },
      { label: "화학·플라스틱", count: 4 },
      { label: "구리·귀금속", count: 2 },
      { label: "피복", count: 3 },
      { label: "의료·약품", count: 7 },
      { label: "포장·인쇄·광고", count: 5 },
      { label: "교육·문화", count: 7 },
      { label: "스포츠", count: 6 },
      { label: "HR·취업", count: 2 },
      { label: "해운물류·통관·여행", count: 7 },
      { label: "농축산·화훼", count: 11 },
      { label: "대학교수", count: 17 },
    ],
  },
];

/** 편성표에 오른 항목 수 (한 사람이 여러 분야에 오른 경우가 있어 인원과 다르다) */
export const SANGSAENG_TOTAL = 256;
