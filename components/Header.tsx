import { getCurrentUser } from "@/lib/auth";
import { HeaderClient } from "./HeaderClient";

export async function Header() {
  const user = await getCurrentUser();
  return <HeaderClient user={user} />;
}
