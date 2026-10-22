import * as XLSX from "xlsx";
export { importFromExcel, downloadExcelTemplate } from "./excel-utils";

/**
 * Universal Report Export Utility for UniFlow University LMS.
 * Supports clean formatted Excel (.xlsx format), CSV, and printable PDF reports with official university styling.
 */

export interface ExportColumn<T = any> {
  header: string;
  key: keyof T | string;
  render?: (row: T) => string | number;
}

function notifyUser(message: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app-toast", { detail: { message } }));
    console.warn("[Report Export]:", message);
  }
}

/**
 * Exports tabular data to an authentic .xlsx Excel workbook file with auto-fitted columns.
 */
export function exportToExcel<T = any>(
  filename: string,
  data: T[],
  columns: ExportColumn<T>[]
) {
  if (!data || data.length === 0) {
    notifyUser("No data available to export.");
    return;
  }

  // Format rows using column definitions
  const formattedRows = data.map((row) => {
    const item: Record<string, any> = {};
    columns.forEach((col) => {
      let val: any = "";
      if (col.render) {
        val = col.render(row);
      } else if (typeof col.key === "string" && col.key in (row as any)) {
        val = (row as any)[col.key];
      }
      item[col.header] = val !== null && val !== undefined ? val : "";
    });
    return item;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedRows);

  // Auto-fit column widths
  const colWidths = columns.map((col) => {
    let maxLen = col.header.length;
    formattedRows.slice(0, 100).forEach((r) => {
      const v = String(r[col.header] || "");
      if (v.length > maxLen) maxLen = v.length;
    });
    return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
  });
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

  const cleanFilename = filename.endsWith(".xlsx")
    ? filename
    : `${filename.replace(/\.[^/.]+$/, "")}_${new Date().toISOString().split("T")[0]}.xlsx`;

  XLSX.writeFile(workbook, cleanFilename);
}

/**
 * Generates an official University LMS PDF report via formatted print window.
 */
export function exportToPdf<T = any>(
  title: string,
  data: T[],
  columns: ExportColumn<T>[],
  metadata?: {
    subtitle?: string;
    department?: string;
    academicTerm?: string;
    generatedBy?: string;
  }
) {
  if (!data || data.length === 0) {
    notifyUser("No data available to generate PDF.");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    notifyUser("Please allow popups to generate PDF reports.");
    return;
  }

  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const tableHeaders = columns.map((c) => `<th style="padding: 10px 12px; border-bottom: 2px solid #5E48E8; text-align: left; font-size: 11px; text-transform: uppercase; color: #1E1B4B; background: #F8FAFD;">${c.header}</th>`).join("");

  const tableRows = data
    .map((row, idx) => {
      const bg = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFD";
      const cells = columns
        .map((col) => {
          let val: any = "";
          if (col.render) {
            val = col.render(row);
          } else if (typeof col.key === "string" && col.key in (row as any)) {
            val = (row as any)[col.key];
          }
          if (val === null || val === undefined) val = "-";
          return `<td style="padding: 10px 12px; border-bottom: 1px solid #EAEFF5; font-size: 12px; color: #334155;">${val}</td>`;
        })
        .join("");
      return `<tr style="background: ${bg};">${cells}</tr>`;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} — UniFlow Official Academic Report</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0;
            padding: 30px;
            color: #1E2438;
            background: #FFFFFF;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 3px solid #5E48E8;
            padding-bottom: 18px;
            margin-bottom: 24px;
          }
          .logo-area {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo-box {
            background: #5E48E8;
            color: white;
            font-weight: 800;
            font-size: 18px;
            padding: 8px 14px;
            border-radius: 12px;
            letter-spacing: -0.5px;
          }
          .univ-title {
            font-size: 18px;
            font-weight: 800;
            color: #1E1B4B;
            margin: 0;
            line-height: 1.2;
          }
          .univ-sub {
            font-size: 10px;
            font-weight: 700;
            color: #8B95B5;
            letter-spacing: 1.5px;
            text-transform: uppercase;
          }
          .meta-box {
            text-align: right;
            font-size: 11px;
            color: #64748B;
          }
          .meta-box strong {
            color: #1E1B4B;
          }
          .report-info {
            background: #F8FAFD;
            border: 1px solid #EAEFF5;
            border-radius: 14px;
            padding: 14px 18px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .report-title {
            font-size: 16px;
            font-weight: 700;
            color: #1E1B4B;
            margin: 0 0 4px 0;
          }
          .report-sub {
            font-size: 12px;
            color: #64748B;
            margin: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            margin-bottom: 30px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 16px;
            border-top: 1px solid #EAEFF5;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #94A3B8;
          }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: 700;
            background: #EDE9FE;
            color: #5E48E8;
          }
          @media print {
            body { padding: 15px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-area">
            <div class="logo-box">UniFlow</div>
            <div>
              <p class="univ-title">UniFlow University</p>
              <span class="univ-sub">Official Academic LMS Cloud Report</span>
            </div>
          </div>
          <div class="meta-box">
            <p style="margin: 0 0 3px 0;">Generated: <strong>${dateStr}</strong></p>
            <p style="margin: 0;">Author: <strong>${metadata?.generatedBy || "UniFlow Academic Directorate"}</strong></p>
          </div>
        </div>

        <div class="report-info">
          <div>
            <h2 class="report-title">${title}</h2>
            <p class="report-sub">${metadata?.subtitle || "Certified Academic Operational Data Summary"}</p>
          </div>
          <div>
            <span class="badge">${metadata?.academicTerm || "Fall 2026 Term"}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="footer">
          <span>Official University Document • Document Verification ID: UNIFLOW-${Date.now().toString(36).toUpperCase()}</span>
          <span>Page 1 of 1 • System Generated</span>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 400);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
