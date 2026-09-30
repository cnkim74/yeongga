// 행사(모임) 장을 회장기별로 묶을 때 쓰는 구분.
//
// 판별 순서
//   1) 슬러그가 "5dae-" 또는 "hoebo-8-" 처럼 대수를 품고 있으면 그대로 따른다
//   2) 그렇지 않으면 날짜로 가른다
//
// 경계 날짜는 확인된 기록을 근거로 한다.
//   · 1대 김해길 1977.3.26 창립 ~ 1998.10.23 퇴임 (40년사 27쪽)
//   · 2대 류목기 1998.10.24 선임·취임 (40년사 28·55쪽)
//   · 3대 금창태 2003.1.15 취임 / 4대 허동진 2007.1.10 / 5대 류종묵 2011.1.7
//   · 6대 김봉구 2015~2016 / 7대 김계동 2017.5.26 취임
//   · 8대 문상부 2021 취임 (회보 8-1호) / 9대 박대섭 2025.2.7 정기총회에서 취임

export type Era = {
  dae: number;
  id: string;
  name: string;
  term: string;
  /** 이 날짜부터 이 회장기 (YYYY-MM-DD, 없으면 처음부터) */
  from?: string;
};

export const ERAS: Era[] = [
  { dae: 1, id: "1dae", name: "김해길", term: "1977~1998" },
  { dae: 2, id: "2dae", name: "류목기", term: "1998~2002", from: "1998-10-24" },
  { dae: 3, id: "3dae", name: "금창태", term: "2003~2006", from: "2003-01-01" },
  { dae: 4, id: "4dae", name: "허동진", term: "2007~2010", from: "2007-01-01" },
  { dae: 5, id: "5dae", name: "류종묵", term: "2011~2014", from: "2011-01-01" },
  { dae: 6, id: "6dae", name: "김봉구", term: "2015~2016", from: "2015-01-01" },
  { dae: 7, id: "7dae", name: "김계동", term: "2017~2021", from: "2017-05-26" },
  { dae: 8, id: "8dae", name: "문상부", term: "2021~2025", from: "2022-01-01" },
  { dae: 9, id: "9dae", name: "박대섭", term: "2025~현재", from: "2025-02-07" },
];

const BY_DAE = new Map(ERAS.map((e) => [e.dae, e]));
const SLUG_DAE = /^(\d)dae-|^hoebo-(\d)-/;

export function eraOf(slug: string, date: string): Era | undefined {
  const m = SLUG_DAE.exec(slug);
  if (m) {
    const dae = Number(m[1] ?? m[2]);
    const era = BY_DAE.get(dae);
    if (era) return era;
  }
  let found: Era | undefined = ERAS[0];
  for (const e of ERAS) {
    if (e.from && date >= e.from) found = e;
  }
  return found;
}

export type EraGroup<T> = { era: Era; items: { item: T; index: number }[] };

/** 최신 회장기부터 묶는다. 목록의 원래 순서(번호)는 그대로 유지한다. */
export function groupByEra<T extends { slug: string; date: string }>(
  articles: T[],
): EraGroup<T>[] {
  const buckets = new Map<number, EraGroup<T>>();
  articles.forEach((item, index) => {
    const era = eraOf(item.slug, item.date);
    if (!era) return;
    const g = buckets.get(era.dae) ?? { era, items: [] };
    g.items.push({ item, index });
    buckets.set(era.dae, g);
  });
  return [...buckets.values()].sort((a, b) => b.era.dae - a.era.dae);
}
