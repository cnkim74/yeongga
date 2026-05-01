import { EmptyDbPage } from "@/components/admin/EmptyDbPage";

export default function AdminSettings() {
  return (
    <EmptyDbPage
      icon="⚙️"
      title="설정"
      crumbLabel="⚙️ 설정"
      description="공개 사이트 메타데이터·연도 표기·기본 글자 크기 등을 한곳에서 조정하기 위한 자리입니다. 추후 다음 호 표지 이미지 교체 도구도 이 화면에서 함께 다룹니다."
    />
  );
}
