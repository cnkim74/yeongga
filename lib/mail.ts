import "server-only";

/**
 * Resend API 를 사용한 단순 이메일 발송 헬퍼.
 *
 * 환경변수:
 *   RESEND_API_KEY   — Resend 대시보드의 API 키 (필수)
 *   ADMIN_EMAIL      — 관리자 수신 메일 (필수)
 *   FROM_EMAIL       — 발신 메일 주소 (없으면 onboarding@resend.dev 사용)
 *
 * 환경변수가 없으면 silent skip 됩니다 (DB 저장은 정상 진행).
 */

export type SendMailOptions = {
  to?: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendMail(opts: SendMailOptions): Promise<
  | { ok: true; id: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; error: string }
> {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  const from = process.env.FROM_EMAIL ?? "영가회 <onboarding@resend.dev>";

  if (!apiKey) {
    return { ok: false, skipped: true, reason: "RESEND_API_KEY 미설정" };
  }
  const to = opts.to ?? adminEmail;
  if (!to) {
    return { ok: false, skipped: true, reason: "수신자(ADMIN_EMAIL) 미설정" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject: opts.subject,
        html: opts.html,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status} — ${text.slice(0, 200)}` };
    }
    const json = (await res.json()) as { id?: string };
    return { ok: true, id: json.id ?? "unknown" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** HTML 안전 escape */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
