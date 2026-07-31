import { useEffect, useMemo, useState } from 'react';
import { useApp, type Role, type Permission } from '../context/AppContext';
import { SIMITEC_ROLE_SWATCHES } from '../lib/brand';
import { toast } from 'sonner';
import { Edit2, Power, Shield, Check, X, Users, Loader2, RotateCcw, Save, AlertTriangle } from 'lucide-react';

const ALL_PERMS: { key: Permission; label: string; group: string; desc: string }[] = [
  { key: 'view_dashboard', label: 'Ver Dashboard', group: 'Visualização', desc: 'Acessa indicadores e visão geral.' },
  { key: 'view_reports', label: 'Ver Relatórios', group: 'Visualização', desc: 'Consulta relatórios internos.' },
  { key: 'export_reports', label: 'Exportar Relatórios', group: 'Visualização', desc: 'Baixa PDF, planilha e CSV.' },
  { key: 'view_history', label: 'Ver Histórico', group: 'Visualização', desc: 'Vê alterações feitas no painel.' },
  { key: 'search', label: 'Buscar Participantes', group: 'Operações', desc: 'Pesquisa inscritos e dados operacionais.' },
  { key: 'create_inscription', label: 'Criar Inscrição', group: 'Operações', desc: 'Cadastra participante individual ou grupo.' },
  { key: 'edit_inscription', label: 'Editar Inscrição', group: 'Operações', desc: 'Altera dados de inscrição.' },
  { key: 'delete_inscription', label: 'Excluir Inscrição', group: 'Operações', desc: 'Cancela/remove inscrições.' },
  { key: 'credential', label: 'Credenciar Participante', group: 'Credenciamento', desc: 'Confirma entrada no evento.' },
  { key: 'undo_credential', label: 'Desfazer Credenciamento', group: 'Credenciamento', desc: 'Remove presença confirmada.' },
  { key: 'manage_staff', label: 'Gerenciar Funcionários', group: 'Administração', desc: 'Cria, edita e desativa equipe.' },
  { key: 'manage_roles', label: 'Gerenciar Cargos', group: 'Administração', desc: 'Altera cargos e permissões.' },
  { key: 'edit_public_site', label: 'Editar Site Público', group: 'Administração', desc: 'Controla conteúdo do site público.' },
  { key: 'edit_team_site', label: 'Editar Site da Equipe', group: 'Administração', desc: 'Controla o painel interno.' },
  { key: 'publish', label: 'Publicar Sites', group: 'Administração', desc: 'Publica alterações dos sites.' },
  { key: 'access_settings', label: 'Acessar Configurações', group: 'Sistema', desc: 'Acessa ajustes gerais.' },
  { key: 'access_security', label: 'Configurar Segurança', group: 'Sistema', desc: 'Configura recursos de proteção.' },
];

const ROLE_ORDER = ['checkin', 'admin', 'super_admin'];
const PERM_GROUPS = [...new Set(ALL_PERMS.map(p => p.group))];
const COLORS = SIMITEC_ROLE_SWATCHES;
const emptyContent = { event: {}, areas: [], schedule: [], faq: [], people: [], gallery: [], ticket: {} };

interface RoleFormData {
  name: string;
  description: string;
  level: number;
  color: string;
  status: 'active' | 'inactive';
  permissions: Permission[];
}

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

function formFromRole(role: Role): RoleFormData {
  return {
    name: role.name,
    description: role.description,
    level: role.level,
    color: role.color,
    status: role.status,
    permissions: [...role.permissions],
  };
}

