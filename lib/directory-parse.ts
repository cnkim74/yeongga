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

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const nameMatch = NAME_LINE.exec(line);
    if (nameMatch) {
      // 한 사람 몫을 넘어서면 앞사람 것이 섞인 것이므로 버린다
      const overflow = [...bag.values()].reduce((n, v) => n + v.length, 0) > 12;
      if (overflow) bag = new Map();
      out.push({
        name: nameMatch[1],
        hanja: nameMatch[2],
        position: (bag.get("현직") ?? []).join(" · "),
        career: (bag.get("경력") ?? []).join(" · "),
        pageNo,
      });
      bag = new Map();
      label = "";
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
