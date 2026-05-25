import { requireAuth } from "@/lib/auth-utils";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building2 } from "lucide-react";

export default async function DashboardPage() {
  const user = await requireAuth();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user.name?.split(" ")[0] ?? "there"}</h1>
          <p className="text-muted-foreground text-sm mt-1">{user.email}</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button type="submit" variant="outline" size="sm">Sign out</Button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/properties"
          className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
        >
          <Building2 className="size-8 text-muted-foreground" />
          <div>
            <p className="font-medium">Properties</p>
            <p className="text-sm text-muted-foreground">Manage your properties</p>
          </div>
        </Link>
      </div>

      <p className="text-xs text-muted-foreground">
        More features coming soon — Transactions, Reports, and more.
      </p>
    </div>
  );
}
