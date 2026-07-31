import { useEffect, useRef, useState } from 'react';
import { useApp, type Staff } from '../context/AppContext';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, KeyRound, X, Users, Search, Check } from 'lucide-react';

interface StaffForm {
  name: string;
  email: string;
  roleId: string;
  password: string;
}

function isRealAvatar(url?: string) {
  return Boolean(url && !url.endsWith('/assets/avatar-default.svg') && !url.endsWith('avatar-default.svg'));
}

function StaffAvatar({ staff, sizeClass = 'w-8 h-8 text-xs' }: { staff: Staff; sizeClass?: string }) {
  if (isRealAvatar(staff.avatarUrl)) {
    return (
      <img
        src={staff.avatarUrl}
        alt=""
        className={`${sizeClass} rounded-full object-cover border border-border flex-shrink-0`}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {staff.avatar}
    </div>
  );
}

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  let data: { message?: string } = {};

  if (text) {
    if (contentType.includes('application/json')) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: 'A API retornou um JSON inválido.' };
      }
    } else if (text.trim().startsWith('<')) {
      data = {
        message: 'A rota da API não respondeu corretamente. Reinicie o servidor para carregar as rotas novas.',
      };
    } else {
      data = { message: text };
    }
  }

  if (!response.ok) throw new Error(data?.message || 'Não foi possível concluir a solicitação.');
  if (text && !contentType.includes('application/json') && text.trim().startsWith('<')) {
    throw new Error(data.message);
  }
  return data;
}

