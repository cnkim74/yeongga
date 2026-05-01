import { AdminTopbar } from "@/components/admin/AdminTopbar";
import {
  photos,
  categoryTagClass,
  statusTagClass,
  type PhotoStatus,
} from "@/lib/photos";

const STATUS_ORDER: PhotoStatus[] = ["공개", "검수중", "보류", "비공개"];

export default function PhotoArchivePage() {
  const total = photos.length;
  const byStatus = STATUS_ORDER.map((s) => ({
    status: s,
    count: photos.filter((p) => p.status === s).length,
  }));

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "🗂️ 관리실 홈", href: "/admin" },
          { label: "📸 사진 아카이브" },
        ]}
        right={
          <>
            <button className="notion-icon-btn" type="button" aria-label="공유">
              공유
            </button>
            <button className="notion-icon-btn" type="button" aria-label="댓글">
              💬
            </button>
            <button className="notion-icon-btn" type="button" aria-label="더보기">
              ⋯
            </button>
          </>
        }
      />

      <div className="px-12 pt-12 pb-24">
        {/* 페이지 헤더 (노션 스타일) */}
        <div className="text-7xl mb-3 leading-none select-none">📸</div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          사진 아카이브
        </h1>
        <p className="text-[var(--color-notion-mute)] text-base mb-6 max-w-2xl">
          영가회 모임·행사·회보 자료 사진을 분류·태그·상태별로 관리합니다.
          공개 상태인 사진만 추후 회보 또는 본문에 인용됩니다.
        </p>

        {/* 속성 바 */}
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm mb-8">
          <Prop k="총 항목" v={`${total}장`} />
          <Prop k="공개" v={`${byStatus[0].count}`} />
          <Prop k="검수중" v={`${byStatus[1].count}`} />
          <Prop k="보류" v={`${byStatus[2].count}`} />
          <Prop k="비공개" v={`${byStatus[3].count}`} />
        </div>

        {/* 뷰 탭 + 액션 바 */}
        <div className="border-b border-[var(--color-notion-rule)] mb-2 flex items-end justify-between flex-wrap gap-2">
          <div className="flex gap-1 text-sm">
            <ViewTab label="📋 표" active />
            <ViewTab label="🖼️ 갤러리" />
            <ViewTab label="📌 보드" />
            <button
              className="notion-icon-btn text-[var(--color-notion-mute)]"
              type="button"
            >
              + 뷰 추가
            </button>
          </div>
          <div className="flex items-center gap-1 pb-1">
            <button className="notion-icon-btn" type="button">필터</button>
            <button className="notion-icon-btn" type="button">정렬</button>
            <button className="notion-icon-btn" type="button">🔍</button>
            <button
              className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf]"
              type="button"
            >
              + 새 항목
            </button>
          </div>
        </div>

        {/* 표 */}
        <div className="overflow-x-auto -mx-2">
          <table className="notion-table min-w-[920px]">
            <thead>
              <tr>
                <Th w="32"> </Th>
                <Th w="240">📄 이름</Th>
                <Th w="120">🏷 분류</Th>
                <Th w="110">📅 촬영일</Th>
                <Th w="160">📍 장소</Th>
                <Th w="100">👤 등록자</Th>
                <Th w="160">🔖 태그</Th>
                <Th w="90">⚪ 상태</Th>
                <Th w="110">🗓 등록일</Th>
              </tr>
            </thead>
            <tbody>
              {photos.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="notion-row-handle" aria-hidden="true">⋮⋮</span>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden="true">🖼️</span>
                      <a
                        href="#"
                        className="hover:underline font-medium"
                      >
                        {p.name}
                      </a>
                    </span>
                  </td>
                  <td>
                    <span className={`notion-tag ${categoryTagClass(p.category)}`}>
                      {p.category}
                    </span>
                  </td>
                  <td className="text-[var(--color-notion-text)]">{p.shotDate}</td>
                  <td className="text-[var(--color-notion-text)]">{p.place}</td>
                  <td className="text-[var(--color-notion-text)]">{p.uploader}</td>
                  <td>
                    <span className="flex flex-wrap gap-1">
                      {p.tags.map((t) => (
                        <span key={t} className="notion-tag tag-gray">
                          {t}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td>
                    <span className={`notion-tag ${statusTagClass(p.status)}`}>
                      ● {p.status}
                    </span>
                  </td>
                  <td className="text-[var(--color-notion-mute)]">{p.registered}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={9}>
                  <button
                    className="notion-icon-btn text-[var(--color-notion-mute)] w-full justify-start"
                    type="button"
                  >
                    + 새로 추가
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="text-xs text-[var(--color-notion-mute)] py-2">
                  COUNT {total}
                </td>
                <td colSpan={7} />
              </tr>
            </tfoot>
          </table>
        </div>

        <hr className="notion-divider" />

        <details className="text-sm text-[var(--color-notion-mute)]">
          <summary className="cursor-pointer hover:text-[var(--color-notion-text)]">
            ℹ︎ 데이터 소스 안내
          </summary>
          <p className="mt-2 leading-relaxed">
            현재 데이터는{" "}
            <code className="bg-[var(--color-notion-hover)] px-1 rounded">
              lib/photos.ts
            </code>{" "}
            에 정의된 시드 데이터로 채워져 있습니다. 실제 운영 시에는 SQLite +
            업로드 폴더 또는 외부 DB(예: Supabase)와 연결하면 됩니다. 현재
            화면은 노션식 표 뷰의 외관과 상호작용 패턴을 그대로 옮긴
            정적 미리보기입니다.
          </p>
        </details>
      </div>
    </>
  );
}

function Th({ children, w }: { children: React.ReactNode; w?: string }) {
  return (
    <th style={{ width: w ? `${w}px` : undefined }}>{children}</th>
  );
}

function ViewTab({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      className={`px-3 py-1.5 text-sm rounded-t-md border-b-2 transition ${
        active
          ? "border-[var(--color-notion-text)] text-[var(--color-notion-text)] font-medium"
          : "border-transparent text-[var(--color-notion-mute)] hover:text-[var(--color-notion-text)] hover:bg-[var(--color-notion-hover)]"
      }`}
    >
      {label}
    </button>
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
