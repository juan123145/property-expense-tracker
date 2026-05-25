"use client";

import Link from "next/link";
import {
  TrendingDown, TrendingUp, AlertTriangle, Tag,
  Building2, ArrowRight, Receipt,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { getCategoryBadgeClass, CATEGORIES } from "@/lib/categories";

// ─── Types ────────────────────────────────────────────────────────────────────

type Summary = {
  expensesMonth: number;
  expensesYear: number;
  incomeMonth: number;
  incomeYear: number;
  topCategory: string | null;
  topCategoryAmount: number;
  needsReviewCount: number;
};

type PropertyTotal = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  type: string | null;
  imageUrl: string | null;
  expensesMonth: number;
  expensesYear: number;
};

type CategoryBar = { category: string; total: number };

type RecentTx = {
  id: string;
  date: string;
  amount: string;
  type: string;
  payee: string | null;
  category: string | null;
  propertyName: string | null;
};

type Props = {
  userName: string;
  currentMonth: string;
  summary: Summary;
  propertyTotals: PropertyTotal[];
  categoryChart: CategoryBar[];
  recentTransactions: RecentTx[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}/${y}`;
}

function getCategoryColor(category: string): string {
  const cat = CATEGORIES.find((c) => c.name === category);
  if (!cat) return "#94a3b8";
  const cls = cat.badgeClass;
  if (cls.includes("green")) return "#16a34a";
  if (cls.includes("zinc")) return "#71717a";
  if (cls.includes("blue")) return "#2563eb";
  if (cls.includes("orange")) return "#ea580c";
  if (cls.includes("purple")) return "#9333ea";
  if (cls.includes("yellow")) return "#ca8a04";
  if (cls.includes("red")) return "#dc2626";
  if (cls.includes("cyan")) return "#0891b2";
  if (cls.includes("indigo")) return "#4f46e5";
  if (cls.includes("amber")) return "#d97706";
  if (cls.includes("pink")) return "#db2777";
  if (cls.includes("slate")) return "#64748b";
  return "#94a3b8";
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, sub, icon: Icon, iconColor, href,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border bg-card p-5 space-y-3 h-full">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${iconColor}`}>
          <Icon className="size-4.5" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-80 transition-opacity">
        {inner}
      </Link>
    );
  }
  return inner;
}

