import Link from "next/link";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { listUsers } from "@/lib/users-db";
import { getCurrentUser } from "@/lib/auth";
import { deleteMemberAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminMembers() {
  const me = await getCurrentUser();
  const users = await listUsers();
  const adminCount = users.filter((u) => u.role === "admin").length;
  const memberCount = users.filter((u) => u.role === "member").length;

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "🗂️ 관리실 홈", href: "/admin" },
          { label: "👥 회원 명부" },
        ]}
        right={
          <Link
            href="/admin/members/new"
            className="notion-icon-btn bg-[var(--color-notion-accent)] text-white hover:bg-[#1a6dbf]"
          >
            + 새 회원
          </Link>
        }
      />

      <div className="px-12 pt-12 pb-24 max-w-[1080px] mx-auto">
        <div className="text-7xl mb-3 leading-none select-none">👥</div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          회원 명부
        </h1>
        <p className="text-[var(--color-notion-mute)] text-base mb-6 max-w-2xl">
          회원 계정과 권한을 관리합니다. 권한이 <b>관리자</b>인 사람만
          이 관리실에 들어올 수 있고, <b>회원</b>은 회원 전용 글(회의록 등)을
          볼 수 있습니다.
        </p>

        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm mb-8">
          <Prop k="총" v={`${users.length}명`} />
          <Prop k="관리자" v={`${adminCount}명`} />
          <Prop k="회원" v={`${memberCount}명`} />
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="notion-table min-w-[1020px]">
            <thead>
              <tr>
                <Th w="160">👤 이름</Th>
                <Th w="120">🔑 아이디</Th>
                <Th w="100">🏷 권한</Th>
                <Th w="200">✉️ 이메일</Th>
                <Th w="110">🔐 로그인</Th>
                <Th w="110">📅 가입일</Th>
                <Th w="100"> </Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = me?.id === u.id;
                return (
                  <tr key={u.id}>
                    <td>
                      <Link
                        href={`/admin/members/${u.id}/edit`}
                        className="font-medium hover:underline"
                      >
                        {u.name}
                      </Link>
                      {isMe && (
                        <span className="ml-2 notion-tag tag-blue">나</span>
                      )}
                    </td>
                    <td className="font-mono text-xs">{u.username}</td>
                    <td>
                      {u.role === "admin" ? (
                        <span className="notion-tag tag-purple">관리자</span>
                      ) : (
                        <span className="notion-tag tag-gray">회원</span>
                      )}
                    </td>
                    <td className="text-xs text-[var(--color-notion-mute)] font-mono truncate max-w-[200px]">
                      {u.email ?? <span className="opacity-50">—</span>}
                    </td>
                    <td>
                      <ProviderTag provider={u.auth_provider} />
                    </td>
                    <td className="text-[var(--color-notion-mute)]">
                      {u.joined_at ?? "—"}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/admin/members/${u.id}/edit`}
                          className="notion-icon-btn"
                        >
                          편집
                        </Link>
                        {!isMe && (
                          <ConfirmDelete
                            action={deleteMemberAction}
                            hidden={{ id: u.id }}
                            message={`${u.name} 회원을 삭제할까요?`}
                            className="notion-icon-btn text-[#c4554d] hover:bg-[#ffe2dd]"
                          >
                            삭제
                          </ConfirmDelete>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan={7}
                  className="text-xs text-[var(--color-notion-mute)] py-2"
                >
                  COUNT {users.length}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}

function Th({ children, w }: { children: React.ReactNode; w?: string }) {
  return <th style={{ width: w ? `${w}px` : undefined }}>{children}</th>;
}

function ProviderTag({ provider }: { provider: string }) {
  if (provider === "google") {
    return <span className="notion-tag tag-blue">Google</span>;
  }
  if (provider === "naver") {
    return <span className="notion-tag tag-green">Naver</span>;
  }
  return <span className="notion-tag tag-gray">로컬</span>;
}

function Prop({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[var(--color-notion-mute)]">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
