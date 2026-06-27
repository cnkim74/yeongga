import { NextResponse, type NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { getAttachment } from "@/lib/board-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 우리 스토리지에서 온 URL만 허용 (오픈 프록시/SSRF 방지)
function isAllowedRemote(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const h = u.hostname;
    return (
      h === "cdn.yeongga.com" ||
      h.endsWith(".r2.dev") ||
      h.endsWith(".r2.cloudflarestorage.com") ||
      h.endsWith(".public.blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 자료실은 회원 전용 — 로그인 확인
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const att = await getAttachment(Number(id));
  if (!att) {
    return NextResponse.json({ error: "첨부를 찾을 수 없습니다." }, { status: 404 });
  }

  const filename = att.file_name || "download";
  // 한글 등 비ASCII 파일명 보존 (RFC 5987)
  const disposition = `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`;
  const contentType = att.mime || "application/octet-stream";

  // 로컬 업로드 (/uploads/...) — 디스크에서 직접 읽기
  if (att.file_url.startsWith("/")) {
    if (!att.file_url.startsWith("/uploads/")) {
      return NextResponse.json({ error: "허용되지 않는 경로입니다." }, { status: 400 });
    }
    try {
      const full = path.join(process.cwd(), "public", att.file_url);
      const buf = await fs.readFile(full);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": disposition,
          "Content-Length": String(buf.length),
        },
      });
    } catch {
      return NextResponse.json({ error: "파일을 읽을 수 없습니다." }, { status: 404 });
    }
  }

  // 원격 (R2 등) — 서버가 받아서 attachment 헤더로 재전송
  if (!isAllowedRemote(att.file_url)) {
    return NextResponse.json({ error: "허용되지 않는 저장소입니다." }, { status: 400 });
  }
  const upstream = await fetch(att.file_url);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "원본 파일을 가져올 수 없습니다." }, { status: 502 });
  }
  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Content-Disposition", disposition);
  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  return new NextResponse(upstream.body, { headers });
}
