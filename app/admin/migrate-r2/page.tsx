import { requireAdmin } from "@/lib/auth";
import { MigrateR2Client } from "./MigrateR2Client";

export const dynamic = "force-dynamic";

export const metadata = { title: "Blob → R2 마이그레이션 — 영가회" };

export default async function MigrateR2Page() {
  await requireAdmin();
  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="font-serif text-2xl mb-2 text-[var(--admin-ink)]">
        Blob → R2 일괄 마이그레이션
      </h1>
      <p className="text-sm text-[var(--admin-mute)] mb-8 leading-relaxed">
        기존 Vercel Blob 에 올라가 있던 모든 파일을 Cloudflare R2 로 옮기고,
        데이터베이스 안의 URL 도 새 도메인으로 일괄 갱신합니다. 한 번만
        실행하면 끝나며, 중간에 끊겨도 다시 누르면 이어 작업합니다.
      </p>
      <MigrateR2Client />
    </div>
  );
}
