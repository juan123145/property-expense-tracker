import { requireAuth } from "@/lib/auth-utils";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const user = await requireAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Welcome, {user.name ?? user.email}</h1>
      <p className="text-muted-foreground text-sm">User ID: {user.id}</p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  );
}
