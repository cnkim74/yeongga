import { EmptyDbPage } from "@/components/admin/EmptyDbPage";

export default function AdminArticles() {
  return (
    <EmptyDbPage
      icon="📝"
      title="글 관리"
      crumbLabel="📝 글 관리"
      description="장(章)별 마크다운 글을 한곳에서 살펴보고 편집하기 위한 데이터베이스 자리입니다. 현재는 content/articles/ 폴더가 곧 저장소이며, 추후 이 화면에서 직접 편집할 수 있도록 잇습니다."
    />
  );
}
