import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { parseExcelFile } from "@/lib/members-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await requireAdmin();
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "파일이 없습니다." },
      { status: 400 }
    );
  }
  try {
    const rows = await parseExcelFile(file);
    return NextResponse.json({ ok: true, rows });
  } catch (e) {
    console.error("[members-import] parse error", e);
    return NextResponse.json(
      { ok: false, error: `파일 파싱 실패: ${String(e)}` },
      { status: 400 }
    );
  }
}
