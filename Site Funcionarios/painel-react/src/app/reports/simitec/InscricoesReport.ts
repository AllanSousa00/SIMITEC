import type { jsPDF } from 'jspdf';
import type { ExportRow } from '../../utils/exportFiles';
import { SIMITEC_BRAND } from '../../lib/brand';

export type SimitecReportFilters = {
  tipo?: string;
  instituicao?: string;
  periodo?: string;
  status?: string;
  fonte?: string;
};

export type SimitecReportOptions = {
  generatedAt?: Date;
  source?: string;
  filters?: SimitecReportFilters;
  layoutStyle?: 'premium' | 'default';
  reportMode?: 'general' | 'institutions' | 'complete';
};

type PdfDoc = jsPDF;

const theme = {
  colors: {
    primary: SIMITEC_BRAND.navy,
    secondary: SIMITEC_BRAND.oceanDeep,
    accent: SIMITEC_BRAND.mint,
    background: SIMITEC_BRAND.cloud,
    surface: '#FFFFFF',
    text: SIMITEC_BRAND.text,
    muted: SIMITEC_BRAND.slate,
    border: SIMITEC_BRAND.border,
    softBlue: SIMITEC_BRAND.softOcean,
    softGreen: SIMITEC_BRAND.softMint,
    softAmber: SIMITEC_BRAND.softSolar,
    softRed: SIMITEC_BRAND.softCoral,
  },
  spacing: {
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  radius: {
    sm: 2,
    md: 4,
    lg: 6,
  },
  page: {
    width: 210,
    height: 297,
    margin: 14,
    footerTop: 276,
  },
};

const cellValue = (value: ExportRow[string]) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const normalizeText = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const formatDateTimePtBr = (date = new Date()) => date.toLocaleString('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const formatNumberPtBr = (value: number) => new Intl.NumberFormat('pt-BR').format(value);

const formatRegistrationNumber = (index: number) => `#${String(index + 1).padStart(3, '0')}`;

const getRowValue = (row: ExportRow, labels: string[]) => {
  const found = Object.entries(row).find(([key]) => labels.some(label => normalizeText(key) === normalizeText(label)));
  return found ? cellValue(found[1]) : '';
};

const maskCPF = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits || normalizeText(value).includes('protegido')) return 'Protegido';
  return digits.length >= 9 ? `${digits.slice(0, 3)}.***.${digits.slice(6, 9)}-**` : 'Protegido';
};

const maskEmail = (value: string) => {
  if (!value || normalizeText(value).includes('protegido')) return 'Protegido';
  const [user, domain] = value.split('@');
  if (!user || !domain) return 'Protegido';
  const visibleStart = user.slice(0, Math.min(3, Math.max(1, Math.ceil(user.length / 2))));
  const domainParts = domain.split('.');
  const domainName = domainParts[0] || '';
  const suffix = domainParts.slice(1).join('.');
  const visibleDomain = `${domainName.slice(0, Math.min(3, domainName.length))}${domainName.length > 3 ? '***' : ''}${suffix ? `.${suffix}` : ''}`;
  return `${visibleStart}***@${visibleDomain}`;
};

const maskPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits || normalizeText(value).includes('protegido')) return 'Protegido';
  return digits.length >= 4 ? `(**) *****-${digits.slice(-4)}` : 'Protegido';
};

const formatActivities = (value: string) => value
  .split(/[,;|]+/)
  .map(item => item.trim())
  .filter(Boolean);

const pickEmail = (...values: string[]) => values.find(value => value.includes('@')) || '';

const pickPhone = (...values: string[]) => values.find(value => value.replace(/\D/g, '').length >= 8 && !value.includes('@')) || '';

