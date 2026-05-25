import { cn } from "@/lib/utils";

export function AppLogo({ className, collapsed = false }: { className?: string; collapsed?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* Icon mark */}
      <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-primary shadow-sm">
        <svg
          viewBox="0 0 20 20"
          className="w-[18px] h-[18px] fill-primary-foreground"
          aria-hidden="true"
        >
          {/* Roof */}
          <polygon points="10,2 18,9 16,9 16,8 4,8 4,9 2,9" />
          {/* Walls */}
          <rect x="4" y="9" width="12" height="9" />
          {/* Door cutout — rendered as white inset on primary bg */}
          <rect x="8" y="13" width="4" height="5" className="fill-primary" />
          {/* Left window */}
          <rect x="5.5" y="10.5" width="2.5" height="2" className="fill-primary" rx="0.3" />
          {/* Right window */}
          <rect x="12" y="10.5" width="2.5" height="2" className="fill-primary" rx="0.3" />
        </svg>
      </div>

      {/* Wordmark */}
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="font-bold text-sm tracking-tight text-foreground">PropLedger</span>
          <span className="text-[9px] font-medium text-muted-foreground tracking-widest uppercase mt-0.5">
            Property Finance
          </span>
        </div>
      )}
    </div>
  );
}
