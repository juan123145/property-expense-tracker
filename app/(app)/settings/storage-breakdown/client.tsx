"use client";

import Link from "next/link";
import { formatBytes } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Image as ImageIcon, HardDrive } from "lucide-react";

interface Attachment {
  id: string;
  fileName: string;
  sizeBytes: number | null;
  contentType: string | null;
  propertyId: string | null;
  createdAt: Date | null;
}

interface StorageBreakdownClientProps {
  attachments: Attachment[];
  byType: Record<string, { count: number; totalBytes: number }>;
  usedKb: number;
  quotaKb: number;
}

const typeIcons: Record<string, React.ComponentType<any>> = {
  "application/pdf": FileText,
  "image/jpeg": ImageIcon,
  "image/png": ImageIcon,
  "image/webp": ImageIcon,
};

const typeLabels: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPEG Image",
  "image/png": "PNG Image",
  "image/webp": "WebP Image",
};

export function StorageBreakdownClient({
  attachments,
  byType,
  usedKb,
  quotaKb,
}: StorageBreakdownClientProps) {
  const percentUsed = (usedKb / quotaKb) * 100;
  const remainingKb = quotaKb - usedKb;

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Settings
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Storage Breakdown</h1>
      </div>

      {/* Overall Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Usage</CardTitle>
          <CardDescription>
            Only attachment file sizes count toward your quota (transaction database entries do not)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{formatBytes(usedKb * 1024)} used</span>
              <span>{formatBytes(quotaKb * 1024)} total</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  percentUsed > 90
                    ? "bg-red-500"
                    : percentUsed > 70
                      ? "bg-yellow-500"
                      : "bg-green-500"
                }`}
                style={{ width: `${Math.min(percentUsed, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">
              {percentUsed.toFixed(1)}% used • {formatBytes(remainingKb * 1024)} remaining
            </p>
          </div>
        </CardContent>
      </Card>

      {/* By Type */}
      <Card>
        <CardHeader>
          <CardTitle>Storage by File Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(byType).map(([type, { count, totalBytes }]) => {
              const Icon = typeIcons[type] || HardDrive;
              const label = typeLabels[type] || type;
              const percentage = (totalBytes / (usedKb * 1024)) * 100;

              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{label}</span>
                      <span className="text-sm text-gray-500">({count} files)</span>
                    </div>
                    <span className="text-sm font-medium">{formatBytes(totalBytes)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      <Card>
        <CardHeader>
          <CardTitle>All Attachments</CardTitle>
          <CardDescription>
            Showing {attachments.length} file{attachments.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {attachments.length === 0 ? (
              <p className="text-sm text-gray-500">No attachments</p>
            ) : (
              attachments.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm p-2 hover:bg-gray-50 rounded">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a.fileName.split("/").pop()}</p>
                    <p className="text-xs text-gray-500">
                      {a.contentType || "unknown"} • {a.createdAt?.toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-gray-600 ml-2 flex-shrink-0">
                    {formatBytes(a.sizeBytes ?? 0)}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
