import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import { SIMITEC_BRAND, SIMITEC_EDITOR_SWATCHES } from '../lib/brand';
import { toast } from 'sonner';
import {
  Save, Building2, Lock, Layout, MessageSquare, Palette, RotateCcw,
  Upload, Eye, Loader2, Shield, GripVertical, Info, CheckCircle2
} from 'lucide-react';

type Tab = 'login' | 'painel' | 'modulos' | 'mensagens' | 'visual';

type TeamSite = {
  loginTitle: string;
  loginSubtitle: string;
  panelName: string;
  welcomeText: string;
  internalNotice: string;
  operatorMessage: string;
  supportEmail: string;
  supportPhone: string;
  helpText: string;
  successMessage: string;
  errorMessage: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  compactMode: boolean;
  googleLoginEnabled: boolean;
  passwordRecoveryEnabled: boolean;
  showInternalNotices: boolean;
  showHelpTexts: boolean;
  modules: Record<string, boolean>;
  moduleOrder: string[];
};

const emptyContent = { event: {}, areas: [], schedule: [], faq: [], people: [], gallery: [], ticket: {} };

const MODULES = [
  { key: 'dashboard', label: 'Dashboard', desc: 'Visão geral, indicadores e últimos eventos' },
  { key: 'inscriptions', label: 'Inscrições', desc: 'Cadastro individual, em grupo e controle de inscritos' },
  { key: 'credentialing', label: 'Credenciamento', desc: 'Entrada manual, status e histórico de presença' },
  { key: 'publicSite', label: 'Site Público', desc: 'Conteúdo do site aberto para participantes' },
  { key: 'teamSite', label: 'Site da Equipe', desc: 'Configuração interna do painel dos funcionários' },
  { key: 'reports', label: 'Relatórios', desc: 'PDF, planilha, CSV e painéis externos' },
  { key: 'staff', label: 'Funcionários', desc: 'Contas, cargos, status e permissões da equipe' },
  { key: 'roles', label: 'Cargos', desc: 'Perfis de acesso e permissões por função' },
  { key: 'settings', label: 'Configurações', desc: 'Idioma, segurança, tema e integrações' },
];

const DEFAULT_TEAM_SITE: TeamSite = {
  loginTitle: 'Acesso da Equipe SIMITEC',
  loginSubtitle: 'Painel de credenciamento, inscrições e administração',
  panelName: 'Painel Administrativo',
  welcomeText: 'Bem-vindo ao painel da equipe SIMITEC.',
  internalNotice: 'Verifique inscrições, credenciamentos e relatórios antes do início das atividades.',
  operatorMessage: 'Use apenas contas autorizadas e confira os dados antes de confirmar ações importantes.',
  supportEmail: 'suporte@simitec.com.br',
  supportPhone: '',
  helpText: 'Em caso de dúvida, procure a coordenação técnica do evento.',
  successMessage: 'Alteração salva com sucesso.',
  errorMessage: 'Não foi possível concluir a ação.',
  primaryColor: SIMITEC_BRAND.ocean,
  secondaryColor: SIMITEC_BRAND.mint,
  accentColor: SIMITEC_BRAND.oceanDeep,
  compactMode: false,
  googleLoginEnabled: true,
  passwordRecoveryEnabled: true,
  showInternalNotices: true,
  showHelpTexts: true,
  modules: Object.fromEntries(MODULES.map(module => [module.key, true])),
  moduleOrder: MODULES.map(module => module.key),
};

const COLORS = SIMITEC_EDITOR_SWATCHES;

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_error) {
    throw new Error('O servidor respondeu algo inválido. Reinicie e tente novamente.');
  }
  if (!response.ok) throw new Error(data?.message || 'Não foi possível concluir.');
  return data;
}

function normalizeTeamSite(value: any): TeamSite {
  const raw = value || {};
  const modules = { ...DEFAULT_TEAM_SITE.modules, ...(raw.modules || {}) };
  const moduleOrder = Array.from(new Set([...(raw.moduleOrder || []), ...DEFAULT_TEAM_SITE.moduleOrder]))
    .filter(key => MODULES.some(module => module.key === key));
  return { ...DEFAULT_TEAM_SITE, ...raw, modules, moduleOrder };
}

