import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "./SignupForm";

export const metadata = {
  title: "회원가입 — 영가회",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next ?? "/";

  const user = await getCurrentUser();
  if (user) redirect(next);

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
            <div className="kicker text-white/60 mb-3">MEMBERS · 會員 加入</div>
            <h2 className="display text-4xl xl:text-5xl mb-3">
              영가회 회원이<br />되어 주세요
            </h2>
            <p className="text-white/80 max-w-md leading-relaxed">
              가입 신청 후 운영진의 승인을 거쳐 회원 전용 자료와 게시판을
              이용하실 수 있습니다.
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

          <div className="kicker text-[var(--color-ink-mute)] mb-3">SIGN UP</div>
          <h1 className="display text-4xl mb-2">회원가입</h1>
          <p className="text-[var(--color-ink-soft)] mb-10">
            이메일 또는 구글 계정으로 가입을 신청하세요.
          </p>

          <SignupForm next={next} />

          <div className="mt-8 text-sm text-[var(--color-ink-mute)] text-center">
            이미 계정이 있으신가요?{" "}
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="text-[var(--color-accent)] underline hover:opacity-80"
            >
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
