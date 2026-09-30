"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { parseDirectoryPdf } from "@/lib/directory-parse";
import { DIRECTORY_TAG, replaceDirectory } from "@/lib/directory-db";

export type ImportState = {
  ok: boolean;
  message: string;
  count?: number;
  sample?: string[];
};

export async function importDirectory(
  _prev: ImportState | null,
  formData: FormData,
): Promise<ImportState> {
  await requireAdmin();

  const file = formData.get("file");
  const url = String(formData.get("url") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const hasFile = file instanceof File && file.size > 0;
  if (!hasFile && !url) {
    return {
      ok: false,
      message: "수첩 PDF 파일을 고르거나, 이북 PDF 주소를 넣어 주세요.",
    };
  }
  if (!label) {
    return { ok: false, message: "기준 시점을 적어 주세요. 예: 2026년 1월 1일" };
  }

  try {
    let buf: ArrayBuffer;
    if (hasFile) {
      buf = await (file as File).arrayBuffer();
    } else {
      // 주소로 가져오는 경우는 우리 이북 저장소만 허용한다
      let host = "";
      try {
        host = new URL(url).hostname;
      } catch {
        return { ok: false, message: "주소 형식이 올바르지 않습니다." };
      }
      if (host !== "cdn.yeongga.com") {
        return {
          ok: false,
          message: "cdn.yeongga.com 의 PDF 주소만 넣을 수 있습니다.",
        };
      }
      const res = await fetch(url);
      if (!res.ok) {
        return { ok: false, message: `PDF 를 받지 못했습니다 (HTTP ${res.status}).` };
      }
      buf = await res.arrayBuffer();
    }
    const entries = await parseDirectoryPdf(buf);
    if (entries.length === 0) {
      return {
        ok: false,
        message:
          "회원 항목을 찾지 못했습니다. 수첩 형식이 달라진 것일 수 있습니다.",
      };
    }
    const count = await replaceDirectory(entries, { label });
    revalidateTag(DIRECTORY_TAG, "max");
    revalidatePath("/members");
    return {
      ok: true,
      message: `${count}명을 등록했습니다. 자택 주소·생년·전화번호는 저장하지 않았습니다.`,
      count,
      sample: entries.slice(0, 5).map((e) => `${e.name}(${e.hanja}) — ${e.position}`),
    };
  } catch (e) {
    return {
      ok: false,
      message: `읽는 중 문제가 생겼습니다: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