// ─── Custom bar chart tooltip ─────────────────────────────────────────────────

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: CategoryBar }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-sm">
      <p className="font-medium">{d.category}</p>
      <p className="text-muted-foreground">${fmt(d.total)}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DashboardClient({
  userName, currentMonth, summary, propertyTotals, categoryChart, recentTransactions,
}: Props) {
  const netMonth = summary.incomeMonth - summary.expensesMonth;
  const netYear = summary.incomeYear - summary.expensesYear;

  return (
    <div className="p-4 md:p-6 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {userName}</h1>
        <p className="text-sm text-muted-foreground mt-1">{currentMonth}</p>
      </div>

      {/* ── Summary cards (2×2 on mobile, 4 across on desktop) ── */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <SummaryCard
            label="Expenses this month"
            value={`$${fmt(summary.expensesMonth)}`}
            sub={`$${fmt(summary.expensesYear)} this year`}
            icon={TrendingDown}
            iconColor="bg-red-100 text-red-600"
          />
          <SummaryCard
            label="Income this month"
            value={`$${fmt(summary.incomeMonth)}`}
            sub={`$${fmt(summary.incomeYear)} this year`}
            icon={TrendingUp}
            iconColor="bg-green-100 text-green-600"
          />
          <SummaryCard
            label="Net this month"
            value={`${netMonth >= 0 ? "+" : "-"}$${fmt(Math.abs(netMonth))}`}
            sub={`${netYear >= 0 ? "+" : "-"}$${fmt(Math.abs(netYear))} this year`}
            icon={netMonth >= 0 ? TrendingUp : TrendingDown}
            iconColor={netMonth >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}
          />
          <SummaryCard
            label={summary.needsReviewCount > 0 ? "Needs Review" : "Top Category"}
            value={
              summary.needsReviewCount > 0
                ? `${summary.needsReviewCount} item${summary.needsReviewCount !== 1 ? "s" : ""}`
                : summary.topCategory
                ? `$${fmt(summary.topCategoryAmount)}`
                : "—"
            }
            sub={
              summary.needsReviewCount > 0
                ? "Tap to resolve"
                : summary.topCategory ?? undefined
            }
            icon={summary.needsReviewCount > 0 ? AlertTriangle : Tag}
            iconColor={summary.needsReviewCount > 0 ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}
            href={summary.needsReviewCount > 0 ? "/transactions" : undefined}
          />
        </div>
      </section>

      {/* ── Properties ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-base">Properties</h2>
          <Link href="/properties" className="text-xs text-primary flex items-center gap-1 hover:underline">
            View all <ArrowRight className="size-3" />
          </Link>
        </div>

        {propertyTotals.length === 0 ? (
          <Link
            href="/properties"
            className="flex items-center gap-4 p-5 rounded-xl border-2 border-dashed bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
              <Building2 className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">Add your first property</p>
              <p className="text-xs text-muted-foreground mt-0.5">Track expenses per property and unit</p>
            </div>
            <ArrowRight className="size-4 text-muted-foreground ml-auto" />
          </Link>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {propertyTotals.map((p) => (
              <Link
                key={p.id}
                href={`/properties/${p.id}`}
                className="group rounded-xl border bg-card overflow-hidden hover:shadow-md transition-all"
              >
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} className="w-full h-28 object-cover" />
                ) : (
                  <div className="w-full h-28 bg-muted flex items-center justify-center">
                    <Building2 className="size-8 text-muted-foreground/40" />
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <div>
                    <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{p.name}</p>
                    {(p.address || p.city) && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {[p.address, p.city, p.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-muted/50 px-3 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">This month</p>
                      <p className="text-sm font-bold text-red-600 mt-0.5">${fmt(p.expensesMonth)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 px-3 py-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">This year</p>
                      <p className="text-sm font-bold text-red-600 mt-0.5">${fmt(p.expensesYear)}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Chart + Recent Transactions (side by side on desktop) ── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Bar chart */}
        <section>
          <h2 className="font-semibold text-base mb-3">Expenses by Category — This Month</h2>
          {categoryChart.length === 0 ? (
            <div className="rounded-xl border bg-muted/30 flex flex-col items-center justify-center py-14 text-center gap-2">
              <Tag className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No expenses recorded this month yet</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-4">
              <ResponsiveContainer width="100%" height={Math.max(180, categoryChart.length * 40)}>
                <BarChart
                  data={categoryChart}
                  layout="vertical"
                  margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
                  barSize={16}
                >
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={120}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {categoryChart.map((entry) => (
                      <Cell key={entry.category} fill={getCategoryColor(entry.category)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Recent transactions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base">Recent Transactions</h2>
            <Link href="/transactions" className="text-xs text-primary flex items-center gap-1 hover:underline">
              View all <ArrowRight className="size-3" />
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="rounded-xl border bg-muted/30 flex flex-col items-center justify-center py-14 text-center gap-2">
              <Receipt className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card divide-y">
              {recentTransactions.map((tx) => (
                <Link
                  key={tx.id}
                  href="/transactions"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {tx.payee ?? <span className="text-muted-foreground italic">No payee</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{fmtDate(tx.date)}</span>
                      {tx.category && (
                        <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${getCategoryBadgeClass(tx.category)}`}>
                          {tx.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums shrink-0 ${tx.type === "income" ? "text-green-600" : "text-red-600"}`}>
                    {tx.type === "income" ? "+" : "-"}${fmt(parseFloat(tx.amount))}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
