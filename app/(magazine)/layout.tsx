import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function MagazineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
