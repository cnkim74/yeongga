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
  searchParams: Promise<{ next?: string; need?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next ?? "/";
  const needAdmin = sp.need === "admin";

  const user = await getCurrentUser();
  if (user) {
    // 이미 로그인된 경우 — 권한이 충분하면 next 로 보내고, 부족하면 홈으로
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

          <LoginForm next={next} needAdmin={needAdmin} />

          <div className="mt-8 text-sm text-[var(--color-ink-mute)] text-center">
            계정이 없으신가요? 운영진에게 요청하시면 계정을 발급해 드립니다.
          </div>

          <div className="mt-12 pt-6 border-t border-[var(--color-rule)] text-xs text-[var(--color-ink-mute)] leading-relaxed">
            <strong className="text-[var(--color-ink-soft)]">기본 계정 안내 (개발용):</strong>
            <ul className="mt-2 space-y-1 font-mono">
              <li>관리자 — admin / yeongga</li>
              <li>회원 예시 — kim / yeongga</li>
            </ul>
            <div className="mt-2 text-[10px]">
              운영 시작 전에 비밀번호를 반드시 변경하세요.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
