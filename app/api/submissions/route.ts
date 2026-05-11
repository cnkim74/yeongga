import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  createSubmission,
  CATEGORY_LABELS,
  ATTRIBUTION_LABELS,
  type SubmissionCategory,
  type AttributionMode,
} from "@/lib/submissions-db";
import { sendMail, escapeHtml } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidCategory(s: string): s is SubmissionCategory {
  return ["photo", "document", "memoir", "video", "other"].includes(s);
}

function isValidAttribution(s: string): s is AttributionMode {
  return ["name", "anon", "anon_era"].includes(s);
}

function hashIp(ip: string, ua: string): string {
  const SALT = process.env.VISITOR_SALT ?? "yeongga-visitor-2026";
  return crypto
    .createHash("sha256")
    .update(`${ip}::${ua}::${SALT}`)
    .digest("hex")
    .slice(0, 16);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim() || null;
    const phone = String(body?.phone ?? "").trim() || null;
    const categoryRaw = String(body?.category ?? "other").trim();
    const message = String(body?.message ?? "").trim();
    const file_url = String(body?.file_url ?? "").trim() || null;
    const file_name = String(body?.file_name ?? "").trim() || null;
    const attributionRaw = String(body?.attribution_mode ?? "name").trim();
    const othersConsent = body?.others_consent === true;
    const consentAgreed = body?.consent === true;
    // honeypot (봇 차단): 폼에 숨겨진 'website' 필드가 채워져 있으면 거부
    const honeypot = String(body?.website ?? "").trim();
    if (honeypot) {
      // 봇으로 간주 — 그러나 200으로 응답해서 봇이 재시도 안 하도록
      return NextResponse.json({ ok: true });
    }

    // ─ 검증 ─
    if (!name) return NextResponse.json({ ok: false, error: "이름을 입력해 주세요." }, { status: 400 });
    if (name.length > 50) return NextResponse.json({ ok: false, error: "이름은 50자 이하로 입력해 주세요." }, { status: 400 });
    if (!message) return NextResponse.json({ ok: false, error: "내용을 입력해 주세요." }, { status: 400 });
    if (message.length > 5000) return NextResponse.json({ ok: false, error: "내용은 5,000자 이하로 입력해 주세요." }, { status: 400 });
    if (!isValidCategory(categoryRaw)) {
      return NextResponse.json({ ok: false, error: "분류 값이 올바르지 않습니다." }, { status: 400 });
    }
    if (!isValidAttribution(attributionRaw)) {
      return NextResponse.json({ ok: false, error: "출처 표기 방식이 올바르지 않습니다." }, { status: 400 });
    }
    if (!consentAgreed) {
      return NextResponse.json({ ok: false, error: "자료 사용 동의에 체크해 주세요." }, { status: 400 });
    }
    if (email && email.length > 200) return NextResponse.json({ ok: false, error: "이메일이 너무 깁니다." }, { status: 400 });

    // ─ 메타 ─
    const ua = req.headers.get("user-agent") ?? "";
    const ip =
      req.headers.get("x-real-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "0.0.0.0";
    const ipHash = hashIp(ip, ua);

    // ─ DB 저장 ─
    const id = await createSubmission({
      name,
      email,
      phone,
      category: categoryRaw,
      message,
      file_url,
      file_name,
      ip_hash: ipHash,
      user_agent: ua.slice(0, 300),
      attribution_mode: attributionRaw,
      others_consent: othersConsent,
      consent_at: new Date().toISOString(),
    });

    // ─ 관리자 이메일 알림 (환경변수 없으면 silent skip) ─
    try {
      const categoryLabel = CATEGORY_LABELS[categoryRaw];
      const attributionLabel = ATTRIBUTION_LABELS[attributionRaw];
      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1715;">
          <div style="border-bottom: 2px solid #8b1a1a; padding-bottom: 12px; margin-bottom: 24px;">
            <h1 style="font-family: 'Noto Serif KR', serif; font-size: 22px; margin: 0; color: #1a1715;">
              영가회 — 새 자료 접수
            </h1>
            <div style="font-size: 12px; color: #8a8278; margin-top: 4px; letter-spacing: 0.1em;">
              YEONGGA · SUBMISSION
            </div>
          </div>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #8a8278; width: 110px;">분류</td><td><b>${escapeHtml(categoryLabel)}</b></td></tr>
            <tr><td style="padding: 6px 0; color: #8a8278;">보낸이</td><td>${escapeHtml(name)}</td></tr>
            ${email ? `<tr><td style="padding: 6px 0; color: #8a8278;">이메일</td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>` : ""}
            ${phone ? `<tr><td style="padding: 6px 0; color: #8a8278;">연락처</td><td>${escapeHtml(phone)}</td></tr>` : ""}
            <tr><td style="padding: 6px 0; color: #8a8278;">출처 표기</td><td>${escapeHtml(attributionLabel)}</td></tr>
            <tr><td style="padding: 6px 0; color: #8a8278;">함께 담긴 분 동의</td><td>${othersConsent ? "✓ 확인됨" : "— (해당 없음 또는 미확인)"}</td></tr>
            <tr><td style="padding: 6px 0; color: #8a8278;">자료 사용 동의</td><td>✓ 동의함 (${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })})</td></tr>
            ${file_url ? `<tr><td style="padding: 6px 0; color: #8a8278;">첨부</td><td><a href="${escapeHtml(file_url)}">${escapeHtml(file_name ?? "파일 보기")}</a></td></tr>` : ""}
          </table>
          <div style="margin-top: 20px; padding: 16px; background: #fbfaf6; border-left: 3px solid #8b1a1a; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(message)}</div>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e6dfd2; font-size: 12px; color: #8a8278;">
            집무실에서 확인 →
            <a href="${process.env.SITE_URL ?? ""}/admin/submissions" style="color: #8b1a1a;">
              접수 #${id} 보기
            </a>
          </div>
        </div>
      `;

      await sendMail({
        subject: `[영가회] 새 자료 접수 — ${categoryLabel} · ${name}`,
        html,
        replyTo: email ?? undefined,
      });
    } catch (e) {
      console.warn("[submissions] 메일 전송 실패 (DB 저장은 정상):", e);
    }

    revalidatePath("/admin/submissions");
    revalidatePath("/admin");

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[submissions POST]", err);
    return NextResponse.json(
      { ok: false, error: "접수 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
