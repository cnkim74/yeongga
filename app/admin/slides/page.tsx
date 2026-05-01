import Link from "next/link";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { listSlides } from "@/lib/slides-db";
import {
  deleteSlideAction,
  moveSlideAction,
  toggleSlideAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default function AdminSlides() {
  const slides = listSlides();
  const activeCount = slides.filter((s) => s.active).length;

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "🗂️ 관리실 홈", href: "/admin" },
          { label: "🖼️ 슬라이드" },
        ]}
        right={
          <Link
            href="/admin/slides/new"
            className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf]"
          >
            + 새 슬라이드
          </Link>
        }
      />

      <div className="px-12 pt-12 pb-24 max-w-[1080px] mx-auto">
        <div className="text-7xl mb-3 leading-none select-none">🖼️</div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          홈 표지 슬라이드
        </h1>
        <p className="text-[var(--color-notion-mute)] text-base mb-6 max-w-2xl">
          공개 사이트 메인 상단에 노출되는 슬라이드입니다. 활성 상태인 항목만
          표시되며, 위쪽일수록 먼저 나타납니다.
        </p>

        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm mb-8">
          <Prop k="총" v={`${slides.length}장`} />
          <Prop k="활성" v={`${activeCount}장`} />
          <Prop k="권장 비율" v="16:9 이상 (가로 2400px 이상)" />
        </div>

        {slides.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-3">
            {slides.map((s, i) => (
              <li
                key={s.id}
                className="border border-[var(--color-notion-rule)] rounded-lg overflow-hidden flex"
              >
                <img
                  src={s.image_path}
                  alt=""
                  className="w-44 h-28 object-cover bg-[var(--color-notion-hover)] shrink-0"
                />
                <div className="flex-1 px-4 py-3 min-w-0 flex flex-col justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-[var(--color-notion-mute)] font-mono uppercase tracking-wider mb-1">
                      {s.kicker ?? "—"}
                    </div>
                    <Link
                      href={`/admin/slides/${s.id}/edit`}
                      className="text-base font-semibold hover:underline line-clamp-1"
                    >
                      {s.title.replace(/\n/g, " · ")}
                    </Link>
                    {s.excerpt && (
                      <p className="text-sm text-[var(--color-notion-mute)] line-clamp-1 mt-0.5">
                        {s.excerpt}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--color-notion-mute)]">
                    <span>→ {s.href}</span>
                    {s.active ? (
                      <span className="notion-tag tag-green">● 활성</span>
                    ) : (
                      <span className="notion-tag tag-gray">● 비활성</span>
                    )}
                  </div>
                </div>
                <div className="px-3 py-3 flex flex-col gap-1 border-l border-[var(--color-notion-rule)] shrink-0">
                  <form action={moveSlideAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="dir" value="up" />
                    <button
                      type="submit"
                      disabled={i === 0}
                      className="notion-icon-btn h-7 disabled:opacity-30"
                      title="위로"
                    >
                      ↑
                    </button>
                  </form>
                  <form action={moveSlideAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="dir" value="down" />
                    <button
                      type="submit"
                      disabled={i === slides.length - 1}
                      className="notion-icon-btn h-7 disabled:opacity-30"
                      title="아래로"
                    >
                      ↓
                    </button>
                  </form>
                </div>
                <div className="px-3 py-3 flex flex-col items-end gap-2 border-l border-[var(--color-notion-rule)] shrink-0 min-w-[110px]">
                  <Link
                    href={`/admin/slides/${s.id}/edit`}
                    className="notion-icon-btn"
                  >
                    편집
                  </Link>
                  <form action={toggleSlideAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <input
                      type="hidden"
                      name="active"
                      value={s.active ? "0" : "1"}
                    />
                    <button type="submit" className="notion-icon-btn text-xs">
                      {s.active ? "비활성으로" : "활성화"}
                    </button>
                  </form>
                  <ConfirmDelete
                    action={deleteSlideAction}
                    hidden={{ id: s.id }}
                    message="이 슬라이드를 삭제할까요?"
                    className="notion-icon-btn text-xs text-[#c4554d] hover:bg-[#ffe2dd]"
                  >
                    삭제
                  </ConfirmDelete>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function Prop({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[var(--color-notion-mute)]">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function Empty() {
  return (
    <div className="border border-dashed border-[var(--color-notion-rule)] rounded-md p-12 text-center">
      <div className="text-5xl mb-3">🖼️</div>
      <div className="text-base font-medium mb-1">아직 슬라이드가 없습니다</div>
      <div className="text-sm text-[var(--color-notion-mute)] mb-4">
        새 슬라이드를 추가하면 공개 사이트 메인에 즉시 반영됩니다.
      </div>
      <Link
        href="/admin/slides/new"
        className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf]"
      >
        + 새 슬라이드
      </Link>
    </div>
  );
}
