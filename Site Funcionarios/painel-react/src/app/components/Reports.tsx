import { useEffect, useMemo, useState } from 'react';
import { useApp, type Participant } from '../context/AppContext';
import { toast } from 'sonner';
import { exportRows, type ExportRow } from '../utils/exportFiles';
import {
  Activity, BarChart3, Building2, CheckCircle, Clock, Download,
  ExternalLink, FileSpreadsheet, Filter, RefreshCw, Search, Shield,
  TrendingUp, Users, ChevronDown
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';

type FiltersState = {
  institution: string;
  city: string;
  activity: string;
  status: string;
  query: string;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

const tooltipStyle = {
  backgroundColor: '#111827',
  border: '1px solid rgba(148,163,184,0.18)',
  borderRadius: 8,
  color: '#e2e8f0',
  fontSize: 12,
};

function shortChartLabel(value = '', max = 28) {
  const clean = String(value || 'Não informada').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trim()}…` : clean;
}

function InstitutionTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 shadow-xl">
      <p className="text-[11px] font-semibold text-emerald-300">Participantes: {row.value}</p>
    </div>
  );
}

function ActivityTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div className="max-w-[280px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold text-slate-100 leading-snug">{row.name}</p>
      <div className="mt-2 space-y-1 text-[11px]">
        <p className="text-violet-300">Inscritos: {row.inscritos}</p>
        <p className="text-cyan-300">Credenciados: {row.credenciados}</p>
      </div>
    </div>
  );
}

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function timeLabel(value?: string) {
  if (!value) return 'Pendente';
  const match = value.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : value;
}

function groupCount<T extends string>(items: T[]) {
  const counts: Record<string, number> = {};
  items.forEach(item => {
    const key = item || 'Não informado';
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

function statusLabel(p: Participant) {
  if (p.inscriptionStatus === 'cancelled') return 'Cancelado';
  return p.credentialStatus === 'credentialed' ? 'Credenciado' : 'Pendente';
}

function normalize(value = '') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function maskCpf(value = '') {
  const digits = value.replace(/\D/g, '');
  if (!digits || normalize(value).includes('protegido')) return 'Protegido';
  return digits.length >= 9 ? `${digits.slice(0, 3)}.***.${digits.slice(6, 9)}-**` : 'Protegido';
}

function maskEmail(value = '') {
  if (!value || normalize(value).includes('protegido') || !value.includes('@')) return 'Protegido';
  const [user, domain] = value.split('@');
  return `${user.slice(0, Math.min(3, user.length))}***@${domain}`;
}

function maskPhone(value = '') {
  const digits = value.replace(/\D/g, '');
  if (!digits || normalize(value).includes('protegido')) return 'Protegido';
  return digits.length >= 4 ? `(**) *****-${digits.slice(-4)}` : 'Protegido';
}

export function Reports() {
  const { participants, activities, addHistory, currentUser, hasPermission, refreshData } = useApp();
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
  const [lastSync, setLastSync] = useState('');
  const [sheetStatus, setSheetStatus] = useState<{ configured: boolean; spreadsheetId: string }>({ configured: false, spreadsheetId: '' });
  const [filters, setFilters] = useState<FiltersState>({
    institution: 'Todas',
    city: 'Todas',
    activity: 'Todas',
    status: 'Todos',
    query: '',
  });

  const sheetUrl = sheetStatus.spreadsheetId ? `https://docs.google.com/spreadsheets/d/${sheetStatus.spreadsheetId}/edit` : '';

  const loadSheetStatus = async () => {
    try {
      const response = await fetch('/api/admin/google-sheets/status', { credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      const nextStatus = { configured: Boolean(data.configured), spreadsheetId: data.spreadsheetId || '' };
      if (response.ok) setSheetStatus(nextStatus);
      return nextStatus;
    } catch (_error) {
      const nextStatus = { configured: false, spreadsheetId: '' };
      setSheetStatus(nextStatus);
      return nextStatus;
    }
  };

  const reloadData = async () => {
    try {
      await Promise.all([refreshData(), loadSheetStatus()]);
    } catch (error) {
      console.warn('Atualização automática de relatórios falhou:', error);
    }
  };

  useEffect(() => {
    const autoReload = () => {
      if (document.visibilityState !== 'visible') return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      reloadData();
    };

    autoReload();
    const interval = window.setInterval(autoReload, 30000);
    window.addEventListener('focus', autoReload);
    window.addEventListener('online', autoReload);
    document.addEventListener('visibilitychange', autoReload);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', autoReload);
      window.removeEventListener('online', autoReload);
      document.removeEventListener('visibilitychange', autoReload);
    };
  }, []);

  if (!hasPermission('view_reports')) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64">
        <BarChart3 size={48} className="text-muted-foreground mb-4" />
        <p className="text-foreground font-medium">Acesso Restrito</p>
        <p className="text-muted-foreground text-sm mt-1">Você não tem permissão para ver relatórios.</p>
      </div>
    );
  }

  const filteredParticipants = useMemo(() => participants.filter((p) => {
    const q = normalize(filters.query.trim());
    if (q) {
      const haystack = normalize([
        p.name, p.cpf, p.email, p.phone, p.institution, p.city, p.activities.join(' '), ...(p.ticketCodes || [])
      ].join(' '));
      if (!haystack.includes(q)) return false;
    }
    if (filters.institution !== 'Todas' && p.institution !== filters.institution) return false;
    if (filters.city !== 'Todas' && p.city !== filters.city) return false;
    if (filters.activity !== 'Todas' && !p.activities.includes(filters.activity)) return false;
    if (filters.status !== 'Todos' && statusLabel(p) !== filters.status) return false;
    return true;
  }), [participants, filters]);

  const stats = useMemo(() => {
    const total = filteredParticipants.length;
    const credentialed = filteredParticipants.filter(p => p.credentialStatus === 'credentialed').length;
    const cancelled = filteredParticipants.filter(p => p.inscriptionStatus === 'cancelled').length;
    const pending = filteredParticipants.filter(p => p.credentialStatus !== 'credentialed' && p.inscriptionStatus !== 'cancelled').length;
    const institutions = new Set(filteredParticipants.map(p => p.institution || 'Não informada')).size;
    const activitySet = new Set(filteredParticipants.flatMap(p => p.activities));
    return { total, credentialed, cancelled, pending, institutions, activities: activitySet.size, presence: pct(credentialed, total) };
  }, [filteredParticipants]);

  const institutionOptions = useMemo(() => ['Todas', ...Array.from(new Set(participants.map(p => p.institution).filter(Boolean))).sort()], [participants]);
  const cityOptions = useMemo(() => ['Todas', ...Array.from(new Set(participants.map(p => p.city).filter(Boolean))).sort()], [participants]);
  const activityOptions = useMemo(() => ['Todas', ...Array.from(new Set(participants.flatMap(p => p.activities))).sort()], [participants]);

  const chartData = useMemo(() => {
    const institutionCounts = groupCount(filteredParticipants.map(p => p.institution || 'Não informada'));
    const cityCounts = groupCount(filteredParticipants.map(p => p.city || 'Não informada'));
    const statusCounts = groupCount(filteredParticipants.map(statusLabel));
    const activityCounts: Record<string, { inscritos: number; credenciados: number }> = {};
    filteredParticipants.forEach((p) => {
      p.activities.forEach((name) => {
        activityCounts[name] ||= { inscritos: 0, credenciados: 0 };
        activityCounts[name].inscritos += 1;
        if (p.credentialStatus === 'credentialed') activityCounts[name].credenciados += 1;
      });
    });
    const hourly = Array.from({ length: 9 }, (_, index) => {
      const hour = 8 + index;
      return { hora: `${String(hour).padStart(2, '0')}:00`, count: 0 };
    });
    filteredParticipants.forEach((p) => {
      const hour = p.credentialedAt?.match(/(\d{2}):/)?.[1];
      const item = hourly.find(row => row.hora.startsWith(hour || ''));
      if (item) item.count += 1;
    });
    return {
      institutions: Object.entries(institutionCounts).map(([name, value]) => ({ name, shortName: shortChartLabel(name), value })).sort((a, b) => b.value - a.value).slice(0, 10),
      cities: Object.entries(cityCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 7),
      statuses: Object.entries(statusCounts).map(([name, value], index) => ({ name, value, color: COLORS[index % COLORS.length] })),
      activities: Object.entries(activityCounts).map(([name, values]) => ({ name, shortName: shortChartLabel(name, 24), ...values })).slice(0, 7),
      hourly,
    };
  }, [filteredParticipants]);

  const exportData = (items = filteredParticipants): ExportRow[] => items.map(p => ({
    ID: p.id,
    'Códigos de inscrição': (p.registrationIds || []).join(', '),
    'Códigos de credencial': (p.ticketCodes || []).join(', '),
    Nome: p.name,
    CPF: p.cpf || '',
    'E-mail': p.email || '',
    Telefone: p.phone || '',
    Tipo: p.role || 'Estudante',
    Instituição: p.institution,
    'Curso/Turma': p.course || '',
    'Turno de estudo': p.shift || '',
    'Período da atividade': p.eventPeriod || '',
    Cidade: p.city,
    UF: p.state,
    Atividades: p.activities.join(', '),
    Inscrição: p.inscriptionStatus === 'confirmed' ? 'Confirmada' : p.inscriptionStatus === 'pending' ? 'Pendente' : 'Cancelada',
    Credenciamento: p.credentialStatus === 'credentialed' ? 'Credenciado' : 'Pendente',
    'Credenciado em': p.credentialedAt || '',
    Operador: p.credentialedBy || '',
    'Inscrito em': p.registeredAt,
    Grupo: p.groupId || '',
    'Professor responsável': p.groupResponsibleName || '',
    'CPF do responsável': p.groupResponsibleCpf || '',
    'E-mail do responsável': p.groupResponsibleEmail || '',
    'Telefone do responsável': p.groupResponsiblePhone || '',
    'Contato do responsável': p.groupResponsiblePhone || p.groupResponsibleEmail || '',
    'ID da instituição': p.institutionPlaceId || '',
    'Endereço da instituição': p.institutionAddress || '',
    'Google Maps da instituição': p.institutionGoogleMapsUri || '',
    'Instituição verificada em': p.institutionVerifiedAt || '',
  }));

  const handleExport = async (type: string, mode: 'general' | 'institutions' | 'complete' = 'general') => {
    if (!hasPermission('export_reports')) { toast.error('Sem permissão para exportar'); return; }
    setPdfMenuOpen(false);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const sourceRows = mode === 'complete' ? participants : filteredParticipants;
      const titles = {
        general: 'Relatório SIMITEC - Geral',
        institutions: 'Relatório SIMITEC - Por Instituição',
        complete: 'Relatório SIMITEC - Completo',
      };
      const fileNames = {
        general: `simitec-relatorio-geral-${today}`,
        institutions: `simitec-relatorio-por-instituicao-${today}`,
        complete: `simitec-relatorio-completo-${today}`,
      };
      await exportRows(type, type === 'PDF' ? titles[mode] : 'Relatório SIMITEC', exportData(sourceRows), {
        reportMode: mode,
        fileName: type === 'PDF' ? fileNames[mode] : `simitec-relatorio-filtrado-${today}`,
        filters: {
          fonte: 'Painel SIMITEC',
          instituicao: filters.institution,
          periodo: filters.activity === 'Todas' ? 'Todos' : filters.activity,
          status: filters.status,
          tipo: 'Todos',
        },
      });
      addHistory({ user: currentUser.name, action: `Exportou relatório (${type})`, area: 'Relatórios', status: 'success' });
      toast.success(`Relatório exportado em ${type}!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível exportar.');
    }
  };

  const handleSheetsSync = async () => {
    if (!hasPermission('export_reports')) { toast.error('Sem permissão para sincronizar relatórios'); return; }
    try {
      setSyncingSheets(true);
      const response = await fetch('/api/admin/google-sheets/sync', { method: 'POST', credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Não foi possível sincronizar com Google Sheets.');
      const stamp = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      setLastSync(stamp);
      await loadSheetStatus();
      addHistory({ user: currentUser.name, action: 'Sincronizou dashboard externo com Google Sheets', area: 'Relatórios', status: 'success' });
      toast.success(data.message || 'Google Sheets atualizado!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível sincronizar com Google Sheets.');
    } finally {
      setSyncingSheets(false);
    }
  };

  const selectedInstitution = filters.institution === 'Todas' ? chartData.institutions[0]?.name || 'Todas as instituições' : filters.institution;
  const schoolParticipants = filteredParticipants.filter(p => selectedInstitution === 'Todas as instituições' || p.institution === selectedInstitution);
  const schoolCred = schoolParticipants.filter(p => p.credentialStatus === 'credentialed').length;
  const institutionChartHeight = Math.max(112, Math.min(260, chartData.institutions.length * 30 + 48));
  const institutionMax = Math.max(...chartData.institutions.map(item => item.value), 0);
  const institutionScaleMax = Math.max(4, Math.ceil(institutionMax * 1.25));
  const activityChartHeight = Math.max(132, Math.min(260, chartData.activities.length * 32 + 50));
  const activityMax = Math.max(...chartData.activities.flatMap(item => [item.inscritos, item.credenciados]), 0);
  const activityScaleMax = Math.max(4, Math.ceil(activityMax * 1.25));

  const selectClass = 'bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="p-5 max-w-[1600px] mx-auto space-y-4">
      <section className="relative z-10 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.55)]" />
              <p className="text-[11px] text-emerald-400 font-semibold tracking-wide uppercase">Relatórios externos</p>
            </div>
            <h2 className="text-2xl font-semibold text-foreground mt-2">Relatórios</h2>
            <p className="text-sm text-muted-foreground mt-1">Dados reais do banco, exportações e visão por instituição em um só lugar.</p>
          </div>
          {hasPermission('export_reports') && (
            <div className="flex gap-2 flex-wrap justify-end">
              <button onClick={handleSheetsSync} disabled={syncingSheets} className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-60 transition-all">
                <RefreshCw size={14} className={syncingSheets ? 'animate-spin' : ''} /> Sincronizar
              </button>
              <a href={sheetUrl || undefined} target="_blank" rel="noreferrer" aria-disabled={!sheetUrl} className={`flex items-center gap-2 px-3 py-2 border border-border text-foreground rounded-lg text-xs bg-accent/30 transition-all ${sheetUrl ? 'hover:bg-accent' : 'opacity-50 pointer-events-none'}`}>
                <FileSpreadsheet size={14} /> Abrir planilha <ExternalLink size={12} />
              </a>
              <div className="relative">
                <button onClick={() => setPdfMenuOpen(open => !open)} className="flex items-center gap-1.5 px-3 py-2 border border-border text-foreground rounded-lg text-xs bg-accent/30 hover:bg-accent transition-all">
                  <Download size={12} /> PDFs <ChevronDown size={12} className={`transition-transform ${pdfMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {pdfMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-border bg-card shadow-2xl z-50 overflow-hidden">
                    {[
                      { label: 'PDF geral', hint: 'Dados filtrados em lista comum', mode: 'general' as const },
                      { label: 'PDF instituições', hint: 'Separado por escola/responsável', mode: 'institutions' as const },
                      { label: 'PDF completo', hint: 'Todos, incluindo ausentes', mode: 'complete' as const },
                    ].map(option => (
                      <button key={option.mode} onClick={() => handleExport('PDF', option.mode)} className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors">
                        <span className="block text-xs font-semibold text-foreground">{option.label}</span>
                        <span className="block text-[11px] text-muted-foreground mt-0.5">{option.hint}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => handleExport('CSV')} className="flex items-center gap-1.5 px-3 py-2 border border-border text-foreground rounded-lg text-xs bg-accent/30 hover:bg-accent transition-all">
                <Download size={12} /> CSV
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <span className={`w-2 h-2 rounded-full ${sheetStatus.configured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          {sheetStatus.configured
            ? lastSync ? `Última sincronização nesta sessão: ${lastSync}` : 'Google Sheets configurado. Os dados do painel são atualizados automaticamente.'
            : 'Google Sheets ainda não configurado no servidor. PDF e CSV continuam funcionando.'}
          </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: 'Inscritos', value: stats.total, icon: Users, color: '#3b82f6', hint: 'filtrados' },
          { label: 'Credenciados', value: stats.credentialed, icon: CheckCircle, color: '#10b981', hint: `${stats.presence}% presença` },
          { label: 'Pendentes', value: stats.pending, icon: Clock, color: '#f59e0b', hint: 'aguardando entrada' },
          { label: 'Instituições', value: stats.institutions, icon: Building2, color: '#8b5cf6', hint: 'com participantes' },
          { label: 'Atividades', value: stats.activities, icon: Activity, color: '#06b6d4', hint: 'selecionadas' },
          { label: 'Taxa', value: `${stats.presence}%`, icon: TrendingUp, color: '#ec4899', hint: 'credenciamento' },
        ].map(item => (
          <article key={item.label} className="rounded-lg border border-border bg-card p-3 hover:-translate-y-0.5 transition-transform">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${item.color}1a`, color: item.color }}>
                <item.icon size={15} />
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-3">{item.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{item.hint}</p>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-primary" />
          <span className="text-sm font-medium text-foreground">Filtros do relatório</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="relative md:col-span-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={filters.query}
              onChange={e => setFilters(p => ({ ...p, query: e.target.value }))}
              placeholder="Buscar por nome, CPF, e-mail, telefone, instituição, cidade ou código..."
              className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <select className={selectClass} value={filters.institution} onChange={e => setFilters(p => ({ ...p, institution: e.target.value }))}>
            {institutionOptions.map(option => <option key={option}>{option}</option>)}
          </select>
          <select className={selectClass} value={filters.city} onChange={e => setFilters(p => ({ ...p, city: e.target.value }))}>
            {cityOptions.map(option => <option key={option}>{option}</option>)}
          </select>
          <select className={selectClass} value={filters.activity} onChange={e => setFilters(p => ({ ...p, activity: e.target.value }))}>
            {activityOptions.map(option => <option key={option}>{option}</option>)}
          </select>
          <select className={selectClass} value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
            {['Todos', 'Credenciado', 'Pendente', 'Cancelado'].map(option => <option key={option}>{option}</option>)}
          </select>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr_1fr] gap-3">
        <ChartCard title="Credenciamentos por horário">
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={chartData.hourly} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
              <defs><linearGradient id="reportArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="hora" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="count" name="Credenciamentos" stroke="#3b82f6" strokeWidth={2} fill="url(#reportArea)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status">
          <div className="flex items-center gap-4 min-h-[190px]">
            <ResponsiveContainer width={125} height={125}>
              <PieChart>
                <Pie data={chartData.statuses} dataKey="value" nameKey="name" innerRadius={38} outerRadius={58} paddingAngle={2}>
                  {chartData.statuses.map((entry, index) => <Cell key={entry.name} fill={entry.color || COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {chartData.statuses.map(status => (
                <div key={status.name} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 text-muted-foreground"><span className="w-2 h-2 rounded-full" style={{ background: status.color }} />{status.name}</span>
                  <span className="text-foreground font-mono">{status.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Visão da escola">
          <div className="min-h-[190px] flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground line-clamp-2">{selectedInstitution}</p>
                  <p className="text-xs text-muted-foreground mt-1">Recorte seguro para gestão escolar.</p>
                </div>
                <span className="text-[10px] px-2 py-1 rounded border border-violet-500/20 bg-violet-500/10 text-violet-300 whitespace-nowrap">Restrito</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Inscritos" value={schoolParticipants.length} />
              <MiniStat label="Credenciados" value={schoolCred} tone="green" />
              <MiniStat label="Taxa" value={`${pct(schoolCred, schoolParticipants.length)}%`} tone="blue" />
            </div>
            <div className="space-y-1.5">
              {schoolParticipants.slice(0, 3).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-accent/20 px-2 py-1.5">
                  <div className="min-w-0">
                    <p className="text-xs text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{p.activities[0] || 'Atividade não informada'}</p>
                  </div>
                  <StatusBadge status={statusLabel(p)} />
                </div>
              ))}
              {!schoolParticipants.length && (
                <p className="text-xs text-muted-foreground rounded-md border border-border bg-accent/20 px-2 py-2">Nenhum participante neste filtro.</p>
              )}
            </div>
            <div className="rounded-lg bg-accent/40 border border-border p-2 text-[11px] text-muted-foreground flex gap-2">
              <Shield size={14} className="text-emerald-400 shrink-0" />
              Dados sensíveis aparecem mascarados no painel e controlados conforme permissão nas exportações.
            </div>
          </div>
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <ChartCard title="Participantes por instituição">
          <ResponsiveContainer width="100%" height={institutionChartHeight}>
            <BarChart data={chartData.institutions} layout="vertical" barCategoryGap={18} margin={{ top: 2, right: 18, left: 2, bottom: 2 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
              <XAxis type="number" domain={[0, institutionScaleMax]} allowDecimals={false} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="shortName" width={170} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<InstitutionTooltip />} cursor={{ fill: 'rgba(148,163,184,0.06)' }} />
              <Bar dataKey="value" name="Participantes" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Inscritos por atividade">
          <ResponsiveContainer width="100%" height={activityChartHeight}>
            <BarChart data={chartData.activities} layout="vertical" barCategoryGap={14} margin={{ top: 2, right: 18, left: 2, bottom: 2 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
              <XAxis type="number" domain={[0, activityScaleMax]} allowDecimals={false} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="shortName" width={150} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ActivityTooltip />} cursor={{ fill: 'rgba(148,163,184,0.06)' }} />
              <Bar dataKey="inscritos" name="Inscritos" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={10} />
              <Bar dataKey="credenciados" name="Credenciados" fill="#06b6d4" radius={[0, 4, 4, 0]} maxBarSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h3 className="text-sm font-medium text-foreground">Participantes para relatório externo</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{filteredParticipants.length} registro(s), com CPF, e-mail e telefone mascarados na tela.</p>
          </div>
          <Search size={16} className="text-muted-foreground" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-accent/30 border-b border-border">
                {['Nome', 'Instituição', 'Atividade', 'Status', 'Horário', 'CPF', 'E-mail', 'Telefone'].map(header => (
                  <th key={header} className="text-left py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredParticipants.slice(0, 12).map((p, index) => (
                <tr key={p.id} className={`border-b border-border/50 hover:bg-primary/5 ${index % 2 ? 'bg-accent/10' : ''}`}>
                  <td className="py-2.5 px-4 text-foreground whitespace-nowrap">{p.name}</td>
                  <td className="py-2.5 px-4 text-muted-foreground max-w-[240px] truncate">{p.institution}</td>
                  <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{p.activities[0] || '-'}</td>
                  <td className="py-2.5 px-4"><StatusBadge status={statusLabel(p)} /></td>
                  <td className="py-2.5 px-4 text-blue-300 font-mono text-xs whitespace-nowrap">{timeLabel(p.credentialedAt)}</td>
                  <td className="py-2.5 px-4 text-muted-foreground font-mono text-xs whitespace-nowrap">{maskCpf(p.cpf)}</td>
                  <td className="py-2.5 px-4 text-muted-foreground font-mono text-xs whitespace-nowrap">{maskEmail(p.email)}</td>
                  <td className="py-2.5 px-4 text-muted-foreground font-mono text-xs whitespace-nowrap">{maskPhone(p.phone)}</td>
                </tr>
              ))}
              {!filteredParticipants.length && (
                <tr>
                  <td colSpan={8} className="py-8 px-4 text-center text-sm text-muted-foreground">Nenhum participante encontrado para os filtros atuais.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">{title}</h3>
      {children}
    </article>
  );
}

function MiniStat({ label, value, tone = 'slate' }: { label: string; value: string | number; tone?: 'slate' | 'green' | 'blue' }) {
  const cls = tone === 'green' ? 'text-emerald-400 bg-emerald-500/10' : tone === 'blue' ? 'text-blue-400 bg-blue-500/10' : 'text-foreground bg-accent/40';
  return (
    <div className={`rounded-lg border border-border p-2 ${cls}`}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'Credenciado'
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : status === 'Cancelado'
      ? 'bg-red-500/10 text-red-400 border-red-500/20'
      : 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{status}</span>;
}
