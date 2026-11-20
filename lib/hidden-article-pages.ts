/**
 * 연혁 목록에서는 비공개이지만, 메인·소개에는 그대로 두는 글 → 그 글을 보여 주는 전용 페이지.
 *
 * 비공개 글은 글 주소(/archive/<장>/<글>)가 404 가 된다. 이 표에 있는 글은
 *  - 메인 카드가 전용 페이지로 연결하고,
 *  - 글 주소로 들어와도(슬라이드·검색·공유로 남은 옛 링크) 전용 페이지로 넘긴다.
 */
export const HIDDEN_ARTICLE_PAGES: Record<string, string> = {
  "yeongi/hoejang-insa": "/about/greeting",
};
