'use client';

import { useEffect, useState } from 'react';
import { getUserQuotaStatus } from '@/app/actions/quota';
import { HardDrive, AlertCircle, AlertTriangle } from 'lucide-react';

export function QuotaProgressBar() {
  const [quota, setQuota] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getUserQuotaStatus();
        if (data.error) {
          setError(data.error);
        } else {
          setQuota(data);
        }
      } catch (e) {
        console.error('Failed to load quota:', e);
        setError('Failed to load quota information');
      } finally {
        setLoading(false);
      }
    }
    load();

    // Refresh quota every 30 seconds
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="h-2 bg-muted rounded-full" />
      </div>
    );
  }

  if (error || !quota) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
        <AlertCircle className="size-4" />
        <span>Quota information unavailable</span>
      </div>
    );
  }

  const getProgressColor = (percent: number) => {
    if (percent >= 95) return 'bg-destructive';
    if (percent >= 80) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getTextColor = (percent: number) => {
    if (percent >= 95) return 'text-destructive';
    if (percent >= 80) return 'text-amber-600';
    return 'text-green-600';
  };

  const getBgColor = (percent: number) => {
    if (percent >= 95) return 'bg-destructive/10';
    if (percent >= 80) return 'bg-amber-50 dark:bg-amber-950/20';
    return 'bg-green-50 dark:bg-green-950/20';
  };

  return (
    <div className={`space-y-2 p-3 rounded-lg border ${getBgColor(quota.percentUsed)}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="size-4 text-muted-foreground" />
          <span className="font-medium text-sm">Storage Quota</span>
        </div>
        <span className={`text-sm font-semibold tabular-nums ${getTextColor(quota.percentUsed)}`}>
          {quota.formatUsed} / {quota.formatQuota}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 bg-white dark:bg-slate-900 rounded-full overflow-hidden border border-muted">
        <div
          className={`h-full ${getProgressColor(quota.percentUsed)} transition-all duration-300`}
          style={{ width: `${Math.min(quota.percentUsed, 100)}%` }}
        />
      </div>

      {/* Percentage */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          {quota.percentUsed}% used • {quota.formatRemaining} remaining
        </span>
      </div>

      {/* Warnings */}
      {quota.isCritical && (
        <div className="flex items-start gap-2 mt-2 p-2 bg-destructive/10 rounded border border-destructive/20">
          <AlertTriangle className="size-4 text-destructive mt-0.5 shrink-0" />
          <div className="text-xs text-destructive font-medium">
            <p>⚠️ 95% quota reached. Upload disabled.</p>
            <p className="mt-0.5 text-destructive/80">Delete attachments to free up space.</p>
          </div>
        </div>
      )}

      {quota.isWarning && !quota.isCritical && (
        <div className="flex items-start gap-2 mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            ⚠️ Warning: 80% quota used. Consider uploading less or deleting old attachments.
          </p>
        </div>
      )}
    </div>
  );
}
