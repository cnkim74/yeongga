/**
 * 九 영가상 — 영가회가 드린 상의 기록. 영가문화상 · 영가선행상 · 공로상 세 갈래.
 *
 * 데이터베이스를 쓰지 않는다. 수상 기록은 자주 바뀌지 않고, 이 페이지는
 * DB 가 멈춰도 열려야 한다. 새 수상자가 나오면 이 파일에 한 줄을 더한다.
 *
 * 회차 번호는 40년사 안에서도 지면마다 다르다(〈영가문화상 제정〉 글 참고).
 * 그래서 회차 대신 시상한 날짜로 적는다.
 *
 * 2026-11-16 점검 — 《영가회 40년사》 전권과 《영가회보》 8-1~9-5호를 다시 읽어
 * 맞췄다. 2016년 수상은 개인이 아니라 단체(256·260쪽), 2025.2.7 시상은 9-1호
 * 1·7면으로 확인, 공로패·감사패는 40년사 133~316쪽과 2026 신년인사회 상패 사진.
 */

export type AwardLink = { label: string; href: string };

export type AwardRow = {
  /** 시상한 날 — 표에 그대로 보인다 */
  date: string;
  /** 선정 연도가 시상 연도와 다를 때 */
  selected?: string;
  /** 받은 사람·단체 */
  who: string;
  president?: string;
  /** 출처 지면 */
  source: string;
  /** 그 해 시상을 다룬 대표 글 */
  href: string;
  more?: AwardLink[];
  note?: string;
};

/** 영가문화상 — 2006년부터 */
export const CULTURE_ROWS: AwardRow[] = [
  {
    date: "2006.1.9",
    who: "안동문화지킴이 (대표 임재해)",
    president: "금창태",
    source: "40년사 124~125쪽",
    href: "/archive/moim/3dae-2006-munhwasang-1",
  },
  {
    date: "2008.1.9",
    who: "하회별신굿탈놀이보존회 (회장 임형규)",
    president: "허동진",
    source: "40년사 136~137쪽",
    href: "/archive/moim/4dae-2008-sinnyeon",
  },
  {
    date: "2010.1.13",
    who: "안동문화원 (원장 김준식)",
    president: "허동진",
    source: "40년사 165쪽",
    href: "/archive/moim/4dae-2010-sinnyeon",
    note: "40년사 534쪽 상패 사진에는 2010.1.8로 새겨져 있습니다.",
  },
  {
    date: "2012.1.9",
    who: "(사)한국예술문화단체총연합회 안동지회 (회장 류윤형)",
    president: "류종묵",
    source: "40년사 197~199쪽",
    href: "/archive/moim/5dae-2012-sinnyeon-munhwasang-4",
    note: "40년사 535쪽 상패 사진에는 2012.1.13으로 새겨져 있습니다.",
  },
  {
    date: "2014.1.10",
    who: "김희곤 안동대학교 사학과 교수",
    president: "류종묵",
    source: "40년사 223~224쪽",
    href: "/archive/moim/5dae-2014-sinnyeon-munhwasang-5",
    more: [{ label: "김희곤 교수", href: "/archive/geul/myungsa-kim-huigon" }],
  },
  {
    date: "2016.1.8",
    who: "안동 내방가사 보존회 (회장 이선자)",
    president: "김봉구",
    source: "40년사 256·260쪽",
    href: "/archive/moim/6dae-2016-sinnyeon-munhwasang-6",
  },
  {
    date: "2023.2.3",
    selected: "2022년 선정",
    who: "정광영 시인 (전 안동문화원 부원장)",
    president: "문상부",
    source: "회보 8-5호 3면 · 8-6호 1면",
    href: "/archive/jachui/hoebo-8-5-munhwasang-jeong-gwangyeong-chae-sunam",
    more: [
      { label: "시상한 정기총회", href: "/archive/moim/hoebo-8-6-jeonggi-chonghoe" },
      { label: "정광영 인터뷰", href: "/archive/geul/hoebo-8-6-jeong-gwangyeong-interview" },
    ],
  },
  {
    date: "2025.2.7",
    selected: "2024년 선정",
    who: "안동차전놀이보존회 (회장 권석환)",
    president: "문상부",
    source: "회보 8-13호 1·3면 · 9-1호 1·7면",
    href: "/archive/jachui/hoebo-8-13-2024-munhwasang-seonhaengsang",
    more: [{ label: "2025 정기총회", href: "/archive/moim/9dae-2025-jeonggi-chonghoe" }],
  },
];

