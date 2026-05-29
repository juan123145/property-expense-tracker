import Link from "next/link";
import { cn } from "@/lib/utils";

function LogoMark() {
  return (
    <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-primary shadow-sm">
      <svg
        viewBox="0 0 20 20"
        className="w-[18px] h-[18px] fill-primary-foreground"
        aria-hidden="true"
      >
        <polygon points="10,2 18,9 16,9 16,8 4,8 4,9 2,9" />
        <rect x="4" y="9" width="12" height="9" />
        <rect x="8" y="13" width="4" height="5" className="fill-primary" />
        <rect x="5.5" y="10.5" width="2.5" height="2" className="fill-primary" rx="0.3" />
        <rect x="12" y="10.5" width="2.5" height="2" className="fill-primary" rx="0.3" />
      </svg>
    </div>
  );
}

export function AppLogo({ className, collapsed = false }: { className?: string; collapsed?: boolean }) {
  return (
    <Link href="/dashboard" className={cn("flex items-center gap-2.5 hover:opacity-80 transition-opacity", className)}>
      <LogoMark />
      <div className={cn("flex flex-col leading-none", collapsed && "hidden")}>
        <span className="font-bold text-sm tracking-tight text-foreground">PropTrack</span>
        <span className="text-[9px] font-medium text-muted-foreground tracking-widest uppercase mt-0.5">
          Property Expenses
        </span>
      </div>
    </Link>
  );
}
