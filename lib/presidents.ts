// 역대 영가회 회장 명단 — "회장별 검색" 대표 메뉴에 사용.
// 각 회장의 시기 기록을 모으는 방식:
//  - slugPrefix: slug 가 이 접두사로 시작하는 글(예: "5dae-") = 그 회장 시기의 정리된 기록
//  - keyword: 정리된 슬러그가 아직 없는 회장은 이름으로 검색해 관련 글을 모음
// current: 현직 회장 표시.
//
// ⚠️ 8대 회장은 성함/재임기간 미확인으로 아직 제외. 확정되면 아래에 추가하세요.

export type President = {
  id: string; // URL 파라미터용 식별자 (?president=<id>)
  dae: number;
  name: string;
  hanja?: string;
  term: string;
  slugPrefix?: string;
  keyword?: string;
  current?: boolean;
};

export const presidents: President[] = [
  { id: "1dae", dae: 1, name: "김해길", hanja: "金海吉", term: "1977~1998", slugPrefix: "1dae-" },
  { id: "2dae", dae: 2, name: "류목기", hanja: "柳穆基", term: "1999~2002", slugPrefix: "2dae-" },
  { id: "3dae", dae: 3, name: "금창태", hanja: "琴昌泰", term: "2003~2006", slugPrefix: "3dae-" },
  { id: "4dae", dae: 4, name: "허동진", hanja: "許東珍", term: "2007~2010", slugPrefix: "4dae-" },
  { id: "5dae", dae: 5, name: "류종묵", hanja: "柳鍾默", term: "2011~2014", slugPrefix: "5dae-" },
  { id: "6dae", dae: 6, name: "김봉구", hanja: "金鳳求", term: "2015~2016", slugPrefix: "6dae-" },
  { id: "7dae", dae: 7, name: "김계동", hanja: "金啓東", term: "2017~2023", slugPrefix: "7dae-" },
  { id: "9dae", dae: 9, name: "박대섭", term: "2024~현재", keyword: "박대섭", current: true },
];

export function getPresident(id: string): President | undefined {
  return presidents.find((p) => p.id === id);
}
