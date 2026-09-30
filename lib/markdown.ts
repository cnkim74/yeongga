import "server-only";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";

export async function renderMarkdown(md: string): Promise<string> {
  const processed = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeStringify)
    .process(md);
  return String(processed);
}

export function looksLikeHTML(str: string): boolean {
  return /^\s*</.test(str);
}

/**
 * 관리자 편집기(TipTap)는 본문을 HTML 로 저장한다. 마크다운 원문을 붙여넣으면
 * 줄마다 <p> 로만 감싸 저장되어, 표 문법("| 분야 |")과 제목 문법("## ")이
 * 화면에 글자 그대로 나온다. 그런 본문을 알아보고 마크다운으로 다시 그린다.
 */
const MD_MARK = /(^|\n)\s{0,3}#{1,6}\s|\|\s*:?-{2,}/;
const BLOCK_TAG = /<(table|ul|ol|h[1-6]|figure|img|iframe|blockquote|div|hr)\b/i;

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

export function looksLikeWrappedMarkdown(html: string): boolean {
  if (!looksLikeHTML(html)) return false;
  if (BLOCK_TAG.test(html)) return false;
  return MD_MARK.test(decodeEntities(html.replace(/<[^>]+>/g, "\n")));
}

/** <p> 로만 감싸인 마크다운을 원문으로 되돌린다 */
export function unwrapMarkdown(html: string): string {
  const text = html
    .replace(/<\/p>\s*/gi, "\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(strong|b)>/gi, "**")
    .replace(/<\/?(em|i)>/gi, "*")
    .replace(/<[^>]+>/g, "");
  // 표 칸 안에서 줄을 나누던 <br> 은 가운뎃점으로 이어 붙인다
  return decodeEntities(text)
    .split("\n")
    .map((line) =>
      line.trim().startsWith("|")
        ? line.replace(/\s*<br\s*\/?>\s*/gi, " · ")
        : line,
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
