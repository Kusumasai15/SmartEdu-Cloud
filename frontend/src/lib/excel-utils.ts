import * as XLSX from "xlsx";

export interface ExcelColumnOption {
  header: string;
  key: string;
  width?: number;
}

/**
 * Export arbitrary JSON objects to a modern .xlsx Excel spreadsheet file
 * and trigger immediate browser download.
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  sheetName: string = "Sheet1",
  columnOptions?: ExcelColumnOption[]
): void {
  if (!data || data.length === 0) {
    throw new Error("No data available to export to Excel.");
  }

  // If specific columns mapping provided, format data rows accordingly
  let exportRows: any[] = data;
  if (columnOptions && columnOptions.length > 0) {
    exportRows = data.map((item) => {
      const row: Record<string, any> = {};
      columnOptions.forEach((col) => {
        row[col.header] = item[col.key] !== undefined && item[col.key] !== null ? item[col.key] : "";
      });
      return row;
    });
  }

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(exportRows);

  // Auto-fit column widths based on content
  const colWidths: { wch: number }[] = [];
  const sample = exportRows.slice(0, 50);
  const keys = Object.keys(exportRows[0] || {});

  keys.forEach((key, colIndex) => {
    let maxLen = key.toString().length;
    sample.forEach((row) => {
      const cellVal = row[key];
      if (cellVal !== undefined && cellVal !== null) {
        const len = cellVal.toString().length;
        if (len > maxLen) maxLen = len;
      }
    });
    // Cap column width between 10 and 45 characters
    colWidths[colIndex] = { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
  });
  worksheet["!cols"] = colWidths;

  // Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Write array buffer
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const cleanFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  anchor.href = url;
  anchor.download = cleanFilename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

/**
 * Export data to a standard CSV file and trigger browser download.
 */
export function exportToCsv<T extends Record<string, any>>(
  data: T[],
  filename: string,
  sheetName: string = "Sheet1"
): void {
  if (!data || data.length === 0) {
    throw new Error("No data available to export to CSV.");
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const cleanFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  anchor.href = url;
  anchor.download = cleanFilename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

/**
 * Parse an uploaded .xlsx, .xls, or .csv spreadsheet file into structured JSON objects.
 */
export async function importFromExcel<T = Record<string, any>>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          throw new Error("Unable to read spreadsheet file.");
        }

        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new Error("The uploaded spreadsheet contains no worksheets.");
        }

        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<T>(worksheet, { defval: "" });
        resolve(json);
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Failed to parse spreadsheet."));
      }
    };

    reader.onerror = () => {
      reject(new Error("File reading error occurred."));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generate a downloadable Excel blank template with specified columns
 * so users can populate it and re-upload.
 */
export function downloadExcelTemplate(
  columns: string[],
  sampleRows: Record<string, any>[],
  filename: string,
  sheetName: string = "ImportTemplate"
): void {
  const data = sampleRows.length > 0 ? sampleRows : [
    columns.reduce((acc, col) => {
      acc[col] = "";
      return acc;
    }, {} as Record<string, any>)
  ];
  exportToExcel(data, filename, sheetName);
}