const mostCommonType = (rows: ExportRow[]) => {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const type = getRowValue(row, ['Tipo', 'Tipo de participante']) || 'Não informado';
    counts.set(type, (counts.get(type) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Nenhum';
};

const isPresent = (row: ExportRow) => {
  const credential = normalizeText(getRowValue(row, ['Credenciamento', 'Status de credenciamento']));
  return credential.includes('credenciado') || credential.includes('presente');
};

const prepareExportData = (records: ExportRow[]) => {
  const rows = Array.isArray(records) ? records : [];
  const sortedRows = [...rows].sort((a, b) => getRegistrant(a).name.localeCompare(getRegistrant(b).name, 'pt-BR'));
  const presentRows = sortedRows.filter(isPresent);
  const absentRows = sortedRows.filter(row => !isPresent(row));
  return {
    rows: sortedRows,
    presentRows,
    absentRows,
    totals: {
      total: sortedRows.length,
      present: presentRows.length,
      absent: absentRows.length,
      institutions: new Set(sortedRows.map(row => getRegistrant(row).institution).filter(Boolean)).size,
    },
  };
};

const statusTone = (status: string) => {
  const normalized = normalizeText(status);
  if (normalized.includes('credenciado') || normalized.includes('confirmad') || normalized.includes('ativo')) {
    return { label: status || 'Confirmada', fill: theme.colors.softGreen, stroke: theme.colors.accent, text: '#0E5D48' };
  }
  if (normalized.includes('cancelad') || normalized.includes('bloquead') || normalized.includes('inativo')) {
    return { label: status || 'Cancelada', fill: theme.colors.softRed, stroke: SIMITEC_BRAND.coral, text: '#A63A51' };
  }
  return { label: status || 'Pendente', fill: theme.colors.softAmber, stroke: SIMITEC_BRAND.solar, text: '#8A5A08' };
};

const setFont = (doc: PdfDoc, size: number, color = theme.colors.text, style: 'normal' | 'bold' = 'normal') => {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
  doc.setTextColor(color);
};

const textLines = (doc: PdfDoc, text: string, width: number) => doc.splitTextToSize(text || '-', width) as string[];

const drawRounded = (
  doc: PdfDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  stroke = theme.colors.border,
  radius = theme.radius.md,
) => {
  doc.setFillColor(fill);
  doc.setDrawColor(stroke);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, radius, radius, 'FD');
};

const drawBadge = (doc: PdfDoc, text: string, x: number, y: number, tone = statusTone(text), width?: number) => {
  const badgeWidth = width || Math.max(25, doc.getTextWidth(text) + 10);
  drawRounded(doc, x, y, badgeWidth, 8, tone.fill, tone.stroke, theme.radius.sm);
  setFont(doc, 7, tone.text, 'bold');
  doc.text(text, x + 5, y + 5.4);
};

const headerTitle = (title: string) => {
  const normalized = normalizeText(title);
  if (normalized.includes('inscr')) return 'Relatório de Inscrições';
  return 'Relatório SIMITEC';
};

const headerModeLabel = (title: string) => {
  const normalized = normalizeText(title);
  if (normalized.includes('por instituicao')) return 'Inscrições por Instituição';
  if (normalized.includes('completo')) return 'Inscrições com Ausentes';
  if (normalized.includes('geral')) return 'Inscrições - Geral';
  return title.replace(/^Inscrições SIMITEC\s*-\s*/i, 'Inscrições');
};

const ReportHeader = (doc: PdfDoc, title: string, generatedAt: string, source: string) => {
  doc.setFillColor(theme.colors.primary);
  doc.roundedRect(14, 10, 182, 34, 5, 5, 'F');
  doc.setFillColor(theme.colors.accent);
  doc.rect(14, 42, 182, 2, 'F');
  doc.setFillColor(theme.colors.secondary);
  doc.roundedRect(22, 18, 3, 18, 1.5, 1.5, 'F');

  setFont(doc, 14, '#FFFFFF', 'bold');
  doc.text('SIMITEC', 30, 20);
  setFont(doc, 7.5, '#CBD5E1');
  doc.text('Sistema de Monitoramento de Inscrições e Tecnologia Educacional', 30, 26);

  const displayTitle = headerTitle(title);
  setFont(doc, 16, '#FFFFFF', 'bold');
  doc.text(displayTitle, 30, 34, { maxWidth: 88 });
  setFont(doc, 6.8, '#A7F3D0', 'bold');
  doc.text(headerModeLabel(title), 30, 39);

  drawBadge(
    doc,
    'Relatório gerado automaticamente',
    123,
    17,
    { label: '', fill: '#132235', stroke: '#334155', text: '#D1FAE5' },
    58,
  );

  setFont(doc, 7.3, '#E2E8F0');
  doc.text(`Gerado em: ${generatedAt}`, 123, 32);
  doc.text(`Origem dos dados: ${source}`, 123, 37);
};

const SummaryCards = (doc: PdfDoc, rows: ExportRow[], headers: string[], source: string) => {
  const cards = [
    { mark: '01', title: 'Total de inscrições', value: formatNumberPtBr(rows.length), desc: 'Registros disponíveis no relatório', color: theme.colors.secondary },
    { mark: '02', title: 'Campos do formulário', value: formatNumberPtBr(headers.length), desc: 'Informações exportadas por registro', color: theme.colors.accent },
    { mark: '03', title: 'Origem dos dados', value: source, desc: 'Fonte usada para gerar o arquivo', color: SIMITEC_BRAND.solar },
    { mark: '04', title: 'Tipo predominante', value: mostCommonType(rows), desc: 'Classificação mais recorrente', color: SIMITEC_BRAND.ocean },
  ];

  cards.forEach((card, index) => {
    const x = 14 + (index * 46.5);
    drawRounded(doc, x, 52, 42.5, 28, theme.colors.surface, theme.colors.border, theme.radius.lg);
    doc.setFillColor(card.color);
    doc.roundedRect(x + 4, 57, 8, 8, 2, 2, 'F');
    setFont(doc, 5.3, '#FFFFFF', 'bold');
    doc.text(card.mark, x + 5.2, 62.2);
    setFont(doc, 6.6, theme.colors.muted, 'bold');
    doc.text(card.title, x + 14, 61);
    setFont(doc, 13, theme.colors.text, 'bold');
    doc.text(textLines(doc, card.value, 34)[0], x + 4, 70);
    setFont(doc, 5.5, theme.colors.muted);
    doc.text(textLines(doc, card.desc, 34).slice(0, 2), x + 4, 75);
  });
};

const InfoBlock = (doc: PdfDoc, title: string, lines: string[], x: number, y: number, w: number, h: number, accent: string) => {
  drawRounded(doc, x, y, w, h, theme.colors.surface, theme.colors.border, theme.radius.lg);
  doc.setFillColor(accent);
  doc.roundedRect(x + 4, y + 5, 2, h - 10, 1, 1, 'F');
  setFont(doc, 9, theme.colors.text, 'bold');
  doc.text(title, x + 10, y + 10);
  setFont(doc, 7.2, theme.colors.muted);
  doc.text(lines, x + 10, y + 18, { maxWidth: w - 17, lineHeightFactor: 1.45 });
};

const ExecutiveSummary = (doc: PdfDoc, rows: ExportRow[], generatedAt: string, source: string, headers: string[]) => {
  drawRounded(doc, 14, 52, 182, 24, theme.colors.surface, theme.colors.border, theme.radius.lg);
  doc.setFillColor(theme.colors.secondary);
  doc.roundedRect(22, 58, 2, 12, 1, 1, 'F');
  setFont(doc, 8.5, theme.colors.text, 'bold');
  doc.text('Resumo do relatório', 30, 61);
  setFont(doc, 6.8, theme.colors.muted);
  doc.text('Inscrições organizadas para conferência operacional, com dados pessoais protegidos.', 30, 68);

  setFont(doc, 6.7, theme.colors.muted, 'bold');
  doc.text(`Registros: ${formatNumberPtBr(rows.length)}`, 126, 59);
  doc.text(`Campos: ${formatNumberPtBr(headers.length)}`, 126, 64);
  doc.text(`Fonte: ${source}`, 126, 69);
  doc.text(`Gerado: ${generatedAt}`, 126, 74);
};

const Chip = (doc: PdfDoc, label: string, x: number, y: number) => {
  const width = Math.min(56, Math.max(28, doc.getTextWidth(label) + 8));
  drawRounded(doc, x, y, width, 8, theme.colors.softBlue, '#BFDBFE', 4);
  setFont(doc, 6.4, '#1D4ED8', 'bold');
  doc.text(label.length > 34 ? `${label.slice(0, 31)}...` : label, x + 4, y + 5.4);
  return width;
};

const FiltersApplied = (doc: PdfDoc, filters: SimitecReportFilters | undefined, source: string, y: number) => {
  setFont(doc, 9, theme.colors.text, 'bold');
  doc.text('Filtros aplicados', 14, y);
  const values = [
    ['Fonte', filters?.fonte || source],
    ['Período', filters?.periodo || 'Todos'],
    ['Status', filters?.status || 'Todos'],
    ['Tipo', filters?.tipo || 'Todos'],
  ];

  let chipX = 14;
  values.forEach(([key, value]) => {
    const width = Chip(doc, `${key}: ${value}`, chipX, y + 5);
    chipX += width + 4;
  });

  if (!filters || Object.values(filters).every(value => !value)) {
    setFont(doc, 6.7, theme.colors.muted);
    doc.text('Nenhum filtro específico aplicado. O relatório considera todos os registros disponíveis.', 14, y + 19);
  }
};

const hasActiveFilters = (filters: SimitecReportFilters | undefined) => {
  if (!filters) return false;
  return [filters.tipo, filters.instituicao, filters.periodo, filters.status]
    .some(value => {
      const normalized = normalizeText(String(value || '').trim());
      return normalized && normalized !== 'todos' && normalized !== 'todas';
    });
};

const PrivacyNotice = (doc: PdfDoc, y: number) => {
  drawRounded(doc, 14, y, 182, 18, theme.colors.softGreen, '#BBF7D0', theme.radius.lg);
  setFont(doc, 8.2, '#065F46', 'bold');
  doc.text('Aviso de privacidade', 22, y + 7);
  setFont(doc, 7.2, '#047857');
  doc.text('Os dados pessoais deste relatório são exibidos de forma mascarada para proteger os participantes.', 22, y + 13);
};

const getRegistrant = (row: ExportRow) => {
  const activitiesRaw = getRowValue(row, ['Atividades', 'Atividade', 'Atividades selecionadas']);
  const responsibleContact = getRowValue(row, ['Contato do responsável', 'Contato do responsavel']);
  return {
    name: getRowValue(row, ['Nome']) || 'Participante sem nome',
    type: getRowValue(row, ['Tipo', 'Tipo de participante']) || 'Não informado',
    city: getRowValue(row, ['Cidade']) || 'Cidade não informada',
    institution: getRowValue(row, ['Instituição', 'Instituicao']) || 'Instituição não informada',
    cpf: maskCPF(getRowValue(row, ['CPF'])),
    email: maskEmail(getRowValue(row, ['E-mail', 'Email'])),
    phone: maskPhone(getRowValue(row, ['Telefone', 'Celular'])),
    activities: formatActivities(activitiesRaw),
    status: getRowValue(row, ['Status', 'Inscrição', 'Inscricao', 'Credenciamento']) || 'Confirmada',
    course: getRowValue(row, ['Curso/Turma', 'Turma', 'Curso']),
    period: getRowValue(row, ['Período da atividade', 'Periodo da atividade']),
    responsible: getRowValue(row, ['Responsável', 'Responsavel', 'Professor responsável', 'Professor responsavel']) || 'Responsável não informado',
    responsibleCpf: maskCPF(getRowValue(row, ['CPF do responsável', 'CPF do responsavel', 'Documento do responsável', 'Documento do responsavel'])),
    responsibleEmail: maskEmail(pickEmail(getRowValue(row, ['E-mail do responsável', 'Email do responsável', 'E-mail do responsavel', 'Email do responsavel']), responsibleContact)),
    responsiblePhone: maskPhone(pickPhone(getRowValue(row, ['Telefone do responsável', 'Telefone do responsavel', 'Celular do responsável', 'Celular do responsavel']), responsibleContact)),
    groupId: getRowValue(row, ['Grupo', 'Caravana']),
  };
};

const RegistrantCardHeight = (doc: PdfDoc, row: ExportRow) => {
  const participant = getRegistrant(row);
  const institutionLines = textLines(doc, participant.institution, 142).length;
  const activityLines = Math.max(1, participant.activities.reduce((total, activity) => total + textLines(doc, activity, 145).length, 0));
  return 60 + (Math.min(institutionLines, 3) * 4.4) + (Math.min(activityLines, 5) * 4.4);
};

const RegistrantCard = (doc: PdfDoc, row: ExportRow, index: number, y: number) => {
  const participant = getRegistrant(row);
  const height = RegistrantCardHeight(doc, row);
  const tone = statusTone(participant.status);

  drawRounded(doc, 14, y, 182, height, theme.colors.surface, theme.colors.border, theme.radius.lg);
  doc.setFillColor(tone.stroke);
  doc.roundedRect(14, y, 3, height, 2, 2, 'F');

  drawBadge(doc, formatRegistrationNumber(index), 22, y + 8, { label: '', fill: theme.colors.softBlue, stroke: '#BFDBFE', text: '#1D4ED8' }, 20);
  drawBadge(doc, tone.label, 158, y + 8, tone, 28);

  setFont(doc, 12, theme.colors.text, 'bold');
  doc.text(textLines(doc, participant.name, 96)[0], 22, y + 25);
  setFont(doc, 7.4, theme.colors.muted);
  doc.text(`${participant.type} • ${participant.city}`, 22, y + 31);

  setFont(doc, 6.4, theme.colors.muted, 'bold');
  doc.text('Instituição', 22, y + 41);
  setFont(doc, 7.2, theme.colors.text);
  doc.text(textLines(doc, participant.institution, 154).slice(0, 3), 22, y + 47, { lineHeightFactor: 1.25 });

  const infoY = y + 51 + (Math.min(textLines(doc, participant.institution, 154).length, 3) * 4.4);
  setFont(doc, 6.4, theme.colors.muted, 'bold');
  doc.text('Dados protegidos', 22, infoY);
  setFont(doc, 6.8, theme.colors.muted);
  doc.text(`CPF: ${participant.cpf}`, 22, infoY + 6);
  doc.text(`E-mail: ${participant.email}`, 65, infoY + 6);
  doc.text(`Tel.: ${participant.phone}`, 119, infoY + 6);

  const activityY = infoY + 16;
  setFont(doc, 6.4, theme.colors.muted, 'bold');
  doc.text('Atividades selecionadas', 22, activityY);
  setFont(doc, 7.1, theme.colors.text);
  const activities = participant.activities.length ? participant.activities : ['Não informadas'];
  let lineY = activityY + 6;
  activities.slice(0, 5).forEach((activity) => {
    const lines = textLines(doc, activity, 152);
    lines.slice(0, 2).forEach((line) => {
      doc.setFillColor(theme.colors.accent);
      doc.circle(24, lineY - 1.5, 0.8, 'F');
      doc.text(line, 28, lineY);
      lineY += 4.6;
    });
  });

  return y + height + 6;
};

const EmptyState = (doc: PdfDoc, y: number) => {
  drawRounded(doc, 35, y, 140, 34, theme.colors.surface, theme.colors.border, theme.radius.lg);
  drawBadge(doc, '0', 46, y + 10, { label: '', fill: theme.colors.softBlue, stroke: '#BFDBFE', text: '#1D4ED8' }, 12);
  setFont(doc, 12, theme.colors.text, 'bold');
  doc.text('Nenhuma inscrição encontrada.', 64, y + 16);
  setFont(doc, 7.4, theme.colors.muted);
  doc.text('Ajuste os filtros ou gere o relatório novamente quando houver dados.', 64, y + 24);
};

const compactColumns = [
  { label: '#', width: 9 },
  { label: 'Participante', width: 37 },
  { label: 'Contato', width: 50 },
  { label: 'Instituição', width: 45 },
  { label: 'Cidade', width: 16 },
  { label: 'Status', width: 25 },
];

const CompactTableHeader = (doc: PdfDoc, y: number, sectionTitle = 'Tabela operacional de inscritos') => {
  setFont(doc, 10.5, theme.colors.text, 'bold');
  doc.text(sectionTitle, 14, y);
  setFont(doc, 6.8, theme.colors.muted);
  doc.text('Visão compacta para conferência em alto volume. Dados sensíveis ficam no CSV seguro ou protegidos no PDF.', 14, y + 5);
  let x = 14;
  doc.setFillColor(theme.colors.primary);
  doc.roundedRect(14, y + 10, 182, 9, 2, 2, 'F');
  compactColumns.forEach((column) => {
    setFont(doc, 6.2, '#FFFFFF', 'bold');
    doc.text(column.label, x + 2, y + 16);
    x += column.width;
  });
};

const CompactTableRow = (doc: PdfDoc, row: ExportRow, index: number, y: number) => {
  const participant = getRegistrant(row);
  const inscription = getRowValue(row, ['Inscrição', 'Inscricao', 'Status']) || 'Confirmada';
  const credential = getRowValue(row, ['Credenciamento', 'Status de credenciamento']) || 'Pendente';
  doc.setFillColor(index % 2 === 0 ? '#FFFFFF' : '#F1F5F9');
  doc.setDrawColor(theme.colors.border);
  doc.rect(14, y, 182, 16, 'FD');

  let x = 14;
  setFont(doc, 5.8, theme.colors.text);
  doc.text(String(index + 1).padStart(3, '0'), x + 2, y + 6);
  x += compactColumns[0].width;

  setFont(doc, 5.8, theme.colors.text, 'bold');
  doc.text(textLines(doc, participant.name, compactColumns[1].width - 4)[0], x + 2, y + 5.5);
  setFont(doc, 5.2, theme.colors.muted);
  doc.text(textLines(doc, participant.type, compactColumns[1].width - 4)[0], x + 2, y + 11.2);
  x += compactColumns[1].width;

  setFont(doc, 4.9, theme.colors.muted);
  doc.text(`CPF: ${participant.cpf}`, x + 2, y + 4.8);
  doc.text(`E-mail: ${participant.email}`, x + 2, y + 9.2);
  doc.text(`Tel.: ${participant.phone}`, x + 2, y + 13.6);
  x += compactColumns[2].width;

  setFont(doc, 5.5, theme.colors.text);
  doc.text(textLines(doc, participant.institution, compactColumns[3].width - 4).slice(0, 2), x + 2, y + 5.5, { lineHeightFactor: 1.15 });
  x += compactColumns[3].width;

  setFont(doc, 5.4, theme.colors.text);
  doc.text(textLines(doc, participant.city, compactColumns[4].width - 4)[0], x + 2, y + 8.5);
  x += compactColumns[4].width;

  setFont(doc, 5.1, statusTone(inscription).text, 'bold');
  doc.text(textLines(doc, inscription, compactColumns[5].width - 4)[0], x + 2, y + 5.5);
  setFont(doc, 5.1, statusTone(credential).text, 'bold');
  doc.text(textLines(doc, credential, compactColumns[5].width - 4)[0], x + 2, y + 11.2);
};

const renderCompactTable = (
  doc: PdfDoc,
  rows: ExportRow[],
  title: string,
  generatedAt: string,
  source: string,
  startY: number,
  sectionTitle = 'Tabela operacional de inscritos',
) => {
  let y = startY;
  const rowHeight = 16;
  if (!rows.length) {
    EmptyState(doc, y + 8);
    return y + 50;
  }
  CompactTableHeader(doc, y, sectionTitle);
  y += 21;
  rows.forEach((row, index) => {
    if (y + rowHeight > 266) {
      doc.addPage();
      createPage(doc, title, generatedAt, source);
      y = 58;
      CompactTableHeader(doc, y, sectionTitle);
      y += 21;
    }
    CompactTableRow(doc, row, index, y);
    y += rowHeight;
  });
  return y;
};

const renderCompactEmptySection = (doc: PdfDoc, y: number, sectionTitle: string, message: string) => {
  setFont(doc, 10.5, theme.colors.text, 'bold');
  doc.text(sectionTitle, 14, y);
  drawRounded(doc, 14, y + 6, 182, 10, theme.colors.surface, theme.colors.border, theme.radius.md);
  setFont(doc, 7, theme.colors.muted);
  doc.text(message, 20, y + 12.5);
  return y + 22;
};

const renderCompleteStatusReport = (doc: PdfDoc, rows: ExportRow[], title: string, generatedAt: string, source: string) => {
  const prepared = prepareExportData(rows);
  let y = 52;
  setFont(doc, 11, theme.colors.text, 'bold');
  doc.text('Conferência completa por presença', 14, y);
  setFont(doc, 7.2, theme.colors.muted);
  doc.text('Participantes presentes e ausentes aparecem separados para facilitar auditoria do evento.', 14, y + 6);
  y += 12;
  drawRounded(doc, 14, y, 182, 14, theme.colors.surface, theme.colors.border, theme.radius.md);
  doc.setFillColor(theme.colors.softGreen);
  doc.roundedRect(18, y + 3, 50, 8, 2, 2, 'F');
  doc.setFillColor(theme.colors.softAmber);
  doc.roundedRect(76, y + 3, 54, 8, 2, 2, 'F');
  doc.setFillColor(theme.colors.softBlue);
  doc.roundedRect(138, y + 3, 34, 8, 2, 2, 'F');
  setFont(doc, 7, '#047857', 'bold');
  doc.text(`Credenciados: ${formatNumberPtBr(prepared.totals.present)}`, 22, y + 8.5);
  setFont(doc, 7, '#92400E', 'bold');
  doc.text(`Não credenciados: ${formatNumberPtBr(prepared.totals.absent)}`, 80, y + 8.5);
  setFont(doc, 7, '#1D4ED8', 'bold');
  doc.text(`Total: ${formatNumberPtBr(prepared.totals.total)}`, 142, y + 8.5);
  y += 24;

  y = prepared.presentRows.length
    ? renderCompactTable(doc, prepared.presentRows, title, generatedAt, source, y, 'Credenciados / presentes')
    : renderCompactEmptySection(doc, y, 'Credenciados / presentes', 'Nenhum participante credenciado nesta seleção.');
  if (y + 36 > 266) {
    doc.addPage();
    createPage(doc, title, generatedAt, source);
    y = 58;
  } else {
    y += 8;
  }
  if (prepared.absentRows.length) {
    renderCompactTable(doc, prepared.absentRows, title, generatedAt, source, y, 'Não credenciados / ausentes');
  } else {
    renderCompactEmptySection(doc, y, 'Não credenciados / ausentes', 'Nenhum participante ausente nesta seleção.');
  }
};

const groupKey = (row: ExportRow) => {
  const p = getRegistrant(row);
  return [
    normalizeText(p.institution),
    normalizeText(p.responsible),
    normalizeText(p.responsibleCpf),
    normalizeText(p.responsibleEmail),
    normalizeText(p.responsiblePhone),
    normalizeText(p.course),
    normalizeText(p.period),
    normalizeText(p.groupId),
  ].join('|');
};

const InstitutionGroupHeight = (doc: PdfDoc, rows: ExportRow[]) => {
  const first = getRegistrant(rows[0]);
  const institutionLines = textLines(doc, first.institution, 154).length;
  return 37 + (Math.min(institutionLines, 2) * 4) + (rows.length * 12);
};

const InstitutionGroup = (doc: PdfDoc, rows: ExportRow[], y: number, index: number) => {
  const first = getRegistrant(rows[0]);
  const height = InstitutionGroupHeight(doc, rows);
  drawRounded(doc, 14, y, 182, height, index % 2 === 0 ? theme.colors.surface : '#FBFDFF', theme.colors.border, theme.radius.lg);
  doc.setFillColor(index % 2 === 0 ? theme.colors.secondary : theme.colors.accent);
  doc.roundedRect(14, y, 3, height, 2, 2, 'F');

  drawBadge(doc, `${rows.length} aluno(s)`, 160, y + 6, { label: '', fill: theme.colors.softGreen, stroke: '#BBF7D0', text: '#047857' }, 28);
  setFont(doc, 9.2, theme.colors.text, 'bold');
  doc.text(textLines(doc, first.institution, 142).slice(0, 2), 22, y + 10, { lineHeightFactor: 1.08 });
  const metaY = y + 14 + (Math.min(textLines(doc, first.institution, 142).length, 2) * 3.8);
  doc.setFillColor(theme.colors.softBlue);
  doc.roundedRect(22, metaY - 4.8, 96, 17, 1.7, 1.7, 'F');
  doc.setFillColor(theme.colors.softAmber);
  doc.roundedRect(122, metaY - 4.8, 38, 17, 1.7, 1.7, 'F');
  setFont(doc, 5.5, '#1D4ED8', 'bold');
  doc.text('RESPONSÁVEL', 25, metaY);
  setFont(doc, 6.3, theme.colors.text, 'bold');
  doc.text(textLines(doc, first.responsible, 58)[0], 25, metaY + 4.2);
  setFont(doc, 5.2, theme.colors.muted);
  doc.text(`CPF: ${first.responsibleCpf}`, 25, metaY + 8.5);
  doc.text(`E-mail: ${first.responsibleEmail}`, 66, metaY + 8.5);
  doc.text(`Tel.: ${first.responsiblePhone}`, 25, metaY + 12.5);
  setFont(doc, 5.8, '#92400E', 'bold');
  doc.text('TURMA / PERÍODO', 126, metaY);
  setFont(doc, 5.5, '#92400E', 'bold');
  doc.text(textLines(doc, `Turma: ${first.course || 'Não informada'}`, 31)[0], 126, metaY + 5);
  doc.text(textLines(doc, `Período: ${first.period || 'Não informado'}`, 31)[0], 126, metaY + 10);

  setFont(doc, 6.3, theme.colors.muted, 'bold');
  doc.text('Participantes', 22, metaY + 19);
  setFont(doc, 7.4, theme.colors.text);
  rows.forEach((row, rowIndex) => {
    const p = getRegistrant(row);
    const lineY = metaY + 26 + (rowIndex * 12);
    doc.setFillColor(rowIndex % 2 === 0 ? '#F8FAFC' : '#FFFFFF');
    doc.roundedRect(22, lineY - 5, 156, 11.2, 1.5, 1.5, 'F');
    doc.setFillColor(theme.colors.accent);
    doc.circle(25, lineY - 1.8, 0.7, 'F');
    setFont(doc, 7.6, theme.colors.text, 'bold');
    doc.text(textLines(doc, `${String(rowIndex + 1).padStart(2, '0')}. ${p.name}`, 112)[0], 29, lineY - 1.5);
    setFont(doc, 6.2, theme.colors.muted);
    doc.text(`CPF: ${p.cpf}`, 29, lineY + 2.5);
    doc.text(`E-mail: ${p.email}`, 76, lineY + 2.5);
    doc.text(`Tel.: ${p.phone}`, 29, lineY + 6);
  });
  return y + height + 6;
};

const separatedRows = (rows: ExportRow[]) => {
  const studentRows = rows.filter(row => {
    const p = getRegistrant(row);
    return p.institution && normalizeText(p.institution) !== 'visitante' && normalizeText(p.type).includes('estudante');
  });
  const visitorRows = rows.filter(row => !studentRows.includes(row));
  const groups = new Map<string, ExportRow[]>();
  studentRows.forEach((row) => {
    const key = groupKey(row);
    groups.set(key, [...(groups.get(key) || []), row]);
  });
  return { institutionGroups: [...groups.values()], visitorRows };
};

const renderInstitutionReport = (doc: PdfDoc, rows: ExportRow[], title: string, generatedAt: string, source: string, complete = false) => {
  const { institutionGroups, visitorRows } = separatedRows(rows);
  let y = 58;
  setFont(doc, 11, theme.colors.text, 'bold');
  doc.text(complete ? 'Relatório completo por instituição e presença' : 'Instituições e caravanas', 14, y);
  setFont(doc, 7.2, theme.colors.muted);
  doc.text(
    complete
      ? 'Inclui inscritos credenciados, pendentes e ausentes, separados por escola e depois por visitantes.'
      : 'Estudantes agrupados por instituição, responsável e turma. Visitantes ficam separados ao final.',
    14,
    y + 6,
  );
  y += 16;

  const ensureSpace = (height: number) => {
    if (y + height <= 266) return;
    doc.addPage();
    createPage(doc, title, generatedAt, source);
    y = 58;
  };

  institutionGroups.forEach((group, index) => {
    const height = InstitutionGroupHeight(doc, group);
    ensureSpace(height);
    y = InstitutionGroup(doc, group, y, index);
  });

  if (visitorRows.length) {
    ensureSpace(30);
    setFont(doc, 10.5, theme.colors.text, 'bold');
    doc.text('Visitantes e inscrições individuais', 14, y + 4);
    y += 12;
    visitorRows.forEach((row, index) => {
      const height = RegistrantCardHeight(doc, row);
      ensureSpace(height);
      y = RegistrantCard(doc, row, index, y);
    });
  }
};

const ReportFooter = (doc: PdfDoc, generatedAt: string) => {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(theme.colors.border);
    doc.setLineWidth(0.25);
    doc.line(14, theme.page.footerTop, 196, theme.page.footerTop);
    setFont(doc, 7, theme.colors.muted, 'bold');
    doc.text('SIMITEC — Relatório de Inscrições', 14, 282);
    setFont(doc, 7, theme.colors.muted);
    doc.text(`Página ${page} de ${pageCount}`, 105, 282, { align: 'center' });
    doc.text(`Gerado em ${generatedAt}`, 196, 282, { align: 'right' });
    doc.text('Documento gerado automaticamente. Dados pessoais protegidos.', 14, 289);
  }
};