export function TeamSiteEditor() {
  const { addHistory, currentUser, hasPermission } = useApp();
  const [tab, setTab] = useState<Tab>('login');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [content, setContent] = useState<any>(emptyContent);
  const [draggingModule, setDraggingModule] = useState<string | null>(null);

  const teamSite = normalizeTeamSite(content.event?.teamSite);
  const orderedModules = useMemo(
    () => teamSite.moduleOrder.map(key => MODULES.find(module => module.key === key)).filter(Boolean) as typeof MODULES,
    [teamSite.moduleOrder]
  );

  const setTeamSite = (patch: Partial<TeamSite>) => {
    setContent((prev: any) => ({
      ...prev,
      event: {
        ...(prev.event || {}),
        teamSite: { ...teamSite, ...patch },
      },
    }));
  };

  const setModuleEnabled = (key: string, enabled: boolean) => {
    setTeamSite({ modules: { ...teamSite.modules, [key]: enabled } });
  };

  const moveModule = (fromKey: string, toKey: string) => {
    if (!fromKey || fromKey === toKey) return;
    const next = [...teamSite.moduleOrder];
    const from = next.indexOf(fromKey);
    const to = next.indexOf(toKey);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setTeamSite({ moduleOrder: next });
  };

  const loadContent = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { content: next } = await api('/api/admin/content');
      setContent({
        ...emptyContent,
        ...(next || {}),
        event: {
          ...((next || {}).event || {}),
          teamSite: normalizeTeamSite((next || {}).event?.teamSite),
        },
      });
      if (silent) toast.success('Versão salva recarregada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar o site da equipe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadContent(); }, []);

  const saveTeamSite = async () => {
    const payload = {
      ...content,
      event: {
        ...(content.event || {}),
        teamSite,
      },
      areas: content.areas || [],
      schedule: content.schedule || [],
      faq: content.faq || [],
      people: content.people || [],
      gallery: content.gallery || [],
      ticket: content.ticket || {},
    };
    const { content: saved } = await api('/api/admin/content', { method: 'PUT', body: JSON.stringify(payload) });
    setContent({
      ...emptyContent,
      ...(saved || {}),
      event: {
        ...((saved || {}).event || {}),
        teamSite: normalizeTeamSite((saved || {}).event?.teamSite),
      },
    });
  };

  const handleSave = async () => {
    if (!hasPermission('edit_team_site')) { toast.error('Sem permissão para editar o site da equipe.'); return; }
    setSaving(true);
    try {
      await saveTeamSite();
      addHistory({ user: currentUser.name, action: 'Salvou site da equipe', area: 'Site da Equipe', status: 'success' });
      toast.success(teamSite.successMessage || 'Site da equipe salvo.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : teamSite.errorMessage || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!hasPermission('publish')) { toast.error('Você não tem permissão para publicar.'); return; }
    setPublishing(true);
    try {
      await saveTeamSite();
      addHistory({ user: currentUser.name, action: 'Publicou site da equipe', area: 'Site da Equipe', before: 'Rascunho', after: 'Publicado', status: 'success' });
      toast.success('Site da equipe publicado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível publicar.');
    } finally {
      setPublishing(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'login', label: 'Login', icon: <Lock size={14} /> },
    { id: 'painel', label: 'Painel', icon: <Building2 size={14} /> },
    { id: 'modulos', label: 'Módulos', icon: <Layout size={14} /> },
    { id: 'mensagens', label: 'Mensagens', icon: <MessageSquare size={14} /> },
    { id: 'visual', label: 'Visual', icon: <Palette size={14} /> },
  ];

  const inputCls = 'w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all';
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1';

  if (loading) {
    return <div className="p-6 h-64 flex items-center justify-center text-muted-foreground"><Loader2 className="animate-spin mr-2" size={18} /> Carregando site da equipe...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Editar Site da Equipe</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Controle real do painel usado pelos funcionários</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => window.open('/funcionarios/', '_blank', 'noopener,noreferrer')} className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-accent transition-all">
            <Eye size={14} /> Visualizar
          </button>
          <button onClick={() => loadContent(true)} className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-accent transition-all">
            <RotateCcw size={14} /> Restaurar salvo
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-3 py-2 bg-accent border border-border rounded-lg text-sm text-foreground hover:bg-accent/80 transition-all disabled:opacity-50">
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Salvar
          </button>
          {hasPermission('publish') && (
            <button onClick={handlePublish} disabled={publishing} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-all disabled:opacity-50">
              {publishing ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />} Publicar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <InfoCard icon={<Building2 size={16} />} label="Nome exibido" value={teamSite.panelName || 'Painel Administrativo'} />
        <InfoCard icon={<Layout size={16} />} label="Módulos ativos" value={`${Object.values(teamSite.modules).filter(Boolean).length}/${MODULES.length}`} />
        <InfoCard icon={<CheckCircle2 size={16} />} label="Status" value="Conectado ao conteúdo real" />
      </div>

      <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all flex-1 justify-center ${tab === t.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}>
            {t.icon} <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        {tab === 'login' && (
          <div className="space-y-5">
            <SectionTitle icon={<Lock size={15} />} title="Tela de login da equipe" desc="Textos e opções usadas no acesso dos funcionários." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelCls}>Título do login</label><input className={inputCls} value={teamSite.loginTitle} onChange={e => setTeamSite({ loginTitle: e.target.value })} /></div>
              <div><label className={labelCls}>Subtítulo do login</label><input className={inputCls} value={teamSite.loginSubtitle} onChange={e => setTeamSite({ loginSubtitle: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ToggleCard checked={teamSite.googleLoginEnabled} onChange={value => setTeamSite({ googleLoginEnabled: value })} label="Login com Google" desc="Mostra o botão e permite usar conta Google autorizada." />
              <ToggleCard checked={teamSite.passwordRecoveryEnabled} onChange={value => setTeamSite({ passwordRecoveryEnabled: value })} label="Recuperação de senha" desc="Mantém a opção de redefinir senha na tela de entrada." />
            </div>
          </div>
        )}

        {tab === 'painel' && (
          <div className="space-y-5">
            <SectionTitle icon={<Building2 size={15} />} title="Identidade do painel" desc="Define como a equipe vê o painel administrativo." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelCls}>Nome exibido do painel</label><input className={inputCls} value={teamSite.panelName} onChange={e => setTeamSite({ panelName: e.target.value })} /></div>
              <div><label className={labelCls}>E-mail de suporte</label><input className={inputCls} value={teamSite.supportEmail} onChange={e => setTeamSite({ supportEmail: e.target.value })} /></div>
              <div><label className={labelCls}>Telefone de suporte</label><input className={inputCls} value={teamSite.supportPhone} onChange={e => setTeamSite({ supportPhone: e.target.value })} /></div>
              <div className="md:col-span-2"><label className={labelCls}>Texto de boas-vindas</label><textarea className={`${inputCls} h-20 resize-none`} value={teamSite.welcomeText} onChange={e => setTeamSite({ welcomeText: e.target.value })} /></div>
              <div className="md:col-span-2"><label className={labelCls}>Aviso interno</label><textarea className={`${inputCls} h-20 resize-none`} value={teamSite.internalNotice} onChange={e => setTeamSite({ internalNotice: e.target.value })} /></div>
            </div>
          </div>
        )}

        {tab === 'modulos' && (
          <div className="space-y-4">
            <SectionTitle icon={<Layout size={15} />} title="Módulos da equipe" desc="Ative, oculte e arraste para mudar a ordem no painel. As permissões de cargo continuam valendo." />
            <div className="space-y-2">
              {orderedModules.map(module => (
                <div
                  key={module.key}
                  onDragOver={event => event.preventDefault()}
                  onDrop={event => {
                    event.preventDefault();
                    moveModule(String(event.dataTransfer.getData('text/plain')), module.key);
                    setDraggingModule(null);
                  }}
                  className={`rounded-lg border transition-all ${draggingModule === module.key ? 'border-primary bg-primary/10 opacity-70' : 'border-border bg-accent/30'}`}
                >
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-3">
                    <button
                      draggable
                      onDragStart={event => {
                        setDraggingModule(module.key);
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', module.key);
                      }}
                      onDragEnd={() => setDraggingModule(null)}
                      className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                      title="Segure e arraste para mudar a posição"
                    >
                      <GripVertical size={16} />
                    </button>
                    <div>
                      <p className="text-sm font-medium text-foreground">{module.label}</p>
                      <p className="text-xs text-muted-foreground">{module.desc}</p>
                    </div>
                    <Switch checked={teamSite.modules[module.key] !== false} onChange={value => setModuleEnabled(module.key, value)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'mensagens' && (
          <div className="space-y-5">
            <SectionTitle icon={<MessageSquare size={15} />} title="Mensagens internas" desc="Textos de ajuda, erro e sucesso usados pelos operadores." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><label className={labelCls}>Mensagem para operadores</label><textarea className={`${inputCls} h-20 resize-none`} value={teamSite.operatorMessage} onChange={e => setTeamSite({ operatorMessage: e.target.value })} /></div>
              <div className="md:col-span-2"><label className={labelCls}>Texto de ajuda</label><textarea className={`${inputCls} h-20 resize-none`} value={teamSite.helpText} onChange={e => setTeamSite({ helpText: e.target.value })} /></div>
              <div><label className={labelCls}>Mensagem de sucesso</label><input className={inputCls} value={teamSite.successMessage} onChange={e => setTeamSite({ successMessage: e.target.value })} /></div>
              <div><label className={labelCls}>Mensagem de erro</label><input className={inputCls} value={teamSite.errorMessage} onChange={e => setTeamSite({ errorMessage: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ToggleCard checked={teamSite.showInternalNotices} onChange={value => setTeamSite({ showInternalNotices: value })} label="Exibir avisos internos" desc="Mostra avisos configurados dentro do painel." />
              <ToggleCard checked={teamSite.showHelpTexts} onChange={value => setTeamSite({ showHelpTexts: value })} label="Exibir textos de ajuda" desc="Mantém instruções rápidas nas páginas operacionais." />
            </div>
          </div>
        )}

        {tab === 'visual' && (
          <div className="space-y-5">
            <SectionTitle icon={<Palette size={15} />} title="Aparência do painel" desc="Ajustes visuais leves sem trocar a arte principal do projeto." />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ColorField label="Cor primária" value={teamSite.primaryColor} onChange={value => setTeamSite({ primaryColor: value })} />
              <ColorField label="Cor secundária" value={teamSite.secondaryColor} onChange={value => setTeamSite({ secondaryColor: value })} />
              <ColorField label="Cor de apoio" value={teamSite.accentColor} onChange={value => setTeamSite({ accentColor: value })} />
            </div>
            <ToggleCard checked={teamSite.compactMode} onChange={value => setTeamSite({ compactMode: value })} label="Modo compacto" desc="Reduz espaçamentos para caber mais informação na tela do computador." />
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-primary">{icon}</span>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-primary">{icon}<span className="text-xs font-medium text-muted-foreground">{label}</span></div>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-all ${checked ? 'bg-primary' : 'bg-muted'}`}
      aria-pressed={checked}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

function ToggleCard({ checked, onChange, label, desc }: { checked: boolean; onChange: (checked: boolean) => void; label: string; desc: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-accent/30 p-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <div className="flex gap-2">
        <span className="w-9 h-9 rounded-lg border border-border flex-shrink-0" style={{ backgroundColor: value }} />
        <input className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" value={value} onChange={event => onChange(event.target.value)} />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {COLORS.map(color => <button key={color} onClick={() => onChange(color)} className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: color }} title={color} />)}
      </div>
    </div>
  );
}
