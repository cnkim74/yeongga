/**
 * 행사(moim)·기고(geul) 글 — 공개 화면에서만 역대 회장 페이지와 같은 카드·타임라인 틀을 입힌다.
 *
 * 저장된 본문(DB·파일)은 건드리지 않는다. 편집기에도 원래 본문이 그대로 열린다.
 * 하는 일은 감싸기뿐이다(글자는 한 자도 바꾸지 않음):
 *   - 첫 소제목(h2) 앞의 내용(편집실 안내·사진 묶음)은 맨 위에 그대로 둔다.
 *   - 소제목 하나와 그 아래 내용을 카드 하나로 묶어 타임라인에 세운다.
 *   - 맨 끝의 "출처…"·"인물…" 줄은 카드 밖, 타임라인 아래로 뺀다(순서는 그대로).
 * 이미 카드 틀(ygpr-/ygcl-)을 쓴 글은 손대지 않는다.
 *
 * 기고 글은 더해서:
 *   - 맨 앞 "편집실 안내" 상자 다음, 첫 소제목 앞의 본문도 카드 한 장으로 묶는다(소제목 없는 글이 많다).
 *   - 사진은 본문 폭을 꽉 채우고, 사진 밑 기울임 설명(없으면 사진의 대체 글)을 캡션으로 단다.
 */

const BLOCK_TAGS = new Set(["div", "section", "blockquote", "figure", "table", "ul", "ol", "details"]);

/** 맨 바깥 층의 <h2> 시작 위치들 */
function topLevelH2Positions(html: string): number[] {
  const out: number[] = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
  let depth = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    const selfClosing = m[3] === "/";
    if (tag === "h2" && !closing && depth === 0) out.push(m.index);
    if (!BLOCK_TAGS.has(tag) || selfClosing) continue;
    depth += closing ? -1 : 1;
    if (depth < 0) depth = 0;
  }
  return out;
}

/** 덩어리 끝에 붙은 "출처…"/"인물…" 문단을 떼어 낸다 */
function splitTrailingNotes(chunk: string): [string, string] {
  let body = chunk.trimEnd();
  const notes: string[] = [];
  const isNote = /^<p>\s*(?:<[^>]+>\s*)*(?:출처|인물)\s*[:：][\s\S]*<\/p>$/;
  const quotedNote = /<blockquote>\s*<p>\s*(?:<[^>]+>\s*)*(?:출처|인물)\s*[:：][^]*?<\/p>\s*<\/blockquote>$/;
  for (;;) {
    const q = body.match(quotedNote);
    if (q && q.index !== undefined && q[0].indexOf("<blockquote>", 1) < 0) {
      notes.unshift(q[0]);
      body = body.slice(0, q.index).trimEnd();
      continue;
    }
    if (!body.endsWith("</p>")) break;
    const start = body.lastIndexOf("<p>");
    if (start < 0) break;
    const last = body.slice(start);
    if (!isNote.test(last) || last.indexOf("</p>") !== last.length - 4) break;
    notes.unshift(last);
    body = body.slice(0, start).trimEnd();
  }
  return [body, notes.join("\n")];
}

/** 이 장(章)의 글이 공개 화면에서 몇 장의 카드로 보이는지. 편집기 복원 패널에서도 쓴다. */
export function countEventCards(html: string, chapter = "moim"): number {
  return (layoutArticleForChapter(chapter, html).match(/class="ygev-item/g) ?? []).length;
}

/** 카드 틀을 입히는 장 */
export const CARD_CHAPTERS = new Set(["moim", "geul"]);

export function layoutArticleForChapter(chapter: string, html: string): string {
  if (chapter === "moim") return layoutEventArticle(html);
  if (chapter === "geul") return layoutGeulArticle(html);
  return html;
}

function h2Text(chunk: string): string {
  const m = chunk.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
}

export function layoutEventArticle(html: string): string {
  if (!html || /class="(?:ygpr|ygcl)-/.test(html)) return html;
  const pos = topLevelH2Positions(html);
  if (pos.length === 0) return html;

  const lead = html.slice(0, pos[0]).trim();
  const chunks = pos.map((p, i) => html.slice(p, pos[i + 1] ?? html.length).trim());
  const [lastBody, notes] = splitTrailingNotes(chunks[chunks.length - 1]);
  chunks[chunks.length - 1] = lastBody;

  const items = chunks
    .map((c) => {
      // 개요(…개요) 카드는 강조
      const hl = /개요$/.test(h2Text(c)) ? " ygev-hl" : "";
      return `<section class="ygev-item${hl}"><div class="ygev-card">${c}</div></section>`;
    })
    .join("\n");

  return [
    lead && `<div class="ygev-lead">${lead}</div>`,
    `<div class="ygev-timeline">${items}</div>`,
    notes && `<div class="ygev-foot">${notes}</div>`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * 사진 문단(<p><img…>[<em>설명</em>]</p>)을 본문 폭 사진 + 캡션으로.
 * 캡션 글은 원래 있던 기울임 설명을 그대로 쓰고, 없으면 그 사진의 대체 글(alt)을 쓴다.
 */
function figureImages(html: string): string {
  return html.replace(
    /<p>\s*((?:<img\b[^>]*>\s*)+)(?:<em>([\s\S]*?)<\/em>)?\s*<\/p>/g,
    (_m, imgs: string, em?: string) => {
      const list = imgs.match(/<img\b[^>]*>/g) ?? [];
      const altOf = (img: string) => (img.match(/\balt="([^"]*)"/)?.[1] ?? "").trim();
      const fig = (inner: string, cap: string) =>
        `<figure class="ygge-fig">${inner}${cap ? `<figcaption>${cap}</figcaption>` : ""}</figure>`;
      if (em !== undefined) return fig(list.join(""), em);
      return list.map((img) => fig(img, altOf(img))).join("\n");
    }
  );
}

const NOTE_LEAD = /^\s*<blockquote>\s*<p>\s*<em>\s*편집실 안내[\s\S]*?<\/blockquote>/;

export function layoutGeulArticle(html: string): string {
  if (!html || /class="(?:ygpr|ygcl)-/.test(html)) return html;
  let rest = figureImages(html);

  // 맨 앞 편집실 안내 상자(들)는 카드 위에 그대로
  const leadNotes: string[] = [];
  for (let m = rest.match(NOTE_LEAD); m; m = rest.match(NOTE_LEAD)) {
    leadNotes.push(m[0].trim());
    rest = rest.slice(m[0].length);
  }
  rest = rest.trim();

  const pos = topLevelH2Positions(rest);
  const chunks: string[] = [];
  const first = (pos.length ? rest.slice(0, pos[0]) : rest).trim();
  if (first) chunks.push(first);
  pos.forEach((p, i) => chunks.push(rest.slice(p, pos[i + 1] ?? rest.length).trim()));
  if (chunks.length === 0) return html;

  const [lastBody, notes] = splitTrailingNotes(chunks[chunks.length - 1]);
  chunks[chunks.length - 1] = lastBody;
  const items = chunks
    .filter((c) => c.length > 0)
    .map((c) => `<section class="ygev-item"><div class="ygev-card">${c}</div></section>`)
    .join("\n");

  return [
    leadNotes.length > 0 && `<div class="ygev-lead">${leadNotes.join("\n")}</div>`,
    items && `<div class="ygev-timeline">${items}</div>`,
    notes && `<div class="ygev-foot">${notes}</div>`,
  ]
    .filter(Boolean)
    .join("\n");
}
