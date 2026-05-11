import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { getArticleById } from "@/lib/articles-db";
import { getTagsForArticle } from "@/lib/tags-db";
import { ArticleForm } from "../../ArticleForm";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [article, tags] = await Promise.all([
    getArticleById(Number(id)),
    getTagsForArticle(Number(id)),
  ]);
  if (!article) notFound();

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: "집무실 홈", href: "/admin" },
          { label: "📝 글 관리", href: "/admin/articles" },
          { label: "편집" },
        ]}
      />
      <div className="px-12 pt-12 pb-24 max-w-[960px] mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-8">글 편집</h1>
        <ArticleForm article={article} initialTags={tags} />
      </div>
    </>
  );
}
