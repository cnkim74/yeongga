// 이북 서재는 두 갈래로 나뉜다 — 《40년사 책자》와 《영가회보》.
// 현재 ebooks 테이블에는 분류 컬럼이 없어 제목 규칙으로 가른다.
// (회보는 "영가회보 - 2025년 봄호 <9-1호>" 처럼 일관된 제목을 쓴다.)
// 나중에 분류 컬럼이 생기면 이 함수만 바꾸면 된다.

export type EbookGroup = "book" | "hoebo";

export function ebookGroup(title: string): EbookGroup {
  return title.trim().startsWith("영가회보") ? "hoebo" : "book";
}

export function isHoebo(title: string): boolean {
  return ebookGroup(title) === "hoebo";
}
