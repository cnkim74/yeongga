// 기고 장 목록 순서 (2026-11-26 요청) — 《영가회보》 최근 호부터 지난 호 순으로, 맨 뒤에 《영가회 40년사》.
// 호는 slug(hoebo-<권>-<호>-…)로 가르고, 같은 호 안에서는 지면 면 순서(부제의 'N면'), 면을 모르면 원래 순서.
// 같은 면의 두 꼭지(나눠 올린 글)는 먼저 올린 글(id 작은 쪽 = 지면 앞 꼭지)이 앞.
// 회보 slug 가 아닌 회원 기고는 모두 40년사(회원 기고 편)에서 옮긴 글이다.

type Item = { slug: string; subtitle: string | null; id?: number };

function issueRank(slug: string): number {
  const m = slug.match(/^hoebo-(\d+)-(\d+)-/);
  return m ? Number(m[1]) * 100 + Number(m[2]) : 0; // 0 = 40년사
}

function pageOf(subtitle: string | null): number {
  if (!subtitle) return Number.POSITIVE_INFINITY;
  const m = subtitle.match(/(\d+)\s*면/) ?? subtitle.match(/40년사》\s*(\d+)/);
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
}

export function sortGeulByIssue<T extends Item>(list: T[]): T[] {
  return list
    .map((item, i) => ({ item, i, r: issueRank(item.slug), p: pageOf(item.subtitle) }))
    .sort(
      (a, b) =>
        b.r - a.r ||
        a.p - b.p ||
        (Number.isFinite(a.p) && a.item.id != null && b.item.id != null ? a.item.id - b.item.id : 0) ||
        a.i - b.i
    )
    .map((x) => x.item);
}
