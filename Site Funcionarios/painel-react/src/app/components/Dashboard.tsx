import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { SIMITEC_BRAND } from '../lib/brand';
import {
  Users, UserCheck, Clock, Shield, Activity, Globe,
  TrendingUp, AlertCircle, CheckCircle, ChevronRight,
  BarChart3, FileText, Settings, Building2,
  Calendar, MapPin, Star, ArrowUpRight, History, X
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';

const customTooltipStyle = {
  backgroundColor: '#0D2A42',
  border: '1px solid rgba(166,211,233,0.15)',
  borderRadius: 8,
  color: '#EFF8FC',
};

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data?.message || 'Não foi possível carregar os dados.');
  return data;
}

const normalize = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const parsePtBrDate = (value?: string) => {
  if (!value) return null;
  const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth()
  && a.getDate() === b.getDate();

const endOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const dayLabel = (date: Date) => date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

const asPercent = (value: number, total: number) => total > 0 ? Math.round((value / total) * 100) : 0;

export function Dashboard() {
  const { participants, staff, roles, activities, history, currentRole, hasPermission, refreshData } = useApp();
  const navigate = useNavigate();
  const [siteContent, setSiteContent] = useState<any>(null);
  const [siteLoadError, setSiteLoadError] = useState('');
  const [historyModal, setHistoryModal] = useState(false);

  useEffect(() => {
    refreshData().catch(() => {});
    api('/api/admin/content')
      .then(({ content }) => setSiteContent(content))
      .catch(error => setSiteLoadError(error instanceof Error ? error.message : 'Não foi possível carregar o site público.'));
  }, []);

  const dashboardSummary = useMemo(() => participants.reduce((acc, participant) => {
    acc.total += 1;
    if (participant.credentialStatus === 'credentialed') acc.credenciados += 1;
    if (participant.credentialStatus === 'pending') acc.pendentes += 1;
    if (participant.inscriptionStatus === 'confirmed') acc.confirmed += 1;
    if (participant.inscriptionStatus === 'pending') acc.pendingConfirmation += 1;
    return acc;
  }, { total: 0, credenciados: 0, pendentes: 0, confirmed: 0, pendingConfirmation: 0 }), [participants]);
  const staffSummary = useMemo(() => ({
    activeStaff: staff.reduce((sum, item) => sum + (item.status === 'active' ? 1 : 0), 0),
    activeRoles: roles.reduce((sum, item) => sum + (item.status === 'active' ? 1 : 0), 0),
  }), [staff, roles]);
  const { total, credenciados, pendentes, confirmed, pendingConfirmation } = dashboardSummary;
  const { activeStaff, activeRoles } = staffSummary;

  const event = siteContent?.event || {};
  const teamSite = event.teamSite || {};
  const eventName = event.name || 'SIMITEC';
  const eventEdition = event.edition || event.year || '';
  const eventTitle = [eventName, eventEdition].filter(Boolean).join(' ');
  const dateLabel = event.dateLabel || event.date || 'Data não informada';
  const timeLabel = event.timeLabel || event.time || event.hours || 'Horário não informado';
  const locationLabel = event.location || 'Local não informado';
  const siteStatus = siteContent ? 'online' : siteLoadError ? 'offline' : 'draft';

  const chartData = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return date;
    });
    const rows = days.map(date => ({ day: dayLabel(date), date, inscritos: 0, credenciados: 0 }));
    for (const participant of participants) {
      const registeredAt = parsePtBrDate(participant.registeredAt);
      const credentialedAt = parsePtBrDate(participant.credentialedAt);
      for (const row of rows) {
        if (registeredAt && sameDay(registeredAt, row.date)) row.inscritos += 1;
        if (credentialedAt && sameDay(credentialedAt, row.date)) row.credenciados += 1;
      }
    }
    return rows.map(({ day, inscritos, credenciados }) => ({ day, inscritos, credenciados }));
  }, [participants]);

  const growth = useMemo(() => {
    const today = endOfDay(new Date());
    const currentStart = new Date(today);
    currentStart.setDate(today.getDate() - 6);
    currentStart.setHours(0, 0, 0, 0);
    const previousStart = new Date(today);
    previousStart.setDate(today.getDate() - 13);
    previousStart.setHours(0, 0, 0, 0);
    const previousEnd = new Date(today);
    previousEnd.setDate(today.getDate() - 7);
    previousEnd.setHours(23, 59, 59, 999);
    const current = participants.filter(p => {
      const date = parsePtBrDate(p.registeredAt);
      return date && date >= currentStart && date <= today;
    }).length;
    const previous = participants.filter(p => {
      const date = parsePtBrDate(p.registeredAt);
      return date && date >= previousStart && date <= previousEnd;
    }).length;
    if (!previous) return { value: current ? '+100%' : '0%', sub: 'sem base anterior' };
    const diff = Math.round(((current - previous) / previous) * 100);
    return { value: `${diff >= 0 ? '+' : ''}${diff}%`, sub: 'últimos 7 dias vs. 7 anteriores' };
  }, [participants]);

  const activityCounts = useMemo(() => {
    const counts = new Map<string, { enrolled: number; credentialed: number }>();
    for (const participant of participants) {
      for (const activityName of new Set(participant.activities.map(name => normalize(name)))) {
        const current = counts.get(activityName) || { enrolled: 0, credentialed: 0 };
        current.enrolled += 1;
        if (participant.credentialStatus === 'credentialed') current.credentialed += 1;
        counts.set(activityName, current);
      }
    }
    return counts;
  }, [participants]);

  const activityRows = useMemo(() => activities.map(activity => {
    const counts = activityCounts.get(normalize(activity.name)) || { enrolled: 0, credentialed: 0 };
    return {
      ...activity,
      enrolled: Math.max(activity.enrolled || 0, counts.enrolled),
      credentialed: Math.max(activity.credentialed || 0, counts.credentialed),
    };
  }), [activities, activityCounts]);

  const statCards = [
    {
      label: 'Total de Inscritos', value: total, icon: <Users size={20} />,
      color: 'from-blue-500/20 to-blue-600/10', iconColor: 'text-blue-400',
      border: 'border-blue-500/20', sub: `${confirmed} confirmados`,
    },
    {
      label: 'Credenciados', value: credenciados, icon: <UserCheck size={20} />,
      color: 'from-green-500/20 to-green-600/10', iconColor: 'text-green-400',
      border: 'border-green-500/20', sub: `${asPercent(credenciados, total)}% do total`,
    },
    {
      label: 'Pendentes', value: pendentes, icon: <Clock size={20} />,
      color: 'from-yellow-500/20 to-yellow-600/10', iconColor: 'text-yellow-400',
      border: 'border-yellow-500/20', sub: 'Aguardam credenciamento',
    },
    {
      label: 'Funcionários Ativos', value: activeStaff, icon: <Users size={20} />,
      color: 'from-purple-500/20 to-purple-600/10', iconColor: 'text-purple-400',
      border: 'border-purple-500/20', sub: `${activeRoles} cargos ativos`,
    },
    {
      label: 'Atividades', value: activities.length, icon: <Activity size={20} />,
      color: 'from-pink-500/20 to-pink-600/10', iconColor: 'text-pink-400',
      border: 'border-pink-500/20', sub: `${activityRows.reduce((sum, a) => sum + a.enrolled, 0)} inscrições em atividades`,
    },
    {
      label: 'Crescimento', value: growth.value, icon: <TrendingUp size={20} />,
      color: 'from-cyan-500/20 to-cyan-600/10', iconColor: 'text-cyan-400',
      border: 'border-cyan-500/20', sub: growth.sub,
    },
  ];

  const shortcuts = [
    { label: 'Inscrições', icon: <FileText size={16} />, path: '/inscricoes', moduleKey: 'inscriptions', permission: 'search' as const, roles: ['checkin', 'admin', 'super_admin'], color: 'text-green-400' },
    { label: 'Credenciamento', icon: <UserCheck size={16} />, path: '/credenciamento', moduleKey: 'credentialing', permission: 'credential' as const, roles: ['checkin', 'admin', 'super_admin'], color: 'text-blue-400' },
    { label: 'Site Público', icon: <Globe size={16} />, path: '/site-publico', moduleKey: 'publicSite', permission: 'edit_public_site' as const, roles: ['admin', 'super_admin'], color: 'text-blue-400' },
    { label: 'Site da Equipe', icon: <Building2 size={16} />, path: '/site-equipe', moduleKey: 'teamSite', permission: 'edit_team_site' as const, roles: ['admin', 'super_admin'], color: 'text-cyan-400' },
    { label: 'Relatórios', icon: <BarChart3 size={16} />, path: '/relatorios', moduleKey: 'reports', permission: 'view_reports' as const, roles: ['admin', 'super_admin'], color: 'text-orange-400' },
    { label: 'Configurações', icon: <Settings size={16} />, path: '/configuracoes', moduleKey: 'settings', permission: 'access_settings' as const, roles: ['admin', 'super_admin'], color: 'text-gray-400' },
    { label: 'Funcionários', icon: <Users size={16} />, path: '/funcionarios', moduleKey: 'staff', permission: 'manage_staff' as const, roles: ['super_admin'], color: 'text-purple-400' },
    { label: 'Cargos', icon: <Shield size={16} />, path: '/cargos', moduleKey: 'roles', permission: 'manage_roles' as const, roles: ['super_admin'], color: 'text-pink-400' },
  ];
  const shortcutOrder = teamSite.moduleOrder || [];
  const visibleShortcuts = shortcuts
    .filter(s => teamSite.modules?.[s.moduleKey] !== false)
    .filter(s => s.roles.includes(currentRole.id) && hasPermission(s.permission))
    .sort((a, b) => {
      const aIndex = shortcutOrder.indexOf(a.moduleKey);
      const bIndex = shortcutOrder.indexOf(b.moduleKey);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

  const alerts = [
    pendingConfirmation > 0
      ? { text: `${pendingConfirmation} inscrição(ões) pendente(s) de confirmação`, type: 'warning', icon: <AlertCircle size={14} /> }
      : { text: 'Nenhuma inscrição pendente de confirmação', type: 'success', icon: <CheckCircle size={14} /> },
    pendentes > 0
      ? { text: `${pendentes} participante(s) aguardam credenciamento`, type: 'warning', icon: <Clock size={14} /> }
      : { text: 'Todos os participantes carregados estão credenciados', type: 'success', icon: <UserCheck size={14} /> },
    siteLoadError
      ? { text: siteLoadError, type: 'warning', icon: <Globe size={14} /> }
      : { text: siteContent?.updatedAt ? `Site público sincronizado em ${new Date(siteContent.updatedAt).toLocaleString('pt-BR')}` : 'Site público conectado ao conteúdo atual', type: 'info', icon: <Globe size={14} /> },
  ];

  const alertColors: Record<string, string> = {
    warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    success: 'border-green-500/30 bg-green-500/10 text-green-400',
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Visão Geral</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {eventTitle || 'SIMITEC'} — {dateLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
            siteStatus === 'online'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : siteStatus === 'offline'
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              siteStatus === 'online' ? 'bg-green-400' : siteStatus === 'offline' ? 'bg-red-400' : 'bg-yellow-400'
            } animate-pulse`} />
            Site {siteStatus === 'online' ? 'Online' : siteStatus === 'offline' ? 'Indisponível' : 'Carregando'}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className={`bg-gradient-to-br ${card.color} border ${card.border} rounded-xl p-4 space-y-3`}>
            <div className="flex items-center justify-between">
              <span className={`${card.iconColor}`}>{card.icon}</span>
              <ArrowUpRight size={12} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs font-medium text-foreground mt-0.5">{card.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-foreground">Inscrições por Dia</h3>
              <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
            </div>
            <span className="text-xs text-muted-foreground bg-accent px-2 py-1 rounded-lg">Esta semana</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorInscritos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SIMITEC_BRAND.ocean} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={SIMITEC_BRAND.ocean} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(166,211,233,0.12)" />
              <XAxis dataKey="day" tick={{ fill: '#A6BBC9', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#A6BBC9', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Area type="monotone" dataKey="inscritos" stroke={SIMITEC_BRAND.ocean} fill="url(#colorInscritos)" strokeWidth={2} name="Inscritos" />
              <Area type="monotone" dataKey="credenciados" stroke={SIMITEC_BRAND.mint} fill="transparent" strokeWidth={2} name="Credenciados" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts + Event info */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <AlertCircle size={14} className="text-yellow-400" />
              Alertas
            </h3>
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg border ${alertColors[a.type]} text-xs`}>
                  {a.icon}
                  <span className="leading-tight">{a.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <Calendar size={14} className="text-blue-400" />
              Informações do Evento
            </h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><Calendar size={12} className="text-blue-400" /><span>{dateLabel}</span></div>
              <div className="flex items-center gap-2"><Clock size={12} className="text-blue-400" /><span>{timeLabel}</span></div>
              <div className="flex items-center gap-2"><MapPin size={12} className="text-blue-400" /><span>{locationLabel}</span></div>
              <div className="flex items-center gap-2"><Star size={12} className="text-yellow-400" /><span>{activities.length} atividade(s) programada(s)</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shortcuts */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Acesso Rápido</h3>
          <div className="grid grid-cols-4 gap-3">
            {visibleShortcuts.map((s, i) => (
              <button
                key={i}
                onClick={() => navigate(s.path)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-accent transition-all group"
              >
                <span className={`${s.color} group-hover:scale-110 transition-transform`}>{s.icon}</span>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent history */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">Últimas Alterações</h3>
            {hasPermission('view_history') && (
              <button
                type="button"
                onClick={() => setHistoryModal(true)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <History size={12} /> Ver histórico
              </button>
            )}
          </div>
          <div className="space-y-3">
            {history.slice(0, 5).map((h, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${h.status === 'success' ? 'bg-green-400' : h.status === 'error' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-foreground truncate">{h.action}</p>
                  <p className="text-xs text-muted-foreground">{h.user} · {h.timestamp}</p>
                </div>
              </div>
            ))}
            {!history.length && (
              <div className="rounded-lg border border-border/60 bg-accent/20 px-3 py-4 text-center text-xs text-muted-foreground">
                Nenhuma alteração real registrada nesta sessão.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activities table */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-foreground">Atividades do Evento</h3>
          <button onClick={() => navigate('/inscricoes')} className="text-xs text-primary flex items-center gap-1 hover:underline">
            Ver inscrições <ChevronRight size={12} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Atividade</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Tipo</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Data</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Local</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Inscritos</th>
              </tr>
            </thead>
            <tbody>
              {activityRows.map(a => (
                <tr key={a.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="py-2.5 px-3 text-foreground font-medium">{a.name}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{a.type}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{[a.date, a.time].filter(Boolean).join(' ') || '-'}</td>
                  <td className="py-2.5 px-3 text-muted-foreground truncate max-w-[120px]">{a.location || '-'}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`font-medium ${a.capacity > 0 && a.enrolled >= a.capacity ? 'text-green-400' : 'text-foreground'}`}>
                      {a.enrolled}/{a.capacity || 'sem limite'}
                    </span>
                    {a.capacity > 0 && a.enrolled >= a.capacity && <span className="ml-1 text-green-400">✓</span>}
                  </td>
                </tr>
              ))}
              {!activityRows.length && (
                <tr>
                  <td colSpan={5} className="py-8 px-3 text-center text-muted-foreground">
                    Nenhuma atividade cadastrada no site público/banco de dados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl max-h-[88vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <History size={18} className="text-primary" /> Histórico de Alterações
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Ações importantes registradas no painel da equipe.</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModal(false)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[68vh] overflow-y-auto p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Total', value: history.length, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                  { label: 'Sucesso', value: history.filter(h => h.status === 'success').length, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
                  { label: 'Alertas/Erros', value: history.filter(h => h.status !== 'success').length, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
                ].map(item => (
                  <div key={item.label} className={`rounded-xl border p-3 ${item.color}`}>
                    <p className="text-xs opacity-80">{item.label}</p>
                    <p className="text-2xl font-bold mt-1">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-accent/30">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Ação</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Área</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Usuário</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Data/Hora</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry) => (
                      <tr key={entry.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                        <td className="py-3 px-4">
                          <p className="text-sm text-foreground">{entry.action}</p>
                          {(entry.before || entry.after) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {entry.before && <>Antes: <span className="text-foreground">{entry.before}</span></>}
                              {entry.before && entry.after && <span className="mx-1">→</span>}
                              {entry.after && <>Depois: <span className="text-foreground">{entry.after}</span></>}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{entry.area}</td>
                        <td className="py-3 px-4 text-xs text-foreground">{entry.user}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">{entry.timestamp}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            entry.status === 'success'
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : entry.status === 'error'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          }`}>
                            {entry.status === 'success' ? 'Sucesso' : entry.status === 'error' ? 'Erro' : 'Alerta'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!history.length && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                          Nenhuma alteração registrada ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
