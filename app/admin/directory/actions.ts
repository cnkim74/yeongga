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
  const label = String(formData.get("label") ?? "").trim();
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "수첩 PDF 파일을 골라 주세요." };
  }
  if (!label) {
    return { ok: false, message: "기준 시점을 적어 주세요. 예: 2026년 1월 1일" };
  }

  try {
    const entries = await parseDirectoryPdf(await file.arrayBuffer());
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