export function StaffManager() {
  const { staff, setStaff, roles, addHistory, currentUser, hasPermission, changeStaffRole, refreshData } = useApp();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [form, setForm] = useState<StaffForm>({ name: '', email: '', roleId: roles[0]?.id || '1', password: '' });
  const [resetConfirm, setResetConfirm] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const deletingInactive = useRef(new Set<string>());
  const inactiveCleanupBlocked = useRef(false);

  useEffect(() => {
    if (inactiveCleanupBlocked.current) return;
    const inactive = staff.filter(s => s.status === 'inactive' && s.id !== currentUser.id && !deletingInactive.current.has(s.id));
    if (!inactive.length || !hasPermission('manage_staff')) return;

    inactive.forEach(async (s) => {
      deletingInactive.current.add(s.id);
      try {
        await api(`/api/admin/users/${s.id}`, { method: 'DELETE' });
        setStaff(prev => prev.filter(item => item.id !== s.id));
        addHistory({ user: currentUser.name, action: `Excluiu conta inativa: ${s.name}`, area: 'Funcionários', status: 'success' });
      } catch (error) {
        inactiveCleanupBlocked.current = true;
        toast.error(error instanceof Error ? error.message : `Não foi possível excluir ${s.name}.`);
      } finally {
        deletingInactive.current.delete(s.id);
      }
    });
  }, [staff, currentUser.id, currentUser.name, hasPermission, setStaff, addHistory]);

  if (!hasPermission('manage_staff')) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64">
        <Users size={48} className="text-muted-foreground mb-4" />
        <p className="text-foreground font-medium">Acesso Restrito</p>
        <p className="text-muted-foreground text-sm mt-1">Você não tem permissão para gerenciar funcionários.</p>
      </div>
    );
  }

  const filtered = staff.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || s.roleId === filterRole;
    const matchStatus = !filterStatus || s.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  const openCreate = () => {
    setEditingStaff(null);
    setForm({ name: '', email: '', roleId: roles[0]?.id || '1', password: '' });
    setModalOpen(true);
  };

  const openEdit = (s: Staff) => {
    setEditingStaff(s);
    setForm({ name: s.name, email: s.email, roleId: s.roleId, password: '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!form.email.trim() || !form.email.includes('@')) { toast.error('E-mail inválido'); return; }
    const roleName = roles.find(r => r.id === form.roleId)?.name || '';
    const initials = form.name.split(' ').slice(0,2).map(p => p[0]).join('').toUpperCase();

    if (editingStaff) {
      try {
        if (form.roleId !== editingStaff.roleId) {
          await changeStaffRole(editingStaff.id, form.roleId);
        } else {
          setStaff(prev => prev.map(s => s.id === editingStaff.id ? { ...s, name: form.name, email: form.email, roleId: form.roleId, roleName, avatar: initials } : s));
        }
        addHistory({ user: currentUser.name, action: `Editou funcionário: ${form.name}`, area: 'Funcionários', status: 'success' });
        toast.success('Funcionário atualizado!');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar funcionário.');
        return;
      }
    } else {
      if (staff.find(s => s.email === form.email)) { toast.error('E-mail já cadastrado'); return; }
      if (!form.password || form.password.length < 6) { toast.error('Senha deve ter pelo menos 6 caracteres'); return; }
      const newStaff: Staff = {
        id: String(Date.now()), name: form.name, email: form.email, roleId: form.roleId,
        roleName, status: 'active', lastAccess: 'Nunca acessou', avatar: initials,
      };
      setStaff(prev => [...prev, newStaff]);
      addHistory({ user: currentUser.name, action: `Adicionou funcionário: ${form.name}`, area: 'Funcionários', status: 'success' });
      toast.success(`Funcionário ${form.name} adicionado!`);
    }
    setModalOpen(false);
  };

  const handleDeleteStaff = async (s: Staff) => {
    if (s.id === currentUser.id) {
      toast.error('Você não pode excluir a própria conta.');
      return;
    }
    try {
      await api(`/api/admin/users/${s.id}`, { method: 'DELETE' });
      setStaff(prev => prev.filter(item => item.id !== s.id));
      await refreshData().catch(() => {});
      addHistory({ user: currentUser.name, action: `Excluiu funcionário: ${s.name}`, area: 'Funcionários', status: 'success' });
      toast.success(`Conta de ${s.name} excluída.`);
      setDeleteConfirm(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir funcionário.');
    }
  };

  const handleResetPassword = (s: Staff) => {
    setResetConfirm(null);
    addHistory({ user: currentUser.name, action: `Redefiniu senha de ${s.name}`, area: 'Funcionários', status: 'success' });
    toast.success(`Link de redefinição enviado para ${s.email}`);
  };

  const roleColor = (roleId: string) => roles.find(r => r.id === roleId)?.color || '#6B7280';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Gerenciar Funcionários</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{staff.length} funcionários · {staff.filter(s => s.status === 'active').length} ativos</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-all">
          <Plus size={16} /> Adicionar Funcionário
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">Todos os cargos</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Funcionário</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Cargo</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Último Acesso</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <StaffAvatar staff={s} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: roleColor(s.roleId) }} />
                      {s.roleName}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${s.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
                      {s.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{s.lastAccess}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all" title="Editar">
                        <Edit2 size={14} />
                      </button>
                      {resetConfirm === s.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleResetPassword(s)} className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-all" title="Confirmar"><Check size={14} /></button>
                          <button onClick={() => setResetConfirm(null)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-all" title="Cancelar"><X size={14} /></button>
                        </div>
                      ) : (
                        <button onClick={() => setResetConfirm(s.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Redefinir senha">
                          <KeyRound size={14} />
                        </button>
                      )}
                      {deleteConfirm === s.id ? (
                        <div className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-1">
                          <button onClick={() => handleDeleteStaff(s)} className="p-1.5 rounded-lg text-red-300 hover:text-red-200 hover:bg-red-500/20 transition-all" title="Confirmar exclusão">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all" title="Cancelar exclusão">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setDeleteConfirm(s.id); setResetConfirm(null); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all" title="Excluir conta">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                    Nenhum funcionário encontrado com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-medium text-foreground">{editingStaff ? 'Editar Funcionário' : 'Novo Funcionário'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Nome Completo *</label>
                <input className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do funcionário" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">E-mail *</label>
                <input type="email" className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@simitec.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Cargo *</label>
                <select className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}>
                  {roles.filter(r => r.status === 'active').map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              {!editingStaff && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Senha Inicial *</label>
                  <input type="password" className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-accent transition-all">Cancelar</button>
              <button onClick={handleSave} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-all">
                {editingStaff ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
