import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { SIMITEC_BRAND } from '../lib/brand';
import { toast } from 'sonner';
import {
  Save, Settings as SettingsIcon, Palette, Shield, Bell, Database,
  Link, Globe, Sun, Moon, Lock, Smartphone, Eye, EyeOff, RefreshCw,
  Download, AlertTriangle, Check, Loader2, Server, Mail, BarChart3, ExternalLink, MailCheck
} from 'lucide-react';

type Tab = 'evento' | 'aparencia' | 'seguranca' | 'notificacoes' | 'backup' | 'integracoes' | 'emails';
type AnyObject = Record<string, any>;
type EmailPreview = { id: string; label: string; description: string; subject: string; html: string };

const api = async (path: string, options: RequestInit = {}) => {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Não foi possível concluir a ação.');
  return data;
};

const defaultSettings = {
  interfaceDensity: 'normal',
  security: {
    biometrics: false,
    facialRecognition: false,
    autoLock: true,
    autoLockMinutes: 30,
    blockScreenshots: true,
    maskSensitiveData: true,
    requireConfirmation: true,
    sessionControl: true,
    maxDevices: 3,
  },
  notifications: {
    onSave: true,
    onError: true,
    onCredential: true,
    onRoleChange: true,
    onStaffAdd: true,
    onPublish: true,
    onLogin: true,
    autoDismiss: true,
    autoDismissSeconds: 5,
  },
  backup: {
    frequency: 'daily',
    lastManualBackupAt: '',
  },
  integrations: {
    googleLogin: true,
    googleClientId: '',
    emailProvider: 'smtp',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassConfigured: false,
    analyticsEnabled: false,
    analyticsId: '',
    googleSheetsConfigured: false,
  },
};

const defaultEventConfig = {
  name: 'SIMITEC',
  fullName: 'Semana de Inovação e Metodologias Integradas a Tecnologias',
  year: '2026',
  dateLabel: 'Inscrições abertas',
  startAt: '',
  dateEnd: '',
  timeLabel: '',
  location: '',
  maxParticipants: '500',
  contactEmail: '',
  contactPhone: '',
  timezone: 'America/Fortaleza',
  language: 'pt-BR',
  primaryColor: SIMITEC_BRAND.ocean,
  secondaryColor: SIMITEC_BRAND.mint,
  backgroundColor: SIMITEC_BRAND.navy,
  font: 'Inter',
  buttonStyle: 'rounded',
  publicDarkMode: true,
};

const mergeSettings = (value: AnyObject = {}) => ({
  ...defaultSettings,
  ...value,
  security: { ...defaultSettings.security, ...(value.security || {}) },
  notifications: { ...defaultSettings.notifications, ...(value.notifications || {}) },
  backup: { ...defaultSettings.backup, ...(value.backup || {}) },
  integrations: { ...defaultSettings.integrations, ...(value.integrations || {}) },
});

const eventToForm = (event: AnyObject = {}) => {
  const settings = event.siteSettings || {};
  const footer = event.footer || {};
  return {
    ...defaultEventConfig,
    name: event.name || defaultEventConfig.name,
    fullName: event.fullName || defaultEventConfig.fullName,
    year: event.year || String(event.edition || '').match(/\b(20\d{2})\b/)?.[1] || defaultEventConfig.year,
    dateLabel: event.dateLabel || defaultEventConfig.dateLabel,
    startAt: event.startAt ? String(event.startAt).slice(0, 10) : '',
    dateEnd: event.dateEnd ? String(event.dateEnd).slice(0, 10) : '',
    timeLabel: event.timeLabel || '',
    location: event.location || '',
    maxParticipants: String(event.maxParticipants || defaultEventConfig.maxParticipants),
    contactEmail: footer.email || event.contactEmail || '',
    contactPhone: footer.whatsapp || event.contactPhone || '',
    timezone: event.timezone || defaultEventConfig.timezone,
    language: event.language || defaultEventConfig.language,
    primaryColor: settings.primaryColor || defaultEventConfig.primaryColor,
    secondaryColor: settings.secondaryColor || defaultEventConfig.secondaryColor,
    backgroundColor: settings.backgroundColor || defaultEventConfig.backgroundColor,
    font: settings.font || defaultEventConfig.font,
    buttonStyle: settings.buttonStyle || defaultEventConfig.buttonStyle,
    publicDarkMode: settings.darkMode !== false,
  };
};

