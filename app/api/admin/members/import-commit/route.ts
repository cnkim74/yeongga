import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { commitRows, type ParsedRow } from "@/lib/members-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await requireAdmin();
  let body: { rows?: ParsedRow[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "잘못된 요청입니다." },
      { status: 400 }
    );
  }
  if (!Array.isArray(body.rows)) {
    return NextResponse.json(
      { ok: false, error: "rows 배열이 없습니다." },
      { status: 400 }
    );
  }
  const result = await commitRows(body.rows);
  revalidatePath("/admin/members");
  return NextResponse.json({ ok: true, ...result });
}
