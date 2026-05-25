import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Call at the top of any Server Component or Server Action that needs auth.
 * Returns the session user or redirects to /login.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user as { id: string; name?: string | null; email?: string | null; image?: string | null };
}
