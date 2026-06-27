import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "로그인 — 영가회",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    need?: string;
    error?: string;
    registered?: string;
    pending?: string;
  }>;
}) {
  const sp = await searchParams;
  const next = sp.next ?? "/";
  const needAdmin = sp.need === "admin";
  const initialError = sp.error;
  const notice =
    sp.registered === "1"
      ? "가입 신청이 접수되었습니다. 관리자 승인 후 로그인하실 수 있습니다."
      : sp.pending === "1"
      ? "아직 관리자 승인 대기 중인 계정입니다. 승인되면 로그인하실 수 있습니다."
      : null;

  const user = await getCurrentUser();
  // 에러 메시지가 있으면 (예: Google OAuth 실패) 로그인 상태여도 페이지를 그려서
  // 에러를 보여 줘야 함 — 그냥 리다이렉트하면 사용자는 무슨 일이 있었는지 모름.
  if (user && !initialError) {
    if (needAdmin && user.role !== "admin") {
      redirect("/");
    }
    redirect(next);
  }

  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-2">
      {/* 좌측 — 사진 패널 */}
      <div className="hidden lg:block relative bg-[var(--color-ink)]">
        <img
          src="/slides/cover-lake.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-black/70" />
        <div className="relative z-10 h-full flex flex-col justify-between p-12 text-white">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            永嘉 · YEONGGA
          </Link>
          <div>
            <div className="kicker text-white/60 mb-3">
              MEMBERS · 會員 專用
            </div>
            <h2 className="display text-4xl xl:text-5xl mb-3">
              회원께만 열린<br />페이지가 있습니다
            </h2>
            <p className="text-white/80 max-w-md leading-relaxed">
              회의록과 회원 명부 등 비공개 자료를 보시려면 로그인하세요.
              관리자는 운영 페이지에 함께 들어갑니다.
            </p>
          </div>
        </div>
      </div>

      {/* 우측 — 폼 */}
      <div className="flex flex-col justify-center px-6 py-16 sm:px-12">
        <div className="max-w-sm w-full mx-auto">
          <Link
            href="/"
            className="lg:hidden text-xl font-bold tracking-tight mb-10 inline-block"
          >
            永嘉 · YEONGGA
          </Link>

          <div className="kicker text-[var(--color-ink-mute)] mb-3">
            LOGIN
          </div>
          <h1 className="display text-4xl mb-2">
            {needAdmin ? "관리자 로그인" : "회원 로그인"}
          </h1>
          <p className="text-[var(--color-ink-soft)] mb-10">
            영가회 계정으로 들어오세요.
          </p>

          {notice && (
            <div className="mb-6 text-sm bg-[var(--color-bg-soft)] border border-[var(--color-rule)] rounded-lg p-3 text-[var(--color-ink-soft)]">
              {notice}
            </div>
          )}

          <LoginForm next={next} needAdmin={needAdmin} initialError={initialError} />

          <div className="mt-8 text-sm text-[var(--color-ink-mute)] text-center">
            계정이 없으신가요?{" "}
            <Link
              href={`/signup?next=${encodeURIComponent(next)}`}
              className="text-[var(--color-accent)] underline hover:opacity-80"
            >
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
