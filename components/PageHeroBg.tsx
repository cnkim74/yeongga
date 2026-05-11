import Image from "next/image";
import { getPageBackground } from "@/lib/backgrounds-db";

export async function PageHeroBg({ page }: { page: string }) {
  const bg = await getPageBackground(page);
  if (!bg || !bg.active || !bg.image_path) return null;

  const posMap: Record<string, string> = {
    center: "center center",
    top: "center top",
    bottom: "center bottom",
    left: "left center",
    right: "right center",
  };

  return (
    <Image
      src={bg.image_path}
      alt=""
      fill
      sizes="100vw"
      priority
      aria-hidden="true"
      className="select-none pointer-events-none"
      style={{
        opacity: bg.opacity,
        objectFit: "cover",
        objectPosition: posMap[bg.position] ?? "center center",
      }}
    />
  );
}
