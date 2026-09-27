// 날짜를 숨기는 글 — 특정 시기의 기록이 아니라 상시로 읽히는 글.
// (예: 회장 인사말 — 아카이브 목록·본문에서 작성일을 표시하지 않는다)
const UNDATED = new Set(["yeongi/hoejang-insa"]);

export function isUndated(chapter: string, slug: string): boolean {
  return UNDATED.has(`${chapter}/${slug}`);
}