export function RolesManager() {
  const { roles, staff, addHistory, currentUser, hasPermission, refreshData } = useApp();
  const [content, setContent] = useState<any>(emptyContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form, setForm] = useState<RoleFormData | null>(null);

  const systemRoles = useMemo(
    () => roles.filter(role => ROLE_ORDER.includes(role.id)).sort((a, b) => ROLE_ORDER.indexOf(a.id) - ROLE_ORDER.indexOf(b.id)),
    [roles]
  );

  const roleSettings = content.event?.roleSettings || {};

  const loadContent = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { content: next } = await api('/api/admin/content');
      setContent({ ...emptyContent, ...(next || {}) });
      if (silent) toast.success('Cargos recarregados.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar cargos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadContent(); }, []);

  if (!hasPermission('manage_roles')) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64">
        <Shield size={48} className="text-muted-foreground mb-4" />
        <p className="text-foreground font-medium">Acesso Restrito</p>
        <p className="text-muted-foreground text-sm mt-1">Você não tem permissão para gerenciar cargos.</p>
      </div>
    );
  }

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setForm(formFromRole(role));
    setModalOpen(true);
  };

  const setPermission = (perm: Permission) => {
    setForm(current => {
      if (!current) return current;
      const has = current.permissions.includes(perm);
      return { ...current, permissions: has ? current.permissions.filter(item => item !== perm) : [...current.permissions, perm] };
    });
  };

  const saveContent = async (nextRoleSettings: any) => {
    const payload = {
      ...content,
      event: {
        ...(content.event || {}),
        roleSettings: nextRoleSettings,
      },
      areas: content.areas || [],
      schedule: content.schedule || [],
      faq: content.faq || [],
      people: content.people || [],
      gallery: content.gallery || [],
      ticket: content.ticket || {},
    };
    const { content: saved } = await api('/api/admin/content', { method: 'PUT', body: JSON.stringify(payload) });
    setContent({ ...emptyContent, ...(saved || {}) });
    await refreshData();
  };

  const handleSave = async () => {
    if (!editingRole || !form) return;
    if (!form.name.trim()) { toast.error('Nome do cargo é obrigatório.'); return; }
    if (editingRole.id === 'super_admin' && !form.permissions.includes('manage_roles')) {
      toast.error('Administrador Geral precisa manter acesso a Cargos.');
      return;
    }
    if (editingRole.id === 'super_admin' && form.status === 'inactive') {
      toast.error('Administrador Geral não pode ser desativado.');
      return;
    }

    setSaving(true);
    try {
      const nextRoleSettings = {
        ...roleSettings,
        [editingRole.id]: form,
      };
      await saveContent(nextRoleSettings);
      addHistory({
        user: currentUser.name,
        action: `Editou cargo: ${form.name}`,
        area: 'Cargos',
        before: editingRole.name,
        after: form.name,
        status: 'success',
      });
      toast.success(`Cargo "${form.name}" salvo.`);
      setModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o cargo.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (role: Role) => {
    if (role.id === 'super_admin') {
      toast.error('Administrador Geral não pode ser desativado.');
      return;
    }
    setSaving(true);
    try {
      const nextStatus = role.status === 'active' ? 'inactive' : 'active';
      const nextRoleSettings = {
        ...roleSettings,
        [role.id]: {
          ...formFromRole(role),
          status: nextStatus,
        },
      };
      await saveContent(nextRoleSettings);
      addHistory({ user: currentUser.name, action: `${nextStatus === 'active' ? 'Ativou' : 'Desativou'} cargo: ${role.name}`, area: 'Cargos', status: 'success' });
      toast.success(`Cargo ${nextStatus === 'active' ? 'ativado' : 'desativado'}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível alterar status.');
    } finally {
      setSaving(false);
    }
  };

  const resetRole = async (role: Role) => {
    if (!window.confirm(`Restaurar "${role.name}" para o padrão do sistema?`)) return;
    setSaving(true);
    try {
      const nextRoleSettings = { ...roleSettings };
      delete nextRoleSettings[role.id];
      await saveContent(nextRoleSettings);
      addHistory({ user: currentUser.name, action: `Restaurou cargo padrão: ${role.name}`, area: 'Cargos', status: 'success' });
      toast.success('Cargo restaurado para o padrão.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível restaurar.');
    } finally {
      setSaving(false);
    }
  };

  const getStaffCount = (roleId: string) => staff.filter(s => s.roleId === roleId).length;

  if (loading) {
    return <div className="p-6 h-64 flex items-center justify-center text-muted-foreground"><Loader2 className="animate-spin mr-2" size={18} /> Carregando cargos...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Gerenciar Cargos</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{systemRoles.length} cargos do sistema · {systemRoles.filter(r => r.status === 'active').length} ativos</p>
        </div>
        <button onClick={() => loadContent(true)} className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-accent transition-all">
          <RotateCcw size={14} /> Recarregar
        </button>
      </div>

      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Cargos fixos do sistema</p>
          <p className="text-xs text-muted-foreground mt-0.5">O painel usa apenas Credenciamento, Administração e Administrador Geral. Aqui você muda nome, descrição, cor, status e permissões desses cargos reais.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {systemRoles.map(role => {
          const sc = getStaffCount(role.id);
          const custom = Boolean(roleSettings[role.id]);
          return (
            <div key={role.id} className={`bg-card border rounded-xl p-5 space-y-4 transition-all ${role.status === 'active' ? 'border-border' : 'border-border/50 opacity-70'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${role.color}20`, border: `1px solid ${role.color}40` }}>
                    <Shield size={19} style={{ color: role.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{role.name}</p>
                    <p className="text-xs text-muted-foreground">Nível {role.level} · {custom ? 'Personalizado' : 'Padrão'}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${role.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
                  {role.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <p className="text-xs text-muted-foreground min-h-[42px]">{role.description}</p>

              <div className="grid grid-cols-2 gap-2">
                <Stat icon={<Users size={13} />} label="Funcionários" value={String(sc)} />
                <Stat icon={<Shield size={13} />} label="Permissões" value={String(role.permissions.length)} />
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-[54px]">
                {role.permissions.slice(0, 5).map(permission => (
                  <span key={permission} className="text-[11px] bg-accent text-muted-foreground px-1.5 py-0.5 rounded border border-border/60">{ALL_PERMS.find(item => item.key === permission)?.label || permission}</span>
                ))}
                {role.permissions.length > 5 && <span className="text-[11px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">+{role.permissions.length - 5}</span>}
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => openEdit(role)} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-border rounded-lg text-xs text-foreground hover:bg-accent transition-all">
                  <Edit2 size={12} /> Editar
                </button>
                <button disabled={saving || role.id === 'super_admin'} onClick={() => toggleStatus(role)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 border rounded-lg text-xs transition-all disabled:opacity-50 ${role.status === 'active' ? 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}`}>
                  <Power size={12} /> {role.status === 'active' ? 'Desativar' : 'Ativar'}
                </button>
                <button disabled={saving || !custom} onClick={() => resetRole(role)} className="px-3 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:bg-accent transition-all disabled:opacity-40" title="Restaurar padrão">
                  <RotateCcw size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && editingRole && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="text-base font-medium text-foreground">Editar Cargo</h3>
                <p className="text-xs text-muted-foreground">{editingRole.id}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Nome do Cargo *</label>
                  <input className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" value={form.name} onChange={e => setForm(f => f && ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                  <select className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" value={form.status} disabled={editingRole.id === 'super_admin'} onChange={e => setForm(f => f && ({ ...f, status: e.target.value as RoleFormData['status'] }))}>
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Descrição</label>
                  <input className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" value={form.description} onChange={e => setForm(f => f && ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Nível de Acesso (1-10)</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min={1} max={10} value={form.level} onChange={e => setForm(f => f && ({ ...f, level: Number(e.target.value) }))} className="flex-1 accent-primary" />
                    <span className="text-sm font-medium text-foreground w-6 text-center">{form.level}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Cor de Identificação</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {COLORS.map(color => (
                      <button key={color} onClick={() => setForm(f => f && ({ ...f, color }))} className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === color ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Permissões ({form.permissions.length} selecionadas)</p>
                <div className="space-y-4">
                  {PERM_GROUPS.map(group => (
                    <div key={group} className="rounded-xl border border-border bg-accent/20 p-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{group}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {ALL_PERMS.filter(permission => permission.group === group).map(permission => (
                          <label key={permission.key} className="flex items-start gap-2 cursor-pointer p-2 rounded-lg border border-border bg-card/50 hover:bg-accent/50 transition-all">
                            <input type="checkbox" checked={form.permissions.includes(permission.key)} onChange={() => setPermission(permission.key)} className="accent-primary mt-0.5" />
                            <span>
                              <span className="block text-xs font-medium text-foreground">{permission.label}</span>
                              <span className="block text-[11px] text-muted-foreground">{permission.desc}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-accent transition-all">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                Salvar Cargo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-accent/30 p-2">
      <div className="flex items-center gap-1 text-muted-foreground">{icon}<span className="text-[11px]">{label}</span></div>
      <p className="text-sm font-semibold text-foreground mt-1">{value}</p>
    </div>
  );
}
