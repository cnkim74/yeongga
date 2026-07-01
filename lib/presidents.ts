// 역대 영가회 회장 명단 — "회장별 검색" 대표 메뉴에 사용.
// 각 회장의 slugPrefix 로 그 시기의 정리된 기록(취임·정기행사 모음·회장 소개 등,
// slug 가 "Ndae-" 로 시작하는 글)을 묶어 보여준다.
//
// ⚠️ 8대·9대(박대섭 현 회장 등)는 아직 "Ndae-" 로 정리된 기록이 없어 제외돼 있습니다.
//    이름·재임기간을 확정하고 해당 시기 글을 정리(슬러그/태그)하면 아래에 추가하세요.

export type President = {
  dae: number;
  name: string;
  hanja?: string;
  term: string;
  slugPrefix: string; // 이 접두사로 시작하는 slug 글을 그 회장 시기 기록으로 모음
};

export const presidents: President[] = [
  { dae: 1, name: "김해길", hanja: "金海吉", term: "1977~1998", slugPrefix: "1dae-" },
  { dae: 2, name: "류목기", hanja: "柳穆基", term: "1999~2002", slugPrefix: "2dae-" },
  { dae: 3, name: "금창태", hanja: "琴昌泰", term: "2003~2006", slugPrefix: "3dae-" },
  { dae: 4, name: "허동진", hanja: "許東珍", term: "2007~2010", slugPrefix: "4dae-" },
  { dae: 5, name: "류종묵", hanja: "柳鍾默", term: "2011~2014", slugPrefix: "5dae-" },
  { dae: 6, name: "김봉구", hanja: "金鳳求", term: "2015~2016", slugPrefix: "6dae-" },
  { dae: 7, name: "김계동", hanja: "金啓東", term: "2017~", slugPrefix: "7dae-" },
];

export function getPresident(slugPrefix: string): President | undefined {
  return presidents.find((p) => p.slugPrefix === slugPrefix);
}