const createPage = (doc: PdfDoc, title: string, generatedAt: string, source: string) => {
  doc.setFillColor(theme.colors.background);
  doc.rect(0, 0, theme.page.width, theme.page.height, 'F');
  ReportHeader(doc, title, generatedAt, source);
};

export const buildInscricoesReportPdfBlob = async (
  rows: ExportRow[],
  title = 'Relatório de Inscrições SIMITEC',
  options: SimitecReportOptions = {},
) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const generatedAt = formatDateTimePtBr(options.generatedAt);
  const source = options.source || options.filters?.fonte || 'Painel SIMITEC';
  const headers = rows[0] ? Object.keys(rows[0]) : ['Nome', 'CPF', 'E-mail', 'Telefone', 'Tipo', 'Instituição'];

  doc.setProperties({
    title: 'Relatório de Inscrições SIMITEC',
    author: 'SIMITEC',
    subject: 'Relatório de inscrições',
    keywords: 'SIMITEC, inscrições, relatório, estudantes, evento',
    creator: 'Painel SIMITEC',
  });

  if (options.reportMode === 'institutions') {
    createPage(doc, title, generatedAt, source);
    renderInstitutionReport(doc, rows, title, generatedAt, source);
    ReportFooter(doc, generatedAt);
    return doc.output('blob');
  }

  if (options.reportMode === 'complete') {
    createPage(doc, title, generatedAt, source);
    renderCompleteStatusReport(doc, rows, title, generatedAt, source);
    ReportFooter(doc, generatedAt);
    return doc.output('blob');
  }

  createPage(doc, title, generatedAt, source);
  ExecutiveSummary(doc, rows, generatedAt, source, headers);
  const tableStartY = hasActiveFilters(options.filters) ? 118 : 86;
  if (hasActiveFilters(options.filters)) {
    FiltersApplied(doc, options.filters, source, 86);
  }

  const y = renderCompactTable(doc, prepareExportData(rows).rows, title, generatedAt, source, tableStartY);

  if (doc.getNumberOfPages() === 1 && y < 246) {
    PrivacyNotice(doc, Math.max(y + 4, 244));
  }

  ReportFooter(doc, generatedAt);
  return doc.output('blob');
};
