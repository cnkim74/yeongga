import "server-only";

/**
 * 영가회 회원수첩(PDF)에서 공개 항목만 뽑아낸다.
 *
 * 수첩에는 자택 주소와 생년이 함께 실려 있다. 그 두 항목과 전화번호는
 * 이 단계에서 버리고, 성명·한자·현직·경력만 남긴다. 저장도 하지 않는다.
 */

export type DirectoryEntry = {
  name: string;
  hanja: string;
  position: string; // 현직
  career: string; // 경력
  pageNo: number;
};

// 김두현(金斗鉉)(1939년 生) — 뒤의 생년은 읽어서 버린다.
// 줄 끝이 잘려도 이름으로 알아보도록 앞부분만 본다.
const NAME_LINE = /^([가-힣]{2,5})\(([一-鿿]{1,5})\)/;
/** 생년까지 붙은 이름 — 줄 중간에 있어도 찾는다 */
const NAME_WITH_YEAR = /([가-힣]{2,5})\(([一-鿿]{1,5})\)\s*\(\s*\d{4}\s*년\s*生\s*\)/;
const PHONE = /^[\d(]?[\d\-*()\s]{6,}$/;
const LABEL = /^(현직|경력|자택|직장|사무실|회사|본적|주소|학력|비고)\s*/;
/** 공개하지 않는 항목 — 집·회사 주소는 저장하지 않는다 */
const DROP = new Set(["자택", "본적", "주소", "회사", "직장", "사무실"]);
/** 주소로 보이는 줄은 이어지는 줄이라도 버린다 */
const ADDRESS = /\(우:\s*\d{5}\)|[시도]\s?[가-힣]+[시군구]\s|[가-힣]+(로|길)\s?\d|\d+동\s*\d+호/;

function pushLine(bag: Map<string, string[]>, label: string, text: string) {
  if (!text.trim() || DROP.has(label)) return;
  if (ADDRESS.test(text)) return;
  const arr = bag.get(label) ?? [];
  arr.push(text.trim());
  bag.set(label, arr);
}

export function parseDirectoryPage(
  text: string,
  pageNo: number,
): DirectoryEntry[] {
  const out: DirectoryEntry[] = [];
  let bag = new Map<string, string[]>();
  let label = "";

  const flush = (name: string, hanja: string) => {
    out.push({
      name,
      hanja,
      position: (bag.get("현직") ?? []).join(" · "),
      career: (bag.get("경력") ?? []).join(" · "),
      pageNo,
    });
    bag = new Map();
    label = "";
  };

  for (const raw of text.split("\n")) {
    let line = raw.trim();
    if (!line) continue;

    // 이름은 줄 첫머리에 오기도 하고, 앞 줄이 붙어 중간에 오기도 한다.
    // 생년이 붙은 형태를 찾아 그 앞은 앞사람 항목으로, 뒤는 다음 항목으로 나눈다.
    let m = NAME_WITH_YEAR.exec(line);
    while (m) {
      const before = line.slice(0, m.index).trim();
      if (before) {
        const lm = LABEL.exec(before);
        if (lm) {
          label = lm[1];
          pushLine(bag, label, before.slice(lm[0].length));
        } else if (label) {
          pushLine(bag, label, before);
        }
      }
      flush(m[1], m[2]);
      line = line.slice(m.index + m[0].length).trim();
      m = NAME_WITH_YEAR.exec(line);
    }
    if (!line) continue;

    // 생년 없이 이름만 있는 줄
    const only = NAME_LINE.exec(line);
    if (only && line.length <= only[0].length + 2) {
      flush(only[1], only[2]);
      continue;
    }

    if (line === "M" || line === "F" || /^\d{1,3}$/.test(line)) continue;
    if (PHONE.test(line)) continue;

    const labelMatch = LABEL.exec(line);
    if (labelMatch) {
      label = labelMatch[1];
      pushLine(bag, label, line.slice(labelMatch[0].length));
    } else if (label) {
      pushLine(bag, label, line);
    }
  }
  return out;
}

/** PDF 전체를 훑어 회원 항목을 모은다 */
export async function parseDirectoryPdf(
  buf: ArrayBuffer,
): Promise<DirectoryEntry[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // 서버에서는 워커 없이 읽는다. 글자만 뽑아 쓰므로 글꼴은 필요 없다.
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buf),
    useSystemFonts: false,
    disableFontFace: true,
    isEvalSupported: false,
  }).promise;

  const all: DirectoryEntry[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // pdfjs 는 조각(item)으로 주므로 y 좌표가 바뀔 때 줄을 나눈다
    let lastY: number | null = null;
    const lines: string[] = [];
    for (const item of content.items as { str: string; transform: number[] }[]) {
      const y = Math.round(item.transform[5]);
      if (lastY === null || Math.abs(y - lastY) > 2) {
        lines.push(item.str);
        lastY = y;
      } else {
        lines[lines.length - 1] += item.str;
      }
    }
    all.push(...parseDirectoryPage(lines.join("\n"), i));
  }
  return all;
}
