import { PageHeroBg } from "@/components/PageHeroBg";
import { ContributeForm } from "./ContributeForm";

export const revalidate = 3600;

export const metadata = {
  title: "자료 제공 — 영가회",
  description:
    "영가회 회원께서 보관 중인 사진·문서·회고·영상 등을 보내 주세요. 한 장의 사진, 한 줄의 글이 다음 세대로 이어집니다.",
};

export default function ContributePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative pt-40 pb-20 sm:pb-28 overflow-hidden bg-[var(--color-bg-soft)]">
        <PageHeroBg page="contribute" />
        <div className="relative mx-auto max-w-3xl px-6">
          <div className="kicker text-[var(--color-ink-mute)] mb-5">
            CONTRIBUTE · 資料提供
          </div>
          <h1 className="display text-5xl sm:text-7xl mb-6">자료 제공</h1>
          <p className="text-base sm:text-lg text-[var(--color-ink-soft)] leading-relaxed max-w-2xl">
            영가회 회원께서 보관 중인 <b>사진·문서·회고·영상</b>을 보내 주세요.
            한 장의 사진, 한 줄의 글이 다음 세대로 이어집니다.
            <br />
            보내 주신 자료는 편집실에서 정리한 뒤 갤러리·아카이브에 차차 갈무리해
            두겠습니다.
          </p>
        </div>
      </section>

      {/* FORM */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-2xl px-6">
          <ContributeForm />
        </div>
      </section>

      {/* INFO */}
      <section className="bg-[var(--color-bg-soft)] py-14 border-t border-[var(--color-rule)]">
        <div className="mx-auto max-w-2xl px-6 text-sm text-[var(--color-ink-soft)] leading-relaxed">
          <h2 className="display-md text-xl mb-3 text-[var(--color-ink)]">
            자료 제공 안내
          </h2>
          <ul className="space-y-2 list-disc list-inside marker:text-[var(--color-ink-mute)]">
            <li>
              사진은 가능하면 <b>원본 크기</b>로 보내 주시고, 짧은 설명(찍은 해·장소·함께한 분)을 메시지에 함께 적어 주세요.
            </li>
            <li>
              한 번에 첨부 가능한 파일은 1개 · 최대 30MB 입니다. 여러 장이면 메시지에 안내 후 별도로 연락드리겠습니다.
            </li>
            <li>
              개인정보(이메일·연락처)는 회신 용도로만 사용하며 외부에 공개되지 않습니다.
            </li>
            <li>
              보내 주신 자료는 편집실에서 확인 후 정리·태그를 거쳐 영가회 아카이브에 갈무리됩니다.
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
