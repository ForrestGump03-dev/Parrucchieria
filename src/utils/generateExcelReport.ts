import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

export const generateExcelReport = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reportData: any[],
  rangeLabel: string,
  startDate: Date,
  endDate: Date
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Root Manager';
  workbook.lastModifiedBy = 'Root Manager';
  workbook.created = new Date();
  
  const sheet = workbook.addWorksheet('Report Vendite', {
    views: [{ showGridLines: false }]
  });

  // Setup Colonne per il dettaglio
  sheet.columns = [
    { header: '', key: 'margin', width: 2 }, // Margine lato
    { header: 'Data', key: 'date', width: 15 },
    { header: 'Cliente', key: 'client', width: 25 },
    { header: 'Staff', key: 'staff', width: 20 },
    { header: 'Trattamento', key: 'treatment', width: 30 },
    { header: 'Prezzo', key: 'price', width: 15 },
    { header: 'Note', key: 'notes', width: 35 },
  ];

  // ==========================================
  // INTESTAZIONE REPORT
  // ==========================================
  sheet.mergeCells('B2:G3');
  const titleCell = sheet.getCell('B2');
  titleCell.value = 'REPORT VENDITE DEL SALONE';
  titleCell.font = { name: 'Arial', size: 20, bold: true, color: { argb: 'FF1E40AF' } }; // Indigo-800
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E7FF' } // Indigo-50
  };
  titleCell.border = {
    top: { style: 'thin', color: { argb: 'FFC7D2FE' } },
    left: { style: 'thin', color: { argb: 'FFC7D2FE' } },
    bottom: { style: 'thin', color: { argb: 'FFC7D2FE' } },
    right: { style: 'thin', color: { argb: 'FFC7D2FE' } },
  };

  sheet.mergeCells('B4:G4');
  const periodCell = sheet.getCell('B4');
  periodCell.value = `Periodo di Riferimento: ${rangeLabel} (${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')})`;
  periodCell.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF475569' } };
  periodCell.alignment = { horizontal: 'center' };

  // ==========================================
  // RIEPILOGO STATISTICHE
  // ==========================================
  const totalRevenue = reportData.reduce((acc, curr) => acc + (curr.price || 0), 0);
  const totalAppointments = reportData.length;
  const uniqueClients = new Set(reportData.map(r => r.clients ? r.clients.id : 'unknown')).size;
  
  sheet.addRow([]);
  
  // Header Riepilogo
  sheet.mergeCells('B6:G6');
  const summaryHeader = sheet.getCell('B6');
  summaryHeader.value = ' RIEPILOGO DEL PERIODO';
  summaryHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summaryHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }; // Blue 500
  summaryHeader.alignment = { vertical: 'middle' };

  // Riga Statistiche
  const statsRow = sheet.addRow(['', 'Totale Appuntamenti:', totalAppointments, 'Totale Incassato:', `€ ${totalRevenue.toFixed(2)}`, 'Clienti Unici:', uniqueClients]);
  statsRow.font = { bold: true };
  statsRow.getCell(3).alignment = { horizontal: 'left' };
  statsRow.getCell(5).alignment = { horizontal: 'left' };
  statsRow.getCell(5).font = { bold: true, color: { argb: 'FF059669' } }; // Green 600
  statsRow.getCell(7).alignment = { horizontal: 'left' };
  
  // Bordi riepilogo
  ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
    sheet.getCell(`${col}7`).border = { bottom: { style: 'medium', color: { argb: 'FF3B82F6' } } };
  });

  sheet.addRow([]);
  sheet.addRow([]);

  // ==========================================
  // DETTAGLIO VENDITE
  // ==========================================
  sheet.mergeCells('B10:G10');
  const detailHeader = sheet.getCell('B10');
  detailHeader.value = ' DETTAGLIO APPUNTAMENTI';
  detailHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  detailHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; // Indigo 600
  detailHeader.alignment = { vertical: 'middle' };

  // Header Colonne
  const headerRow = sheet.addRow(['', 'Data', 'Cliente', 'Staff', 'Trattamento', 'Prezzo', 'Note']);
  headerRow.font = { bold: true, color: { argb: 'FF1E293B' } };
  headerRow.eachCell((cell, colNumber) => {
    if (colNumber > 1) { // Salta il margine
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    }
  });

  // Dati
  reportData.forEach((a) => {
    const dDate = new Date(a.date);
    const row = sheet.addRow([
      '',
      format(dDate, 'dd/MM/yyyy'),
      a.clients ? `${a.clients.first_name} ${a.clients.last_name}` : 'Cliente Eliminato',
      a.staff_members ? a.staff_members.name : '-',
      a.treatment,
      `€ ${a.price.toFixed(2)}`,
      a.notes || ''
    ]);

    // Stile righe alternate
    const isEven = row.number % 2 === 0;
    row.eachCell((cell, colNumber) => {
      if (colNumber > 1) {
        cell.alignment = { vertical: 'middle' };
        if (isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
        cell.border = {
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      }
    });

    // Colora di verde il prezzo (ora in colonna 6)
    row.getCell(6).font = { color: { argb: 'FF059669' }, bold: true };
    row.getCell(6).alignment = { horizontal: 'right' };
  });

  // Genera Buffer e Salva
  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm');
  const rangeLabelFormatted = rangeLabel.replace(/\s+/g, '_');
  const fileName = `Report_Vendite_${rangeLabelFormatted}_${dateStr}.xlsx`;
  
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, fileName);
};
