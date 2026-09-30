import { PageHeroBg } from "@/components/PageHeroBg";
import {
  INITIALS,
  getDirectoryMeta,
  initialOf,
  listDirectory,
} from "@/lib/directory-db";
import { MemberList } from "./MemberList";

export const revalidate = 3600;

export const metadata = {
  title: "회원 — 영가회",
  description:
    "영가회 회원 명단입니다. 회원수첩의 성명·직장·직위만 실었고, 주소와 연락처는 공개하지 않습니다.",
};

export default async function MembersPage() {
  // 데이터베이스가 잠시 안 되면 빈 목록으로라도 페이지는 열어 준다
  const [members, meta] = await Promise.all([
    listDirectory().catch(() => []),
    getDirectoryMeta().catch(() => ({}) as Record<string, string>),
  ]);
  const withInitial = members.map((m) => ({ ...m, initial: initialOf(m.name) }));
  const used = INITIALS.filter((i) => withInitial.some((m) => m.initial === i));

  return (
    <>
      <section className="relative overflow-hidden bg-[var(--color-bg-soft)] pt-40 pb-16 sm:pb-20">
        <PageHeroBg page="about" />
        <div className="relative mx-auto max-w-4xl px-6">
          <div className="kicker text-[var(--color-ink-mute)] mb-5">
            MEMBERS · 會員
          </div>
          <h1 className="display text-5xl sm:text-7xl mb-6">회원</h1>
          <p className="text-xl sm:text-2xl text-[var(--color-ink-soft)] max-w-2xl leading-relaxed">
            {meta.count
              ? `회원수첩에 오른 ${meta.count}명입니다. ${meta.label ?? ""} 기준.`
              : "회원수첩을 바탕으로 정리한 명단입니다."}
          </p>
        </div>
      </section>

      <section className="bg-[var(--color-paper)] py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mb-10 rounded-lg border border-[var(--color-rule)] bg-[var(--color-bg-soft)] px-5 py-4 text-base leading-relaxed text-[var(--color-ink-soft)]">
            성명과 직장·직위만 실었습니다. <strong>자택 주소와 전화번호, 생년은
            공개하지 않습니다.</strong> 연락처는 회원수첩을 봐 주십시오.
          </p>

          {members.length === 0 ? (
            <p className="py-16 text-center text-lg text-[var(--color-ink-mute)]">
              명단을 준비하고 있습니다.
            </p>
          ) : (
            <MemberList members={withInitial} initials={used} />
          )}
        </div>
      </section>
    </>
  );
}
