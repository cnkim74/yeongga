// 대표 이미지(cover)가 비어 있는 글에 쓸 '본문 첫 사진' 찾기.
// 본문은 HTML(<img src>) 이거나 예전 마크다운(![](url)) 이라 둘 다 본다.
// 사이트 안 사진(/…) 이나 http(s) 주소만 받는다 — data: URI·빈 값은 뺀다.

const HTML_IMG = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/i;
const MD_IMG = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/;

function usable(src: string | undefined): src is string {
  if (!src) return false;
  const s = src.trim();
  return s.startsWith("/") || /^https?:\/\//i.test(s);
}

/** 본문에 처음 나오는 사진 주소. 없으면 null. */
export function firstBodyImage(body: string | null | undefined): string | null {
  if (!body) return null;
  const h = HTML_IMG.exec(body);
  const m = MD_IMG.exec(body);
  const cands = [h, m]
    .filter((x): x is RegExpExecArray => Boolean(x) && usable(x![1]))
    .sort((a, b) => a.index - b.index);
  return cands.length ? cands[0][1].trim() : null;
}

/** 본문에 든 사진 주소 전부(중복 없이, 나온 순서대로). 편집기에서 대표 이미지 고를 때 쓴다. */
export function allBodyImages(body: string | null | undefined): string[] {
  if (!body) return [];
  const out: string[] = [];
  const re = new RegExp(`${HTML_IMG.source}|${MD_IMG.source}`, "gi");
  for (const m of body.matchAll(re)) {
    const src = (m[1] ?? m[2])?.trim();
    if (usable(src) && !out.includes(src)) out.push(src);
  }
  return out;
}
