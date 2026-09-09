// 역대 영가회 회장 명단 — "회장별 검색" 대표 메뉴에 사용.
// 각 회장의 시기 기록을 모으는 방식:
//  - slugPrefix: slug 가 이 접두사로 시작하는 글(예: "5dae-") = 그 회장 시기의 정리된 기록
//  - keyword: 정리된 슬러그가 아직 없는 회장은 이름으로 검색해 관련 글을 모음
// current: 현직 회장 표시.
//
// 1~7대는 《영가회 40년사》의 편별 표제로 확인 —
//   초대 김해길 p27 / 2대 류목기 p55 / 3대 금창태 p103 / 4대 허동진 p131 /
//   5대 류종묵 p180 / 6대 김봉구 p239·249 / 7대 김계동 p285.
// 8·9대는 40년사 이후라 《영가회보》 근거 —
//   8-8호 역대회장 간담(7대 2017~2020, 8대 윤상부 2021~), 9-1호 박대섭 9대 취임.

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
  { id: "7dae", dae: 7, name: "김계동", hanja: "金啓東", term: "2017~2020", slugPrefix: "7dae-" },
  { id: "8dae", dae: 8, name: "윤상부", term: "2021~2024", keyword: "윤상부" },
  { id: "9dae", dae: 9, name: "박대섭", term: "2025~현재", keyword: "박대섭", current: true },
];

export function getPresident(id: string): President | undefined {
  return presidents.find((p) => p.id === id);
}
