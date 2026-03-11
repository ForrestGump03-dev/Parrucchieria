import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createCsvString(rows: object[]): string | null {
  if (!rows || !rows.length) {
    return null;
  }
  const separator = ',';
  const keys = Object.keys(rows[0]);
  return keys.join(separator) +
    '\n' +
    rows.map(row => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = row as any;
      return keys.map(k => {
        let cell = r[k] === null || r[k] === undefined ? '' : r[k];
        cell = cell instanceof Date
          ? cell.toLocaleString()
          : cell.toString().replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(separator);
    }).join('\n');
}

export function exportToCsv(filename: string, rows: object[]) {
  const csvContent = createCsvString(rows);
  if (!csvContent) {
    console.warn("ExportToCsv: Nessun dato da esportare");
    return false;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  
  // Programmatic click
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  // URL.revokeObjectURL(url); // Often safer to let GC handle it to avoid premature revocation issues in some envs
  return true;
}
