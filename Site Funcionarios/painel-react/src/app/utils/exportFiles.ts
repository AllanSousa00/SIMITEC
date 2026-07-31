import { buildInscricoesReportPdfBlob, type SimitecReportOptions } from '../reports/simitec/InscricoesReport';
import { SIMITEC_BRAND } from '../lib/brand';

export type ExportRow = Record<string, string | number | boolean | null | undefined>;
type ExportOptions = SimitecReportOptions & { fileName?: string };

const cleanFileName = (name: string) => name
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9-_]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .toLowerCase();

const cellValue = (value: ExportRow[string]) => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const sanitizeCsvCell = (value: string) => {
  const normalized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const trimmedStart = normalized.replace(/^[\s"';,]+/, '');
  return /^[=+\-@\t\n\r]/.test(trimmedStart) ? `'${normalized}` : normalized;
};

const csvEscape = (value: string) => `"${sanitizeCsvCell(value).replace(/"/g, '""')}"`;

const exportCsv = (rows: ExportRow[], title: string) => {
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(csvEscape).join(';'),
    ...rows.map(row => headers.map(header => csvEscape(cellValue(row[header]))).join(';')),
  ];
  downloadBlob(new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' }), `${cleanFileName(title)}.csv`);
};

const argb = (hex: string) => `FF${hex.replace('#', '').toUpperCase()}`;

export const buildInscricoesWorkbookBlob = async (rows: ExportRow[], title: string) => {
  const ExcelJSModule = await import('exceljs');
  const ExcelJS = ExcelJSModule.default || ExcelJSModule;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SIMITEC';
  workbook.subject = 'Exportação de inscrições';
  workbook.title = title || 'Inscrições SIMITEC';
  workbook.created = new Date();
  workbook.modified = new Date();

  const generatedAt = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const headers = Object.keys(rows[0]);
  const primary = argb(SIMITEC_BRAND.navy);
  const accent = argb(SIMITEC_BRAND.mint);
  const blue = argb(SIMITEC_BRAND.ocean);
  const softBlue = argb(SIMITEC_BRAND.softOcean);
  const softGreen = argb(SIMITEC_BRAND.softMint);
  const softAmber = argb(SIMITEC_BRAND.softSolar);
  const border = argb(SIMITEC_BRAND.border);
  const white = argb('#FFFFFF');
  const muted = argb(SIMITEC_BRAND.slate);
  const text = argb(SIMITEC_BRAND.text);

  const setBorder = (cell: any, color = border) => {
    cell.border = {
      top: { style: 'thin', color: { argb: color } },
      left: { style: 'thin', color: { argb: color } },
      bottom: { style: 'thin', color: { argb: color } },
      right: { style: 'thin', color: { argb: color } },
    };
  };

  const sheet = workbook.addWorksheet('Inscrições', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: true }],
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.25, right: 0.25, top: 0.45, bottom: 0.45, header: 0.2, footer: 0.2 },
    },
    properties: { tabColor: { argb: blue }, defaultRowHeight: 21 },
  });

  const orderedHeaders = [
    'ID', 'Códigos de inscrição', 'Códigos de credencial',
    'Nome', 'CPF', 'E-mail', 'Telefone', 'Tipo', 'Instituição', 'Curso/Turma',
    'Turno de estudo', 'Período da atividade', 'Cidade', 'UF', 'Atividades',
    'Inscrição', 'Credenciamento', 'Credenciado em', 'Operador', 'Inscrito em',
    'Grupo', 'Professor responsável', 'CPF do responsável', 'E-mail do responsável',
    'Telefone do responsável', 'Contato do responsável', 'Acessibilidade',
    'ID da instituição', 'Endereço da instituição', 'Google Maps da instituição',
    'Instituição verificada em',
  ].filter(header => headers.includes(header));
  headers.forEach(header => {
    if (!orderedHeaders.includes(header)) orderedHeaders.push(header);
  });

  const compactColumns = new Set(['ID', 'UF', 'Tipo', 'Inscrição', 'Credenciamento', 'Grupo']);
  const longTextColumns = new Set([
    'Instituição',
    'Atividades',
    'Endereço da instituição',
    'Google Maps da instituição',
    'Códigos de inscrição',
    'Códigos de credencial',
  ]);
  const minColumnWidth = (header: string) => compactColumns.has(header) ? 10 : 14;
  const maxColumnWidth = (header: string) => longTextColumns.has(header) ? 48 : header.includes('E-mail') ? 34 : header.includes('Telefone') ? 22 : 30;
  const measuredWidth = (header: string) => {
    const values = [header, ...rows.slice(0, 250).map(row => cellValue(row[header]))];
    const longest = Math.max(...values.map(value => {
      const lines = String(value || '').split(/\r?\n|,\s*/);
      return Math.max(...lines.map(line => line.length));
    }));
    const preferred = Math.ceil(longest * 1.05) + 3;
    return Math.max(minColumnWidth(header), Math.min(maxColumnWidth(header), preferred));
  };

  orderedHeaders.forEach((header, index) => {
    const column = sheet.getColumn(index + 1);
    column.width = measuredWidth(header);
    column.alignment = { vertical: 'middle', horizontal: 'left', wrapText: longTextColumns.has(header) };
  });

  sheet.mergeCells(1, 1, 1, orderedHeaders.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = 'Inscrições SIMITEC';
  titleCell.font = { bold: true, size: 18, color: { argb: white } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primary } };
  sheet.getRow(1).height = 26;

  sheet.mergeCells(2, 1, 2, orderedHeaders.length);
  const infoCell = sheet.getCell(2, 1);
  infoCell.value = `${title} | Gerado em ${generatedAt} | ${rows.length} registro(s)`;
  infoCell.font = { bold: true, size: 10, color: { argb: muted } };
  infoCell.alignment = { vertical: 'middle', horizontal: 'left' };
  infoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: softBlue } };
  sheet.getRow(2).height = 22;
  sheet.getRow(3).height = 7;

  const headerRow = sheet.getRow(4);
  orderedHeaders.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: white } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blue } };
    setBorder(cell, argb('#1D4ED8'));
  });
  headerRow.height = 24;

  rows.forEach((row, rowIndex) => {
    const excelRow = sheet.getRow(rowIndex + 5);
    let estimatedLines = 1;
    orderedHeaders.forEach((header, colIndex) => {
      const cell = excelRow.getCell(colIndex + 1);
      cell.value = cellValue(row[header]);
      const valueLength = String(cell.value || '').length;
      const columnWidth = sheet.getColumn(colIndex + 1).width || 18;
      if (longTextColumns.has(header)) {
        estimatedLines = Math.max(estimatedLines, Math.ceil(valueLength / Math.max(columnWidth - 2, 10)));
      }
      cell.alignment = {
        vertical: 'middle',
        horizontal: ['Inscrição', 'Credenciamento', 'UF'].includes(header) ? 'center' : 'left',
        wrapText: longTextColumns.has(header) || valueLength > columnWidth,
      };
      cell.font = { size: 10, color: { argb: text } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowIndex % 2 ? argb('#FFFFFF') : argb('#F8FAFC') } };
      setBorder(cell);
      if (['Inscrição', 'Credenciamento'].includes(header)) {
        const text = String(cell.value || '').toLowerCase();
        const ok = text.includes('confirm') || text.includes('credenciado');
        cell.font = { bold: true, size: 10, color: { argb: ok ? argb('#047857') : argb('#92400E') } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ok ? softGreen : softAmber } };
      }
    });
    excelRow.height = Math.min(58, Math.max(24, 18 + estimatedLines * 10));
  });

  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: Math.max(5, rows.length + 4), column: orderedHeaders.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

const exportWorkbook = async (rows: ExportRow[], title: string) => {
  const workbook = await buildInscricoesWorkbookBlob(rows, title);
  downloadBlob(workbook, `${cleanFileName(title)}.xlsx`);
};

const exportPdf = async (rows: ExportRow[], title: string, options?: ExportOptions) => {
  const pdf = await buildInscricoesReportPdfBlob(rows, title, { layoutStyle: 'premium', ...options });
  downloadBlob(pdf, `${cleanFileName(options?.fileName || title)}.pdf`);
};

export const exportRows = async (format: string, title: string, rows: ExportRow[], options?: ExportOptions) => {
  if (format === 'PDF') {
    await exportPdf(rows, title, options);
    return;
  }

  if (!rows.length) {
    throw new Error('Não há dados para exportar.');
  }

  if (format === 'CSV') {
    exportCsv(rows, options?.fileName || title);
    return;
  }
  if (format === 'XLSX') {
    await exportWorkbook(rows, options?.fileName || title);
    return;
  }
  throw new Error('Formato de exportação inválido.');
};
