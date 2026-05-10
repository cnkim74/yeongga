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
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={bg.image_path}
      alt=""
      aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
      style={{ opacity: bg.opacity, objectPosition: posMap[bg.position] ?? "center center" }}
    />
  );
}
