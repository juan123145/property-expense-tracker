"use client";

import { useState } from "react";
import { FileDown, Sheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/report-utils";

export type ExportColumn = { header: string; key: string; isCurrency?: boolean };
export type ExportRow = Record<string, string | number | null>;
export type ExportSection = { title: string; rows: ExportRow[]; totalsRow?: ExportRow };

type Props = {
  reportName: string;
  propertyLabel: string;
  periodLabel: string;
  sections: ExportSection[];
  columns: ExportColumn[];
};

function buildFilename(type: "pdf" | "xlsx", reportName: string, propertyLabel: string, periodLabel: string) {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug(reportName)}-${slug(propertyLabel || "all-properties")}-${slug(periodLabel)}.${type}`;
}

export function ExportButtons({ reportName, propertyLabel, periodLabel, sections, columns }: Props) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [xlsxLoading, setXlsxLoading] = useState(false);

  async function exportPdf() {
    setPdfLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(reportName, 40, 40);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120);
      doc.text(`${propertyLabel || "All Properties"} · ${periodLabel}`, 40, 56);
      doc.text(`Generated ${new Date().toLocaleDateString("en-US")}`, pageW - 40, 56, { align: "right" });
      doc.setTextColor(0);

      let startY = 72;

      for (const section of sections) {
        if (sections.length > 1) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(section.title, 40, startY);
          startY += 14;
        }

        const head = [columns.map((c) => c.header)];
        const body = section.rows.map((row) =>
          columns.map((c) => {
            const v = row[c.key];
            if (v == null) return "—";
            if (c.isCurrency) return `$${fmt(Number(v))}`;
            return String(v);
          })
        );

        if (section.totalsRow) {
          const totals = columns.map((c) => {
            const v = section.totalsRow![c.key];
            if (v == null) return "";
            if (c.isCurrency) return `$${fmt(Number(v))}`;
            return String(v);
          });
          body.push(totals);
        }

        autoTable(doc, {
          head,
          body,
          startY,
          styles: { fontSize: 8, cellPadding: 4 },
          headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: "bold" },
          didParseCell: (data) => {
            if (section.totalsRow && data.row.index === body.length - 1) {
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.fillColor = [240, 240, 240];
            }
          },
          margin: { left: 40, right: 40 },
        });

        startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
      }

      doc.save(buildFilename("pdf", reportName, propertyLabel, periodLabel));
    } finally {
      setPdfLoading(false);
    }
  }

  async function exportExcel() {
    setXlsxLoading(true);
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Property Expense Tracker";
      workbook.created = new Date();

      for (const section of sections) {
        const sheetName = section.title.slice(0, 31);
        const sheet = workbook.addWorksheet(sheetName);

        // Header row
        sheet.addRow([reportName]);
        sheet.addRow([`${propertyLabel || "All Properties"} · ${periodLabel}`]);
        sheet.addRow([`Generated ${new Date().toLocaleDateString("en-US")}`]);
        sheet.addRow([]);

        // Column headers
        const headerRow = sheet.addRow(columns.map((c) => c.header));
        headerRow.font = { bold: true };
        headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E1E1E" } };
        headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
        sheet.views = [{ state: "frozen", ySplit: 5 }];

        // Data rows
        for (const row of section.rows) {
          const values = columns.map((c) => {
            const v = row[c.key];
            if (v == null) return null;
            return c.isCurrency ? Number(v) : v;
          });
          const dataRow = sheet.addRow(values);
          columns.forEach((c, i) => {
            if (c.isCurrency) {
              dataRow.getCell(i + 1).numFmt = '$#,##0.00';
            }
          });
        }

        // Totals row
        if (section.totalsRow) {
          const totals = columns.map((c) => {
            const v = section.totalsRow![c.key];
            if (v == null) return null;
            return c.isCurrency ? Number(v) : v;
          });
          const totalsRow = sheet.addRow(totals);
          totalsRow.font = { bold: true };
          totalsRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } };
          columns.forEach((c, i) => {
            if (c.isCurrency) totalsRow.getCell(i + 1).numFmt = '$#,##0.00';
          });
        }

        // Auto-fit columns
        columns.forEach((_, i) => {
          sheet.getColumn(i + 1).width = 20;
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildFilename("xlsx", reportName, propertyLabel, periodLabel);
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setXlsxLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportPdf} disabled={pdfLoading} className="gap-1.5">
        <FileDown className="size-3.5" />
        {pdfLoading ? "Generating…" : "PDF"}
      </Button>
      <Button variant="outline" size="sm" onClick={exportExcel} disabled={xlsxLoading} className="gap-1.5">
        <Sheet className="size-3.5" />
        {xlsxLoading ? "Generating…" : "Excel"}
      </Button>
    </div>
  );
}
