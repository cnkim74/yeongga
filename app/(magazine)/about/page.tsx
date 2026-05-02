import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "회 소개 — 영가회",
};

export default function AboutPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-[var(--color-bg-soft)] pt-40 pb-24 sm:pb-32">
        <Image
          src="/andong-hahoe-panorama.jpg"
          alt=""
          fill
          className="object-cover opacity-20 select-none pointer-events-none"
          priority
        />
        <div className="relative mx-auto max-w-4xl px-6">
          <div className="kicker text-[var(--color-ink-mute)] mb-5">
            ABOUT · 會 紹介
          </div>
          <h1 className="display text-5xl sm:text-7xl mb-6">
            영가회<br />
            <span className="text-[var(--color-ink-mute)]">永嘉會</span>
          </h1>
          <p className="text-xl sm:text-2xl text-[var(--color-ink-soft)] max-w-2xl leading-relaxed">
            오래된 인연이 오래 이어지는 자리.
          </p>
        </div>
      </section>

      <section className="bg-[var(--color-paper)] py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-6">
          <div className="prose-body space-y-7">
            <p>
              영가회는 본래 한 고향에서 자란 벗들이 도시에 자리 잡은 뒤에도
              인연을 이어가기 위해 만든 작은 모임입니다. 한 자리에 모이기
              어려워진 시절에는 글로, 사진으로, 또 가끔의 짧은 만남으로 정을
              이어왔습니다.
            </p>
            <p>
              이 아카이브는 그동안 회원들이 남겨 주신 글과 사진, 회의 기록을
              한곳에 모아 한 권의 잡지처럼 읽을 수 있도록 정리한 자리입니다.
              기록이 모이면 곧 한 사람의 삶이 되고, 한 모임의 역사가 됩니다.
            </p>

            <h2>아카이브 사용법</h2>
            <ul>
              <li>
                글은 다섯 개의 장(章)으로 나누어 두었습니다 — <strong>연기,
                모임, 글, 사람, 자취.</strong> 위쪽의 <em>아카이브</em>
                메뉴에서 장을 골라 들어가실 수 있습니다.
              </li>
              <li>
                본문 글자는 본명조 계열로 표시됩니다. 화면이 작거나 눈이
                피로하실 때는 화면 위쪽의 <strong>가</strong> 단추를 눌러
                글자 크기를 다섯 단계로 조절하실 수 있습니다.
              </li>
              <li>
                사진은 회 내부 운영용 <a href="/admin/photos">관리실</a>에서
                분류·태그를 정리한 뒤 본문에 인용됩니다.
              </li>
            </ul>

            <h2>글을 보내고 싶으신 분께</h2>
            <p>
              새로 글을 보태고 싶으시거나, 잘못된 부분을 알려 주실 분은 회의
              담당자에게 직접 보내 주시면 됩니다. 보내 주신 글은 해당
              장(章)에 맞추어 정성껏 갈무리하겠습니다.
            </p>

            <blockquote>
              <p>"글은 사람의 발자국이다. 발자국이 모이면 길이 된다."</p>
            </blockquote>
          </div>

          <div className="mt-16 flex flex-wrap gap-3">
            <Link href="/archive" className="btn-pill">
              아카이브 펼치기 →
            </Link>
            <Link href="/" className="btn-pill ghost">
              표지로 돌아가기
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
