/**
 * 행사(moim) 글 — 공개 화면에서만 역대 회장 페이지와 같은 카드·타임라인 틀을 입힌다.
 *
 * 저장된 본문(DB·파일)은 건드리지 않는다. 편집기에도 원래 본문이 그대로 열린다.
 * 하는 일은 감싸기뿐이다(글자는 한 자도 바꾸지 않음):
 *   - 첫 소제목(h2) 앞의 내용(편집실 안내·사진 묶음)은 맨 위에 그대로 둔다.
 *   - 소제목 하나와 그 아래 내용을 카드 하나로 묶어 타임라인에 세운다.
 *   - 맨 끝의 "출처…"·"인물…" 줄은 카드 밖, 타임라인 아래로 뺀다(순서는 그대로).
 * 이미 카드 틀(ygpr-/ygcl-)을 쓴 글은 손대지 않는다.
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
  for (;;) {
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
