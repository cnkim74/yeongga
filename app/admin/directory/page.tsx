import { requireAdmin } from "@/lib/auth";
import { getDirectoryMeta } from "@/lib/directory-db";
import { DirectoryForm } from "./DirectoryForm";

export const dynamic = "force-dynamic";

export default async function AdminDirectoryPage() {
  await requireAdmin();
  const meta = await getDirectoryMeta();
  const current = meta.count
    ? `${meta.count}명 · ${meta.label ?? ""} 기준`
    : "아직 없음";

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-xl font-semibold mb-2">회원 명단</h1>
      <p className="mb-8 text-sm leading-relaxed text-[var(--admin-mute)]">
        회원수첩 PDF 를 올리면 성명·한자·현직·경력만 읽어 명단을 갈아 끼웁니다.
        자택 주소와 생년, 전화번호는 읽는 단계에서 버리고 저장하지 않습니다.
      </p>
      <DirectoryForm current={current} />
    </div>
  );
}