export function Settings() {
  const { theme, toggleTheme, addHistory, currentUser, hasPermission, refreshData } = useApp();
  const [tab, setTab] = useState<Tab>('evento');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [content, setContent] = useState<AnyObject | null>(null);
  const [databaseStatus, setDatabaseStatus] = useState('verificando');
  const [eventConfig, setEventConfig] = useState(defaultEventConfig);
  const [adminSettings, setAdminSettings] = useState(defaultSettings);
  const [emailPreviews, setEmailPreviews] = useState<EmailPreview[]>([]);
  const [selectedEmailPreviewId, setSelectedEmailPreviewId] = useState('');
  const [emailPreviewsLoading, setEmailPreviewsLoading] = useState(false);

  const canAccess = hasPermission('access_settings');
  const canSecurity = hasPermission('access_security');
  const canSuperAdmin = currentUser.roleId === 'super_admin';

  const inputCls = 'w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all';
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1';

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'evento', label: 'Evento', icon: <Globe size={14} /> },
    { id: 'aparencia', label: 'Aparência', icon: <Palette size={14} /> },
    { id: 'seguranca', label: 'Segurança', icon: <Shield size={14} /> },
    { id: 'notificacoes', label: 'Notificações', icon: <Bell size={14} /> },
    { id: 'backup', label: 'Backup', icon: <Database size={14} /> },
    { id: 'integracoes', label: 'Integrações', icon: <Link size={14} /> },
    ...(canSuperAdmin ? [{ id: 'emails' as Tab, label: 'E-mails', icon: <MailCheck size={14} /> }] : []),
  ];

  const loadEmailPreviews = async (showToast = false) => {
    try {
      setEmailPreviewsLoading(true);
      const response = await api('/api/admin/email-previews');
      const previews = Array.isArray(response.previews) ? response.previews as EmailPreview[] : [];
      setEmailPreviews(previews);
      setSelectedEmailPreviewId(current => previews.some(item => item.id === current) ? current : previews[0]?.id || '');
      if (showToast) toast.success('Prévias de e-mail atualizadas.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar as prévias de e-mail.');
    } finally {
      setEmailPreviewsLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [contentResponse, healthResponse, sheetsResponse, previewsResponse] = await Promise.all([
        api('/api/admin/content'),
        api('/api/health').catch(() => ({ database: 'offline' })),
        api('/api/admin/google-sheets/status').catch(() => ({ configured: false, spreadsheetId: '' })),
        canSuperAdmin ? api('/api/admin/email-previews').catch(() => ({ previews: [] })) : Promise.resolve({ previews: [] }),
      ]);
      const nextContent = contentResponse.content;
      const nextSettings = mergeSettings(nextContent?.event?.adminSettings || {});
      nextSettings.integrations.googleSheetsConfigured = Boolean(sheetsResponse.configured);
      nextSettings.integrations.googleClientId ||= nextContent?.event?.teamSite?.googleClientId || '';
      setContent(nextContent);
      setEventConfig(eventToForm(nextContent?.event || {}));
      setAdminSettings(nextSettings);
      setDatabaseStatus(healthResponse.database || 'offline');
      const previews = Array.isArray(previewsResponse.previews) ? previewsResponse.previews as EmailPreview[] : [];
      setEmailPreviews(previews);
      setSelectedEmailPreviewId(current => previews.some(item => item.id === current) ? current : previews[0]?.id || '');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar configurações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canAccess) loadSettings();
  }, [canAccess, canSuperAdmin]);

  const patchSettings = (section: keyof typeof defaultSettings, patch: AnyObject) => {
    setAdminSettings(previous => ({
      ...previous,
      [section]: { ...(previous as AnyObject)[section], ...patch },
    }));
  };

  const handleSave = async () => {
    if (!content) return;
    try {
      setSaving(true);
      const currentEvent = content.event || {};
      const nextEvent = {
        ...currentEvent,
        name: eventConfig.name,
        fullName: eventConfig.fullName,
        year: eventConfig.year,
        edition: `SIMITEC ${eventConfig.year}`,
        dateLabel: eventConfig.dateLabel,
        startAt: eventConfig.startAt || null,
        dateEnd: eventConfig.dateEnd || '',
        timeLabel: eventConfig.timeLabel,
        location: eventConfig.location,
        maxParticipants: Number(eventConfig.maxParticipants) || 0,
        timezone: eventConfig.timezone,
        language: eventConfig.language,
        siteSettings: {
          ...(currentEvent.siteSettings || {}),
          primaryColor: eventConfig.primaryColor,
          secondaryColor: eventConfig.secondaryColor,
          backgroundColor: eventConfig.backgroundColor,
          font: eventConfig.font,
          buttonStyle: eventConfig.buttonStyle,
          darkMode: eventConfig.publicDarkMode,
        },
        footer: {
          ...(currentEvent.footer || {}),
          email: eventConfig.contactEmail,
          whatsapp: eventConfig.contactPhone,
        },
        teamSite: {
          ...(currentEvent.teamSite || {}),
          googleLoginEnabled: adminSettings.integrations.googleLogin,
          googleClientId: adminSettings.integrations.googleClientId,
        },
        adminSettings,
      };

      const response = await api('/api/admin/content', {
        method: 'PUT',
        body: JSON.stringify({
          event: nextEvent,
          areas: content.areas || [],
          schedule: content.schedule || [],
          faq: content.faq || [],
          people: content.people || [],
          gallery: content.gallery || [],
          ticket: content.ticket || {},
        }),
      });
      setContent(response.content);
      setEventConfig(eventToForm(response.content?.event || {}));
      setAdminSettings(mergeSettings(response.content?.event?.adminSettings || {}));
      await refreshData().catch(() => {});
      addHistory({ user: currentUser.name, action: `Salvou configurações: ${tab}`, area: 'Configurações', status: 'success' });
      toast.success('Configurações salvas e publicadas.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    if (!canSuperAdmin) {
      toast.error('Apenas Administração Geral pode gerar backup.');
      return;
    }
    try {
      setBackingUp(true);
      const response = await api('/api/admin/backup', { method: 'POST', body: '{}' });
      patchSettings('backup', { lastManualBackupAt: response.createdAt });
      addHistory({ user: currentUser.name, action: 'Gerou backup manual do sistema', area: 'Configurações', status: 'success' });
      toast.success(response.message || 'Backup gerado com sucesso.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível gerar backup.');
    } finally {
      setBackingUp(false);
    }
  };

  const handleSheetsSync = async () => {
    try {
      setSyncingSheets(true);
      const response = await api('/api/admin/google-sheets/sync', { method: 'POST', body: '{}' });
      toast.success(response.message || 'Google Sheets atualizado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível sincronizar Google Sheets.');
    } finally {
      setSyncingSheets(false);
    }
  };

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
    </label>
  );

  const statusCards = useMemo(() => [
    { label: 'Banco de dados', value: databaseStatus === 'connected' ? 'Conectado' : databaseStatus, icon: Server, ok: databaseStatus === 'connected' },
    { label: 'Google Sheets', value: adminSettings.integrations.googleSheetsConfigured ? 'Configurado' : 'Pendente', icon: BarChart3, ok: adminSettings.integrations.googleSheetsConfigured },
    { label: 'Google Login', value: adminSettings.integrations.googleLogin ? 'Ativo' : 'Inativo', icon: Link, ok: adminSettings.integrations.googleLogin },
  ], [databaseStatus, adminSettings]);

  const selectedEmailPreview = useMemo(
    () => emailPreviews.find(item => item.id === selectedEmailPreviewId) || emailPreviews[0],
    [emailPreviews, selectedEmailPreviewId]
  );

  const openEmailPreview = () => {
    if (!selectedEmailPreview) return;
    const url = URL.createObjectURL(new Blob([selectedEmailPreview.html], { type: 'text/html' }));
    const opened = window.open(url, '_blank');
    if (!opened) toast.error('O navegador bloqueou a abertura da prévia.');
    else opened.opener = null;
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  if (!canAccess) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64">
        <SettingsIcon size={48} className="text-muted-foreground mb-4" />
        <p className="text-foreground font-medium">Acesso Restrito</p>
        <p className="text-muted-foreground text-sm mt-1">Você não tem permissão para acessar as configurações.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Configurações</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Controle geral do evento, segurança, notificações, backup e integrações.</p>
        </div>
        <button onClick={handleSave} disabled={saving || loading} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-all disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Salvar Alterações
        </button>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {statusCards.map(item => (
          <article key={item.label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
              <item.icon size={18} />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-semibold text-foreground">{item.value}</p>
            </div>
          </article>
        ))}
      </section>

      <div className="flex gap-1 bg-card border border-border rounded-xl p-1 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all ${tab === t.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}>
            {t.icon} <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground gap-2">
            <Loader2 size={18} className="animate-spin" /> Carregando configurações...
          </div>
        ) : (
          <>
            {tab === 'evento' && (
              <div className="space-y-5">
                <h3 className="text-sm font-medium text-foreground">Dados do Evento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Nome do Evento" labelCls={labelCls}><input className={inputCls} value={eventConfig.name} onChange={e => setEventConfig(p => ({ ...p, name: e.target.value }))} /></Field>
                  <Field label="Nome Completo" labelCls={labelCls}><input className={inputCls} value={eventConfig.fullName} onChange={e => setEventConfig(p => ({ ...p, fullName: e.target.value }))} /></Field>
                  <Field label="Ano" labelCls={labelCls}><input className={inputCls} value={eventConfig.year} onChange={e => setEventConfig(p => ({ ...p, year: e.target.value }))} /></Field>
                  <Field label="Status/Data exibida" labelCls={labelCls}><input className={inputCls} value={eventConfig.dateLabel} onChange={e => setEventConfig(p => ({ ...p, dateLabel: e.target.value }))} /></Field>
                  <Field label="Data de início" labelCls={labelCls}><input type="date" className={inputCls} value={eventConfig.startAt} onChange={e => setEventConfig(p => ({ ...p, startAt: e.target.value }))} /></Field>
                  <Field label="Data de encerramento" labelCls={labelCls}><input type="date" className={inputCls} value={eventConfig.dateEnd} onChange={e => setEventConfig(p => ({ ...p, dateEnd: e.target.value }))} /></Field>
                  <Field label="Horário" labelCls={labelCls}><input className={inputCls} value={eventConfig.timeLabel} onChange={e => setEventConfig(p => ({ ...p, timeLabel: e.target.value }))} placeholder="08h00 às 18h00" /></Field>
                  <Field label="Capacidade máxima" labelCls={labelCls}><input type="number" className={inputCls} value={eventConfig.maxParticipants} onChange={e => setEventConfig(p => ({ ...p, maxParticipants: e.target.value }))} /></Field>
                  <div className="md:col-span-2"><Field label="Local do evento" labelCls={labelCls}><input className={inputCls} value={eventConfig.location} onChange={e => setEventConfig(p => ({ ...p, location: e.target.value }))} /></Field></div>
                  <Field label="E-mail de contato" labelCls={labelCls}><input type="email" className={inputCls} value={eventConfig.contactEmail} onChange={e => setEventConfig(p => ({ ...p, contactEmail: e.target.value }))} /></Field>
                  <Field label="Telefone/WhatsApp" labelCls={labelCls}><input className={inputCls} value={eventConfig.contactPhone} onChange={e => setEventConfig(p => ({ ...p, contactPhone: e.target.value }))} /></Field>
                  <Field label="Fuso horário" labelCls={labelCls}><select className={inputCls} value={eventConfig.timezone} onChange={e => setEventConfig(p => ({ ...p, timezone: e.target.value }))}><option value="America/Fortaleza">América/Fortaleza</option><option value="America/Sao_Paulo">América/São Paulo</option><option value="America/Belem">América/Belém</option></select></Field>
                  <Field label="Idioma padrão" labelCls={labelCls}><select className={inputCls} value={eventConfig.language} onChange={e => setEventConfig(p => ({ ...p, language: e.target.value }))}><option value="pt-BR">Português (Brasil)</option><option value="en-US">English</option><option value="es-ES">Español</option></select></Field>
                </div>
              </div>
            )}

            {tab === 'aparencia' && (
              <div className="space-y-5">
                <h3 className="text-sm font-medium text-foreground">Aparência</h3>
                <div className="flex items-center justify-between p-4 bg-accent/30 rounded-xl border border-border">
                  <div><p className="text-sm font-medium text-foreground">Painel em modo {theme === 'dark' ? 'escuro' : 'claro'}</p><p className="text-xs text-muted-foreground">Altera imediatamente a aparência do painel da equipe.</p></div>
                  <button onClick={toggleTheme} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-accent transition-all">{theme === 'dark' ? <><Sun size={14} /> Modo Claro</> : <><Moon size={14} /> Modo Escuro</>}</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ColorField label="Cor principal" value={eventConfig.primaryColor} onChange={value => setEventConfig(p => ({ ...p, primaryColor: value }))} labelCls={labelCls} inputCls={inputCls} />
                  <ColorField label="Cor secundária" value={eventConfig.secondaryColor} onChange={value => setEventConfig(p => ({ ...p, secondaryColor: value }))} labelCls={labelCls} inputCls={inputCls} />
                  <ColorField label="Fundo público" value={eventConfig.backgroundColor} onChange={value => setEventConfig(p => ({ ...p, backgroundColor: value }))} labelCls={labelCls} inputCls={inputCls} />
                  <Field label="Fonte pública" labelCls={labelCls}><select className={inputCls} value={eventConfig.font} onChange={e => setEventConfig(p => ({ ...p, font: e.target.value }))}>{['Inter','Roboto','Poppins','Open Sans','Montserrat'].map(font => <option key={font}>{font}</option>)}</select></Field>
                  <Field label="Estilo dos botões" labelCls={labelCls}><select className={inputCls} value={eventConfig.buttonStyle} onChange={e => setEventConfig(p => ({ ...p, buttonStyle: e.target.value }))}><option value="rounded">Arredondado</option><option value="square">Quadrado</option><option value="pill">Pílula</option></select></Field>
                  <Field label="Densidade do painel" labelCls={labelCls}><select className={inputCls} value={adminSettings.interfaceDensity} onChange={e => setAdminSettings(p => ({ ...p, interfaceDensity: e.target.value }))}><option value="compacta">Compacta</option><option value="normal">Normal</option><option value="espacada">Espaçada</option></select></Field>
                </div>
                <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg border border-border"><span className="text-sm text-foreground">Modo escuro no site público</span><ToggleSwitch checked={eventConfig.publicDarkMode} onChange={value => setEventConfig(p => ({ ...p, publicDarkMode: value }))} /></div>
              </div>
            )}

            {tab === 'seguranca' && (
              <div className="space-y-5">
                {!canSecurity ? <RestrictedSecurity /> : <>
                  <h3 className="text-sm font-medium text-foreground">Segurança</h3>
                  <ToggleList items={[
                    ['biometrics', 'Autenticação por biometria', 'Permite exigir impressão digital em dispositivos compatíveis.', <Smartphone size={14} />],
                    ['facialRecognition', 'Reconhecimento facial', 'Permite exigir confirmação facial em dispositivos compatíveis.', <Eye size={14} />],
                    ['autoLock', 'Bloqueio automático', `Bloqueia após ${adminSettings.security.autoLockMinutes} minutos de inatividade.`, <Lock size={14} />],
                    ['blockScreenshots', 'Bloquear capturas de tela', 'Política usada pelo app e por telas sensíveis.', <EyeOff size={14} />],
                    ['maskSensitiveData', 'Mascarar dados sensíveis', 'CPF, e-mail e telefone começam protegidos.', <Shield size={14} />],
                    ['requireConfirmation', 'Confirmar ações importantes', 'Evita exclusões e alterações acidentais.', <AlertTriangle size={14} />],
                    ['sessionControl', 'Controle de sessão', `Máximo de ${adminSettings.security.maxDevices} dispositivo(s).`, <Smartphone size={14} />],
                  ]} values={adminSettings.security} onChange={(key, value) => patchSettings('security', { [key]: value })} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Bloqueio após" labelCls={labelCls}><select className={inputCls} value={adminSettings.security.autoLockMinutes} onChange={e => patchSettings('security', { autoLockMinutes: Number(e.target.value) })}>{[5,10,15,30,60,120].map(v => <option key={v} value={v}>{v} minutos</option>)}</select></Field>
                    <Field label="Máx. dispositivos simultâneos" labelCls={labelCls}><select className={inputCls} value={adminSettings.security.maxDevices} onChange={e => patchSettings('security', { maxDevices: Number(e.target.value) })}>{[1,2,3,5,10].map(v => <option key={v} value={v}>{v} dispositivo{v > 1 ? 's' : ''}</option>)}</select></Field>
                  </div>
                </>}
              </div>
            )}

            {tab === 'notificacoes' && (
              <div className="space-y-5">
                <h3 className="text-sm font-medium text-foreground">Notificações</h3>
                <ToggleList items={[
                  ['onSave', 'Ao salvar com sucesso', 'Mostra confirmação clara quando uma alteração é salva.', <Check size={14} />],
                  ['onError', 'Ao ocorrer erro', 'Exibe mensagem visível quando algo falha.', <AlertTriangle size={14} />],
                  ['onCredential', 'Ao credenciar participante', 'Confirma credenciamentos e desfazimentos.', <Shield size={14} />],
                  ['onRoleChange', 'Ao alterar cargo', 'Registra alteração de permissões.', <SettingsIcon size={14} />],
                  ['onStaffAdd', 'Ao adicionar funcionário', 'Confirma criação de acesso da equipe.', <Smartphone size={14} />],
                  ['onPublish', 'Ao publicar site', 'Confirma publicação de conteúdo.', <Globe size={14} />],
                  ['onLogin', 'Ao completar login', 'Confirma entrada autorizada.', <Lock size={14} />],
                ]} values={adminSettings.notifications} onChange={(key, value) => patchSettings('notifications', { [key]: value })} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4">
                  <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg border border-border"><div><p className="text-sm text-foreground">Dispensar automaticamente</p><p className="text-xs text-muted-foreground">Notificações somem sozinhas.</p></div><ToggleSwitch checked={adminSettings.notifications.autoDismiss} onChange={value => patchSettings('notifications', { autoDismiss: value })} /></div>
                  <Field label="Tempo de exibição" labelCls={labelCls}><select className={inputCls} value={adminSettings.notifications.autoDismissSeconds} onChange={e => patchSettings('notifications', { autoDismissSeconds: Number(e.target.value) })}>{[3,5,8,10,15,30].map(v => <option key={v} value={v}>{v} segundos</option>)}</select></Field>
                </div>
              </div>
            )}

            {tab === 'backup' && (
              <div className="space-y-5">
                <h3 className="text-sm font-medium text-foreground">Backup</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Panel title="Backup manual" icon={<Database size={18} className="text-emerald-400" />}>
                    <p className="text-xs text-muted-foreground">Gera uma cópia local do MongoDB com usuários, inscrições e conteúdo.</p>
                    <p className="text-xs text-muted-foreground">Último manual: <span className="text-foreground">{adminSettings.backup.lastManualBackupAt ? new Date(adminSettings.backup.lastManualBackupAt).toLocaleString('pt-BR') : 'Ainda não registrado'}</span></p>
                    <button onClick={handleBackup} disabled={backingUp || !canSuperAdmin} className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 transition-all">{backingUp ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Gerar Backup Agora</button>
                  </Panel>
                  <Panel title="Restauração" icon={<RefreshCw size={18} className="text-amber-400" />}>
                    <p className="text-xs text-muted-foreground">Restauração automática não fica liberada direto na tela para evitar perda acidental de dados.</p>
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2"><AlertTriangle size={14} className="text-amber-400 mt-0.5" /><p className="text-xs text-amber-300">Para restaurar, use um backup validado pela administração geral.</p></div>
                  </Panel>
                </div>
                <Field label="Frequência de backup automático" labelCls={labelCls}><select className={inputCls} value={adminSettings.backup.frequency} onChange={e => patchSettings('backup', { frequency: e.target.value })}><option value="daily">Diário</option><option value="12h">A cada 12 horas</option><option value="6h">A cada 6 horas</option><option value="disabled">Desativado</option></select></Field>
              </div>
            )}

            {tab === 'emails' && canSuperAdmin && (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Prévias de e-mail</h3>
                    <p className="text-xs text-muted-foreground mt-1">Conteúdo demonstrativo, sem contas, links ativos ou qualquer envio.</p>
                  </div>
                  <button onClick={() => loadEmailPreviews(true)} disabled={emailPreviewsLoading} className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-xs text-foreground hover:bg-accent disabled:opacity-50">
                    {emailPreviewsLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Atualizar
                  </button>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {emailPreviews.map(item => (
                    <button key={item.id} onClick={() => setSelectedEmailPreviewId(item.id)} className={`shrink-0 px-3 py-2 rounded-lg border text-left transition-colors ${selectedEmailPreview?.id === item.id ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
                      <span className="block text-xs font-semibold">{item.label}</span>
                      <span className="block mt-0.5 max-w-52 text-[11px] leading-4 opacity-80 whitespace-normal">{item.description}</span>
                    </button>
                  ))}
                </div>

                {selectedEmailPreview ? (
                  <div className="border border-border rounded-lg overflow-hidden bg-background">
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Assunto</p>
                        <p className="text-sm text-foreground font-medium truncate">{selectedEmailPreview.subject}</p>
                      </div>
                      <button onClick={openEmailPreview} className="shrink-0 inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-xs text-foreground hover:bg-accent">
                        <ExternalLink size={14} /> Abrir
                      </button>
                    </div>
                    <iframe
                      title={`Prévia: ${selectedEmailPreview.label}`}
                      srcDoc={selectedEmailPreview.html}
                      sandbox=""
                      referrerPolicy="no-referrer"
                      className="block w-full min-h-[600px] border-0 bg-white"
                    />
                  </div>
                ) : (
                  <div className="py-16 text-center text-sm text-muted-foreground">Nenhuma prévia de e-mail disponível.</div>
                )}
              </div>
            )}

            {tab === 'integracoes' && (
              <div className="space-y-5">
                <h3 className="text-sm font-medium text-foreground">Integrações</h3>
                <Panel title="Google Login" icon={<Link size={18} className="text-blue-400" />}>
                  <div className="flex items-center justify-between"><span className="text-sm text-foreground">Permitir login com Google</span><ToggleSwitch checked={adminSettings.integrations.googleLogin} onChange={value => patchSettings('integrations', { googleLogin: value })} /></div>
                  <Field label="Client ID" labelCls={labelCls}><input className={inputCls} value={adminSettings.integrations.googleClientId} onChange={e => patchSettings('integrations', { googleClientId: e.target.value })} placeholder="...apps.googleusercontent.com" /></Field>
                </Panel>
                <Panel title="E-mail SMTP" icon={<Mail size={18} className="text-emerald-400" />}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Servidor SMTP" labelCls={labelCls}><input className={inputCls} value={adminSettings.integrations.smtpHost} onChange={e => patchSettings('integrations', { smtpHost: e.target.value })} placeholder="smtp.gmail.com" /></Field>
                    <Field label="Porta" labelCls={labelCls}><input className={inputCls} value={adminSettings.integrations.smtpPort} onChange={e => patchSettings('integrations', { smtpPort: Number(e.target.value) || 587 })} /></Field>
                    <Field label="Usuário" labelCls={labelCls}><input className={inputCls} value={adminSettings.integrations.smtpUser} onChange={e => patchSettings('integrations', { smtpUser: e.target.value })} /></Field>
                    <Field label="Senha" labelCls={labelCls}><input disabled className={inputCls} value={adminSettings.integrations.smtpPassConfigured ? 'Configurada no servidor' : 'Não configurada'} /></Field>
                  </div>
                </Panel>
                <Panel title="Google Sheets e Analytics" icon={<BarChart3 size={18} className="text-violet-400" />}>
                  <div className="flex items-center justify-between gap-3 flex-wrap"><span className="text-sm text-foreground">Google Sheets: {adminSettings.integrations.googleSheetsConfigured ? 'configurado' : 'pendente'}</span><button onClick={handleSheetsSync} disabled={syncingSheets} className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-xs text-foreground hover:bg-accent disabled:opacity-50">{syncingSheets ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sincronizar agora</button></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-foreground">Google Analytics</span><ToggleSwitch checked={adminSettings.integrations.analyticsEnabled} onChange={value => patchSettings('integrations', { analyticsEnabled: value })} /></div>
                  {adminSettings.integrations.analyticsEnabled && <Field label="Measurement ID" labelCls={labelCls}><input className={inputCls} value={adminSettings.integrations.analyticsId} onChange={e => patchSettings('integrations', { analyticsId: e.target.value })} placeholder="G-XXXXXXXXXX" /></Field>}
                </Panel>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, labelCls, children }: { label: string; labelCls: string; children: React.ReactNode }) {
  return <div><label className={labelCls}>{label}</label>{children}</div>;
}

function ColorField({ label, value, onChange, labelCls, inputCls }: { label: string; value: string; onChange: (value: string) => void; labelCls: string; inputCls: string }) {
  return (
    <Field label={label} labelCls={labelCls}>
      <div className="flex gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-12 h-10 rounded-lg border border-border bg-card p-1" />
        <input className={inputCls} value={value} onChange={e => onChange(e.target.value)} />
      </div>
    </Field>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="p-4 border border-border rounded-xl space-y-3 bg-accent/10"><div className="flex items-center gap-2"><span>{icon}</span><span className="text-sm font-medium text-foreground">{title}</span></div>{children}</div>;
}

function RestrictedSecurity() {
  return <div className="flex flex-col items-center py-8"><Lock size={32} className="text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">Sem permissão para configurar segurança.</p></div>;
}

function ToggleList({ items, values, onChange }: { items: [string, string, string, React.ReactNode][]; values: AnyObject; onChange: (key: string, value: boolean) => void }) {
  return (
    <div className="space-y-3">
      {items.map(([key, label, desc, icon]) => (
        <div key={key} className="flex items-center justify-between gap-3 p-3 bg-accent/30 rounded-lg border border-border">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-muted-foreground">{icon}</span>
            <div><p className="text-sm text-foreground">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={Boolean(values[key])} onChange={e => onChange(key, e.target.checked)} className="sr-only peer" />
            <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
          </label>
        </div>
      ))}
    </div>
  );
}