/** 영가선행상 — 2022년에 처음 두었다 */
export const GOOD_ROWS: AwardRow[] = [
  {
    date: "2023.2.3",
    selected: "2022년 선정",
    who: "채수남 (행복한 사랑방 밥차봉사단)",
    president: "문상부",
    source: "회보 8-5호 3면 · 8-6호 1면",
    href: "/archive/jachui/hoebo-8-5-munhwasang-jeong-gwangyeong-chae-sunam",
    more: [{ label: "채수남 인터뷰", href: "/archive/geul/hoebo-8-6-chae-sunam-interview" }],
  },
  {
    date: "2025.2.7",
    selected: "2024년 선정",
    who: "김인근 안동대 교수 (도서출판 성심 대표)",
    president: "문상부",
    source: "회보 8-13호 1면 · 9-1호 7면",
    href: "/archive/jachui/hoebo-8-13-2024-munhwasang-seonhaengsang",
    more: [{ label: "2025 정기총회", href: "/archive/moim/9dae-2025-jeonggi-chonghoe" }],
  },
];

export type MeritRow = {
  date: string;
  occasion: string;
  /** 공로패 · 감사패 · 축하패 */
  kind: string;
  who: string[];
  source: string;
  href: string;
  more?: AwardLink[];
  note?: string;
};

/** 공로상 — 회에 공을 세운 분께 드린 공로패·감사패, 회원의 영예를 기린 축하패 */
export const MERIT_ROWS: MeritRow[] = [
  {
    date: "2007.1.10",
    occasion: "신년하례회",
    kind: "축하패",
    who: ["이용태", "이종훈", "권익부"],
    source: "40년사 133쪽",
    href: "/archive/moim/4dae-2007-engineer-3myeong-chukha",
    note: "‘한국을 일으킨 엔지니어 60인’에 뽑힌 것을 축하",
  },
  {
    date: "2007.9.7",
    occasion: "창립 30주년 기념행사",
    kind: "공로패",
    who: [
      "김해길", "장원석", "권원기", "권태원", "권화섭", "김명년",
      "류동주", "석기홍", "손병도", "이용태", "조주목",
    ],
    source: "40년사 134쪽",
    href: "/archive/moim/4dae-2007-changrip-30junyeon",
    more: [{ label: "공로패를 받은 열한 분", href: "/archive/geul/wonro-chamsuk-gieok" }],
    note: "창립 발기회원 열한 분. 같은 자리에서 역대 회장 세 분(김해길·류목기·금창태)께는 기념 은수저를 드렸습니다.",
  },
  {
    date: "2008.1.9",
    occasion: "신년하례회·정기총회",
    kind: "공로패",
    who: ["강보영 안동병원 이사장"],
    source: "40년사 136~137쪽",
    href: "/archive/moim/4dae-2008-sinnyeon",
    more: [{ label: "강보영 이사장", href: "/archive/geul/myungsa-kang-boyeong" }],
    note: "본문에는 ‘특별 공로상’으로 적혀 있습니다.",
  },
  {
    date: "2010.1.13",
    occasion: "신년하례회·정기총회",
    kind: "공로패",
    who: ["손준석 대현실업 사장"],
    source: "40년사 165쪽",
    href: "/archive/moim/4dae-2010-sinnyeon",
  },
  {
    date: "2011.4.19",
    occasion: "임시총회",
    kind: "감사패",
    who: ["허동진 명예회장 (제4대 회장)"],
    source: "40년사 184쪽",
    href: "/archive/moim/5dae-2011-tukgang-hong-yeongjae",
    note: "행운의 열쇠를 함께 드렸습니다.",
  },
  {
    date: "2018.8.30",
    occasion: "임시총회",
    kind: "감사패",
    who: ["김봉구 전 회장 (제6대 회장)"],
    source: "40년사 316쪽",
    href: "/archive/moim/7dae-2018-tukgang-kim-donggi",
  },
  {
    date: "2026.1.7",
    occasion: "신년인사회·제49차 정기총회",
    kind: "공로패",
    who: ["류준걸 편집위원장", "김돈한 BC&C 대표", "문상부 제8대 회장"],
    source: "2026 신년인사회 상패 사진",
    href: "/archive/moim/9dae-2026-sinnyeon-chonghoe-49",
    note: "회순에는 ‘유공자 표창’으로 적혀 있습니다.",
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

export const RELATED: AwardLink[] = [
  { label: "영가문화상 제정 — 2005.11.15 취지문", href: "/archive/yeongi/yeongga-munhwasang-sijak" },
  { label: "영가문화상 운영 규정", href: "/archive/jachui/jachui-munhwasang-gyujong" },
  { label: "영가문화상 6회의 자취", href: "/archive/jachui/jachui-munhwasang-jachui" },
  { label: "영가문화상 시상식 사진 모음", href: "/archive/jachui/sajin-munhwasang-mum" },
];
