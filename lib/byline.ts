/**
 * 기고 장의 글 머리 — 「기고글 제목 / 회원 이름 · 직함 / 소제목 / 출처」.
 * 갈래(영가마당·안동문화·영가칼럼 …)는 가려내기만 하고 화면에는 내지 않는다(2026-11-27 요청).
 *
 * 글마다 subtitle 이 제각각이다.
 *   "회원 기고 — 김휘동 (전 안동군수·안동시장)"
 *   "영가칼럼 · 김휘동 대구대학교 행정대학 초빙교수, 전 안동시장"
 *   "〈영가칼럼〉 조봉환 영가경제연구원 원장 · 《영가회보》 8-10호 9면"
 *   "김원곤 (이사) · 영가회보 8-11호 (2024년 여름호)"
 *   "두 분의 어머니를 회상하며"
 * 파일은 그대로 두고, 보여 줄 때만 이름·직함·소제목·갈래·출처로 나눈다.
 */

export type Byline = {
  /** 회원 이름 — 편집실 글이면 없음 */
  name?: string;
  /** 이름 옆 직함 */
  role?: string;
  /** 소제목 */
  sub?: string;
  /** 갈래 (회원 기고, 영가칼럼 …) */
  label?: string;
  /** 출처 (《영가회보》 8-1호 10면, 《영가회 40년사》 …) */
  source?: string;
};

/** 호수·면·쪽이 붙은 조각만 출처로 본다 — "《영가회보》를 되살리고…" 같은 소제목은 남긴다 */
const SOURCE = /\d+(?:-\d+)?\s*호|\d+\s*면(?![가-힣])|\d+\s*쪽|(?:봄|여름|가을|겨울|신년)호|^《?영가회\s*40년사》?$/;
const LABEL =
  /^(회원\s*기고|영가\s*칼럼|기획\s*칼럼|회장\s*칼럼|특별\s*기고|추모의\s*글|영가\s*마당|안동\s*문화|안동\s*알기|안동문화|칼럼|기고|시|수필|인터뷰|대담|회원\s*신간\s*안내|신간\s*안내|영가\s*사람들|축사|격려사|발간사|기념사|회고|연재)$/;
/** "영가마당·안동 문화" 처럼 갈래 둘을 가운뎃점으로 붙여 적은 것도 갈래다 */
const isLabel = (s: string) => LABEL.test(s) || (s.includes("·") && s.split("·").every((x) => LABEL.test(x.trim())));

/** 괄호 밖의 " · ", " — ", " / " 로만 나눈다 */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if ("(（〈《「『[".includes(c)) depth++;
    if (")）〉》」』]".includes(c)) depth = Math.max(0, depth - 1);
    if (depth === 0) {
      const m = s.slice(i).match(/^\s+[·—/]\s+/);
      if (m) {
        out.push(cur);
        cur = "";
        i += m[0].length - 1;
        continue;
      }
    }
    cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

const clean = (s: string) => s.replace(/\s+/g, " ").replace(/^[,·\s]+|[,·\s]+$/g, "").trim();

/** "(李 유 택, 전 송파구청 구청장 · 원로회원)" → "전 송파구청 구청장 · 원로회원" */
function roleFromParen(inner: string): string {
  const parts = inner.split(/[,，]/).map((x) => x.trim());
  // 한자 이름(띄어 쓴 것 포함)으로 시작하면 그 조각은 버린다
  if (parts.length > 1 && /^[㐀-鿿豈-﫿][㐀-鿿豈-﫿\s가-힣]{0,8}$/.test(parts[0])) {
    parts.shift();
  }
  if (parts.length === 1 && /^[㐀-鿿豈-﫿\s]+$/.test(parts[0])) return "";
  return parts.join(", ");
}

export function parseByline(subtitle: string | null | undefined, author: string | null | undefined): Byline {
  const by: Byline = {};
  const name = author && author !== "편집실" ? author.trim() : undefined;
  if (name) by.name = name;
  if (!subtitle) return by;

  const labels: string[] = [];
  const sources: string[] = [];
  const subs: string[] = [];

  for (let seg of splitTop(subtitle)) {
    // 〈영가칼럼〉 조봉환 … — 앞의 꺾쇠 갈래를 떼어 낸다
    const head = seg.match(/^[〈<\[]([^〉>\]]{1,14})[〉>\]]\s*(.*)$/);
    if (head) {
      labels.push(head[1].trim());
      seg = head[2].trim();
      if (!seg) continue;
    }
    if (isLabel(seg)) {
      labels.push(seg);
      continue;
    }
    if (name && !by.role && seg.includes(name.replace(/\s/g, "")) || (name && !by.role && seg.startsWith(name))) {
      // 이름이 든 조각 — 이름 뒤가 직함
      let rest = seg.slice(seg.indexOf(name) + name.length).trim();
      // "(전)소상공인시장진흥공단 이사장" 처럼 괄호가 직함 머리에 붙은 것은 지면 글자 그대로 둔다
      if (rest.startsWith("(") && !/^\([^()]{1,2}\)\S/.test(rest)) {
        // 짝이 맞는 닫는 괄호까지 — "(한국문화전강(원) 이사장)" 처럼 겹친 괄호가 있다
        let depth = 0;
        let end = -1;
        for (let i = 0; i < rest.length; i++) {
          if (rest[i] === "(") depth++;
          if (rest[i] === ")" && --depth === 0) {
            end = i;
            break;
          }
        }
        if (end > 0) {
          const r = roleFromParen(rest.slice(1, end));
          rest = [r, rest.slice(end + 1).trim()].filter(Boolean).join(" ");
        }
      }
      // 직함 끝에 붙은 출처는 떼어 낸다
      const src = rest.match(/(《?영가회보》?.*|《영가회 40년사》.*)$/);
      if (src) {
        sources.push(clean(src[1]));
        rest = rest.slice(0, src.index);
      }
      const role = clean(rest);
      if (role) by.role = role;
      else by.role = "";
      continue;
    }
    if (SOURCE.test(seg)) {
      sources.push(seg);
      continue;
    }
    subs.push(seg);
  }

  if (by.role === "") delete by.role;
  if (subs.length) by.sub = subs.join(" · ");
  if (labels.length) by.label = labels.join(" · ");
  if (sources.length) {
    // 낫표 없이 적힌 "영가회보 8-11호" 도 《영가회보》로 맞춘다
    by.source = sources.join(" · ").replace(/(^|[^《])영가회보(?!》)/g, "$1《영가회보》");
  }
  return by;
}
