/**
 * 九 영가문화상 — 영가회가 드린 상의 기록.
 *
 * 데이터베이스를 쓰지 않는다. 수상 기록은 자주 바뀌지 않고, 이 페이지는
 * DB 가 멈춰도 열려야 한다. 새 수상자가 나오면 이 파일에 한 줄을 더한다.
 *
 * 회차 번호는 40년사 안에서도 지면마다 다르다(〈영가문화상 제정〉 글 참고).
 * 그래서 회차 대신 시상한 날짜로 적는다.
 */

export type AwardLink = { label: string; href: string };

export type AwardRow = {
  /** 시상한 날 — 표에 그대로 보인다 */
  date: string;
  /** 선정 연도가 시상 연도와 다를 때 */
  selected?: string;
  culture: string;
  good?: string;
  president?: string;
  /** 그 해 시상을 다룬 대표 글 */
  href: string;
  more?: AwardLink[];
  note?: string;
};

export const AWARD_ROWS: AwardRow[] = [
  {
    date: "2006.1.9",
    culture: "안동문화지킴이 (대표 임재해)",
    president: "금창태",
    href: "/archive/moim/3dae-2006-munhwasang-1",
  },
  {
    date: "2008.1.9",
    culture: "하회별신굿탈놀이보존회",
    president: "허동진",
    href: "/archive/moim/4dae-2008-sinnyeon",
  },
  {
    date: "2010.1.13",
    culture: "안동문화원 (원장 김준식)",
    president: "허동진",
    href: "/archive/moim/4dae-2010-sinnyeon",
  },
  {
    date: "2012.1.9",
    culture: "(사)한국예술문화단체총연합회 안동지회 (대표 류윤형)",
    president: "류종묵",
    href: "/archive/moim/5dae-2012-sinnyeon-munhwasang-4",
  },
  {
    date: "2014.1.10",
    culture: "김희곤 안동대학교 사학과 교수",
    president: "류종묵",
    href: "/archive/moim/5dae-2014-sinnyeon-munhwasang-5",
    more: [{ label: "김희곤 교수", href: "/archive/geul/myungsa-kim-huigon" }],
  },
  {
    date: "2016.1.8",
    culture: "이선자 내방가사전승보존회장",
    president: "김봉구",
    href: "/archive/moim/6dae-2016-sinnyeon-munhwasang-6",
  },
  {
    date: "2023.2.3",
    selected: "2022년 선정",
    culture: "정광영 시인 (전 안동문화원 부원장)",
    good: "채수남 (행복한 사랑방 밥차봉사단)",
    president: "문상부",
    href: "/archive/jachui/hoebo-8-5-munhwasang-jeong-gwangyeong-chae-sunam",
    more: [
      { label: "시상한 정기총회", href: "/archive/moim/hoebo-8-6-jeonggi-chonghoe" },
      { label: "정광영 인터뷰", href: "/archive/geul/hoebo-8-6-jeong-gwangyeong-interview" },
      { label: "채수남 인터뷰", href: "/archive/geul/hoebo-8-6-chae-sunam-interview" },
    ],
  },
  {
    date: "2025.2.7",
    selected: "2024년 선정",
    culture: "안동차전놀이보존회",
    good: "김인근 대표",
    href: "/archive/jachui/hoebo-8-13-2024-munhwasang-seonhaengsang",
    more: [{ label: "2025 정기총회", href: "/archive/moim/9dae-2025-jeonggi-chonghoe" }],
    note: "회보 8-13호가 2024년 수상자를 알렸고, 2025.2.7 정기총회 회순에 영가문화상·선행상 시상이 들어 있습니다.",
  },
];

/** 상이 어떻게 만들어지고 바뀌어 왔는지 */
export const AWARD_HISTORY: { when: string; what: string; href?: string }[] = [
  {
    when: "2005.11.15",
    what: "3대 금창태 회장기, 영가문화상 제정 취지문",
    href: "/archive/yeongi/yeongga-munhwasang-sijak",
  },
  {
    when: "2006 ~ 2016",
    what: "두 해마다 신년하례회에서 시상 — 여섯 차례",
    href: "/archive/jachui/jachui-munhwasang-jachui",
  },
  {
    when: "2022.1.12",
    what: "이사회, 격년제를 그만두고 알맞은 때에 선정해 총회에서 시상하기로",
    href: "/archive/jachui/hoebo-8-1-munhwasang-jisok",
  },
  {
    when: "2022 가을",
    what: "영가문화상은 안동문화원, 봉사 부문은 안동시에서 추천받기로",
    href: "/archive/jachui/hoebo-8-4-munhwasang-chuchun-rogo-jeongyeong",
  },
  {
    when: "2022.11.11",
    what: "이사회, 영가선행상을 처음 두고 첫 수상자를 정함",
    href: "/archive/jachui/hoebo-8-5-munhwasang-jeong-gwangyeong-chae-sunam",
  },
];

export const FOUNDER_PLAQUE = {
  date: "2007.9.7",
  occasion: "창립 30주년 기념행사",
  names: [
    "김해길", "장원석", "권원기", "권태원", "권화섭", "김명년",
    "류동주", "석기홍", "손병도", "이용태", "조주목",
  ],
  links: [
    { label: "공로패를 받은 열한 분", href: "/archive/geul/wonro-chamsuk-gieok" },
    { label: "창립 30주년 기념행사", href: "/archive/moim/4dae-2007-changrip-30junyeon" },
  ] as AwardLink[],
};

export const RELATED: AwardLink[] = [
  { label: "영가문화상 제정 — 2005.11.15 취지문", href: "/archive/yeongi/yeongga-munhwasang-sijak" },
  { label: "영가문화상 운영 규정", href: "/archive/jachui/jachui-munhwasang-gyujong" },
  { label: "영가문화상 6회의 자취", href: "/archive/jachui/jachui-munhwasang-jachui" },
  { label: "영가문화상 시상식 사진 모음", href: "/archive/jachui/sajin-munhwasang-mum" },
];
