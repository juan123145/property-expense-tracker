"use client";

import { useState, useTransition } from "react";
import { completeOnboarding } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

type Props = {
  user: { name?: string | null; email?: string | null; image?: string | null };
};

export function OnboardingClient({ user }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await completeOnboarding(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <Card className="w-full max-w-md space-y-6 p-8">
        <div>
          <h1 className="text-2xl font-bold">Welcome to Property Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">Complete your profile to get started</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={user.name ?? ""}
              placeholder="John Doe"
              required
              disabled={isPending}
            />
          </div>

          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              placeholder="john_doe"
              pattern="[a-zA-Z0-9_]+"
              minLength={3}
              maxLength={20}
              required
              disabled={isPending}
              help="3-20 characters, letters/numbers/underscore only"
            />
            <p className="text-xs text-muted-foreground mt-1">Letters, numbers, and underscores only</p>
          </div>

          <div>
            <Label htmlFor="email">Email (read-only)</Label>
            <Input
              id="email"
              value={user.email ?? "Not provided"}
              disabled
              className="bg-muted"
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              disabled={isPending}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Saving..." : "Complete Profile"}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          You can update these details anytime in Settings
        </p>
      </Card>
    </div>
  );
}
