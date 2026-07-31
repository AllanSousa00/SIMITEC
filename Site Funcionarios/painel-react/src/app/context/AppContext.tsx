import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SIMITEC_BRAND } from '../lib/brand';

export type Permission =
  | 'view_dashboard' | 'search' | 'create_inscription' | 'edit_inscription'
  | 'delete_inscription' | 'credential' | 'undo_credential'
  | 'view_reports' | 'export_reports' | 'manage_staff' | 'manage_roles'
  | 'edit_public_site' | 'edit_team_site' | 'publish' | 'access_settings'
  | 'access_security' | 'view_history';

export interface Role {
  id: string;
  name: string;
  description: string;
  level: number;
  permissions: Permission[];
  staffCount: number;
  status: 'active' | 'inactive';
  color: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  roleId: string;
  roleName: string;
  status: 'active' | 'inactive';
  lastAccess: string;
  avatar: string;
}

export interface ParticipantActivityRegistration {
  id: string;
  activity: string;
  checkedIn: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
  ticketCode?: string;
}

export interface Participant {
  id: string;
  registrationIds?: string[];
  ticketCodes?: string[];
  activityRegistrations?: ParticipantActivityRegistration[];
  avatarUrl?: string;
  photoUrl?: string;
  imageUrl?: string;
  name: string;
  cpf: string;
  email: string;
  phone: string;
  role?: 'Estudante' | 'Visitante' | 'Professor(a)' | 'Organizador(a)';
  institution: string;
  institutionPlaceId?: string;
  institutionAddress?: string;
  institutionGoogleMapsUri?: string;
  institutionVerifiedAt?: string;
  groupId?: string;
  groupResponsibleName?: string;
  groupResponsibleCpf?: string;
  groupResponsiblePhone?: string;
  groupResponsibleEmail?: string;
  course?: string;
  shift?: string;
  eventPeriod?: string;
  accessibility?: string;
  city: string;
  state: string;
  activities: string[];
  inscriptionStatus: 'confirmed' | 'pending' | 'cancelled';
  credentialStatus: 'credentialed' | 'pending';
  credentialedAt?: string;
  credentialedBy?: string;
  registeredAt: string;
}

export interface Activity {
  id: string;
  slug?: string;
  name: string;
  type: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  enrolled: number;
  credentialed: number;
  periods?: Array<{ name: string; seats?: number; taken?: number; available?: number | null; full?: boolean }>;
  sessionSlots?: Record<string, { start?: string; end?: string }>;
}

export interface HistoryEntry {
  id: string;
  user: string;
  action: string;
  area: string;
  before?: string;
  after?: string;
  timestamp: string;
  status: 'success' | 'error' | 'warning';
}

const ALL_PERMISSIONS: Permission[] = [
  'view_dashboard', 'search', 'create_inscription', 'edit_inscription',
  'delete_inscription', 'credential', 'undo_credential',
  'view_reports', 'export_reports', 'manage_staff', 'manage_roles',
  'edit_public_site', 'edit_team_site', 'publish', 'access_settings',
  'access_security', 'view_history',
];

export const INITIAL_ROLES: Role[] = [
  { id: '1', name: 'Administrador Geral', description: 'Acesso total ao sistema', level: 10, permissions: ALL_PERMISSIONS, staffCount: 2, status: 'active', color: SIMITEC_BRAND.coral },
  { id: '2', name: 'Coordenador', description: 'Gerencia operações do evento', level: 8, permissions: ['view_dashboard','search','create_inscription','edit_inscription','credential','undo_credential','view_reports','export_reports','manage_staff','edit_public_site','edit_team_site','publish','view_history'], staffCount: 3, status: 'active', color: '#F0A24A' },
  { id: '3', name: 'Operador', description: 'Operações de credenciamento e inscrição', level: 5, permissions: ['view_dashboard','search','create_inscription','edit_inscription','credential','view_reports'], staffCount: 8, status: 'active', color: SIMITEC_BRAND.ocean },
  { id: '4', name: 'Apoio de Credenciamento', description: 'Apoio no credenciamento manual', level: 2, permissions: ['credential'], staffCount: 5, status: 'active', color: SIMITEC_BRAND.indigo },
  { id: '5', name: 'Editor do Site', description: 'Edita e publica conteúdo do site público', level: 4, permissions: ['edit_public_site','edit_team_site','publish','view_dashboard'], staffCount: 1, status: 'active', color: SIMITEC_BRAND.mint },
  { id: '6', name: 'Visualizador', description: 'Somente visualização de dados e relatórios', level: 1, permissions: ['view_dashboard','view_reports','search'], staffCount: 2, status: 'active', color: SIMITEC_BRAND.slate },
  { id: '7', name: 'Gerente de Inscrições', description: 'Gerencia inscrições e exporta relatórios', level: 6, permissions: ['view_dashboard','search','create_inscription','edit_inscription','delete_inscription','view_reports','export_reports','view_history'], staffCount: 2, status: 'active', color: '#C75C8A' },
  { id: '8', name: 'Atendimento', description: 'Atendimento ao participante e credenciamento', level: 3, permissions: ['search','create_inscription','credential','view_dashboard'], staffCount: 4, status: 'inactive', color: SIMITEC_BRAND.oceanDeep },
];

export const INITIAL_STAFF: Staff[] = [
  { id: '1', name: 'Ana Silva', email: 'admin@simitec.com', roleId: '1', roleName: 'Administrador Geral', status: 'active', lastAccess: '08/06/2024 14:30', avatar: 'AS' },
  { id: '2', name: 'Carlos Mendes', email: 'carlos@simitec.com', roleId: '2', roleName: 'Coordenador', status: 'active', lastAccess: '08/06/2024 13:15', avatar: 'CM' },
  { id: '3', name: 'Beatriz Santos', email: 'beatriz@simitec.com', roleId: '3', roleName: 'Operador', status: 'active', lastAccess: '08/06/2024 12:00', avatar: 'BS' },
  { id: '4', name: 'Diego Ferreira', email: 'diego@simitec.com', roleId: '3', roleName: 'Operador', status: 'active', lastAccess: '07/06/2024 18:45', avatar: 'DF' },
  { id: '5', name: 'Elena Costa', email: 'elena@simitec.com', roleId: '4', roleName: 'Leitor de QR Code', status: 'active', lastAccess: '08/06/2024 10:20', avatar: 'EC' },
  { id: '6', name: 'Felipe Alves', email: 'felipe@simitec.com', roleId: '5', roleName: 'Editor do Site', status: 'active', lastAccess: '06/06/2024 09:30', avatar: 'FA' },
  { id: '7', name: 'Gabriela Lima', email: 'gabriela@simitec.com', roleId: '7', roleName: 'Gerente de Inscrições', status: 'active', lastAccess: '08/06/2024 11:00', avatar: 'GL' },
  { id: '8', name: 'Henrique Rocha', email: 'henrique@simitec.com', roleId: '6', roleName: 'Visualizador', status: 'inactive', lastAccess: '01/06/2024 08:00', avatar: 'HR' },
  { id: '9', name: 'Isabela Torres', email: 'isabela@simitec.com', roleId: '2', roleName: 'Coordenador', status: 'active', lastAccess: '08/06/2024 15:00', avatar: 'IT' },
  { id: '10', name: 'João Gomes', email: 'joao@simitec.com', roleId: '3', roleName: 'Operador', status: 'active', lastAccess: '08/06/2024 09:45', avatar: 'JG' },
];

const names = ['João Silva','Maria Santos','Pedro Oliveira','Ana Costa','Lucas Ferreira','Juliana Lima','Rafael Mendes','Camila Rocha','Bruno Alves','Fernanda Torres'];
const institutions = ['UFMG','USP','UNICAMP','PUC-MG','CEFET-MG','IFMG','UNB','UFRJ'];
const cities = ['Belo Horizonte','São Paulo','Campinas','Rio de Janeiro','Brasília','Contagem','Betim'];
const allActivities = ['Palestra Principal','Workshop de IA','Mesa Redonda','Minicurso de Python','Hackathon','Painel de Inovação'];

function mkCPF(i: number) {
  const a = String(i + 100).padStart(3,'0');
  const b = String((i*3+50)%999+1).padStart(3,'0');
  const c = String((i*7+20)%999+1).padStart(3,'0');
  const d = String((i*11)%99+1).padStart(2,'0');
  return `${a}.${b}.${c}-${d}`;
}

export const INITIAL_PARTICIPANTS: Participant[] = Array.from({ length: 60 }, (_, i) => ({
  id: String(i + 1),
  name: `${names[i % 10]} ${i + 1}`,
  cpf: mkCPF(i),
  email: `participante${i + 1}@email.com`,
  phone: `(31) 9${String(8000 + i).padStart(4,'0')}-${String(5000 + i).padStart(4,'0')}`,
  institution: institutions[i % institutions.length],
  city: cities[i % cities.length],
  state: 'MG',
  activities: allActivities.slice(0, (i % 3) + 1),
  inscriptionStatus: i % 10 === 0 ? 'pending' : i % 15 === 0 ? 'cancelled' : 'confirmed',
  credentialStatus: i < 35 ? 'credentialed' : 'pending',
  credentialedAt: i < 35 ? `08/06/2024 ${String(8 + Math.floor(i / 5)).padStart(2,'0')}:${String(i % 60).padStart(2,'0')}` : undefined,
  credentialedBy: i < 35 ? INITIAL_STAFF[i % 5].name : undefined,
  registeredAt: `0${Math.max(1, 6 - (i % 5))}/06/2024 10:00`,
}));

export const MOCK_ACTIVITIES: Activity[] = [
  { id: '1', name: 'Palestra Principal', type: 'Palestra', date: '10/06/2024', time: '09:00', location: 'Auditório Principal', capacity: 200, enrolled: 187, credentialed: 0 },
  { id: '2', name: 'Workshop de IA', type: 'Workshop', date: '10/06/2024', time: '14:00', location: 'Sala 101', capacity: 40, enrolled: 38, credentialed: 0 },
  { id: '3', name: 'Mesa Redonda', type: 'Debate', date: '11/06/2024', time: '10:00', location: 'Auditório B', capacity: 100, enrolled: 72, credentialed: 0 },
  { id: '4', name: 'Minicurso de Python', type: 'Minicurso', date: '11/06/2024', time: '14:00', location: 'Laboratório 1', capacity: 30, enrolled: 30, credentialed: 0 },
  { id: '5', name: 'Hackathon', type: 'Competição', date: '12/06/2024', time: '08:00', location: 'Área Externa', capacity: 50, enrolled: 48, credentialed: 0 },
  { id: '6', name: 'Painel de Inovação', type: 'Painel', date: '12/06/2024', time: '15:00', location: 'Auditório Principal', capacity: 200, enrolled: 155, credentialed: 0 },
];

const INITIAL_HISTORY: HistoryEntry[] = [
  { id: '1', user: 'Ana Silva', action: 'Credenciou participante João Silva 1', area: 'Credenciamento', timestamp: '08/06/2024 14:30', status: 'success' },
  { id: '2', user: 'Carlos Mendes', action: 'Publicou site público', area: 'Site Público', before: 'Rascunho', after: 'Publicado', timestamp: '08/06/2024 13:15', status: 'success' },
  { id: '3', user: 'Beatriz Santos', action: 'Adicionou funcionário Felipe Alves', area: 'Funcionários', timestamp: '08/06/2024 12:00', status: 'success' },
  { id: '4', user: 'Diego Ferreira', action: 'Tentou acessar Cargos sem permissão', area: 'Cargos', timestamp: '08/06/2024 11:45', status: 'error' },
  { id: '5', user: 'Ana Silva', action: 'Alterou cargo de Henrique Rocha', area: 'Funcionários', before: 'Operador', after: 'Visualizador', timestamp: '08/06/2024 11:00', status: 'success' },
  { id: '6', user: 'Gabriela Lima', action: 'Exportou lista de inscritos', area: 'Relatórios', timestamp: '08/06/2024 10:30', status: 'success' },
  { id: '7', user: 'Carlos Mendes', action: 'Editou configurações do evento', area: 'Configurações', timestamp: '08/06/2024 09:15', status: 'success' },
  { id: '8', user: 'Isabela Torres', action: 'Cancelou inscrição de participante', area: 'Inscrições', timestamp: '08/06/2024 08:45', status: 'warning' },
];

const ROLE_BY_BACKEND: Record<string, Role> = {
  participant: { id: 'participant', name: 'Participante', description: 'Conta pública do participante, sem acesso ao painel da equipe', level: 0, permissions: [], staffCount: 0, status: 'inactive', color: SIMITEC_BRAND.slate },
  checkin: { id: 'checkin', name: 'Credenciamento', description: 'Busca participantes e controla entradas pelo painel', level: 5, permissions: ['view_dashboard','search','create_inscription','edit_inscription','credential','undo_credential'], staffCount: 0, status: 'active', color: SIMITEC_BRAND.ocean },
  admin: { id: 'admin', name: 'Administração', description: 'Gerencia inscrições, credenciamento, conteúdo dos sites e relatórios', level: 8, permissions: ['view_dashboard','search','create_inscription','edit_inscription','delete_inscription','credential','undo_credential','view_reports','export_reports','edit_public_site','edit_team_site','publish','access_settings','view_history'], staffCount: 0, status: 'active', color: '#F0A24A' },
  super_admin: { id: 'super_admin', name: 'Administrador Geral', description: 'Acesso total ao sistema', level: 10, permissions: ALL_PERMISSIONS, staffCount: 0, status: 'active', color: SIMITEC_BRAND.coral },
};

const STAFF_ROLE_IDS = ['checkin', 'admin', 'super_admin'];
const BACKEND_ROLES = STAFF_ROLE_IDS.map(id => ROLE_BY_BACKEND[id]);

type RoleSettingsMap = Record<string, Partial<Pick<Role, 'name' | 'description' | 'level' | 'permissions' | 'status' | 'color'>>>;

function applyRoleSettings(baseRoles: Role[], roleSettings: RoleSettingsMap = {}, nextStaff: Staff[] = []) {
  return baseRoles.map(role => {
    const settings = roleSettings[role.id] || {};
    const configuredPermissions = Array.isArray(settings.permissions)
      ? settings.permissions.filter(Boolean) as Permission[]
      : [];
    const permissions = configuredPermissions.length ? configuredPermissions : role.permissions;
    return {
      ...role,
      name: settings.name || role.name,
      description: settings.description || role.description,
      level: Number.isFinite(Number(settings.level)) ? Number(settings.level) : role.level,
      color: settings.color || role.color,
      status: settings.status === 'inactive' ? 'inactive' : 'active',
      permissions,
      staffCount: nextStaff.filter((item: Staff) => item.roleId === role.id).length,
    };
  });
}

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data?.message || 'Não foi possível concluir a solicitação.');
  }
  return data;
}

function roleFromBackend(role = 'participant') {
  return ROLE_BY_BACKEND[role] || ROLE_BY_BACKEND.participant;
}

function initials(name = 'Equipe') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'EQ';
}

function formatDateTime(value?: string) {
  if (!value) return 'Nunca acessou';
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch (_error) {
    return value;
  }
}

function toStaff(user: any): Staff {
  const role = roleFromBackend(user.role);
  return {
    id: String(user._id || user.id),
    name: user.name || 'Equipe',
    email: user.email || '',
    roleId: role.id,
    roleName: role.name,
    status: user.emailVerified === false ? 'inactive' : 'active',
    lastAccess: formatDateTime(user.lastLoginAt || user.updatedAt || user.createdAt),
    avatar: initials(user.name || user.email || 'Equipe'),
    avatarUrl: user.avatarUrl || '',
  };
}

function toActivity(area: any): Activity {
  return {
    id: area.slug || area.id || area.title,
    slug: area.slug || area.id || area.title,
    name: area.title || area.shortTitle || 'Atividade',
    type: area.tag || 'Atividade',
    date: area.schedule || '',
    time: area.period || '',
    location: area.location || '',
    capacity: Number(area.seats || area.total || 0),
    enrolled: Number(area.enrolled || area.total || 0),
    credentialed: Number(area.checkedIn || area.credentialed || 0),
    periods: Array.isArray(area.periods) ? area.periods : [],
    sessionSlots: area.sessionSlots || {},
  };
}

function groupRegistrations(registrations: any[]): Participant[] {
  const grouped = new Map<string, Participant>();
  const checkedById = new Map(
    registrations.map((registration) => [
      String(registration._id || registration.id),
      Boolean(registration.checkedIn || registration.checkedInAt),
    ])
  );

  registrations.forEach((registration) => {
    const participant = registration.participant || {};
    const key = String(registration.user || participant.cpf || participant.email || participant.phone || participant.name || registration._id || registration.id);
    const existing = grouped.get(key);
    const activity = registration.activityTitle || 'Credenciamento geral';
    const checked = Boolean(registration.checkedIn || registration.checkedInAt);
    const base: Participant = existing || {
      id: String(registration._id || registration.id),
      registrationIds: [],
      ticketCodes: [],
      avatarUrl: participant.avatarUrl || '',
      photoUrl: participant.photoUrl || '',
      imageUrl: participant.imageUrl || '',
      name: participant.name || 'Participante',
      cpf: participant.cpf || '',
      email: participant.email || '',
      phone: participant.phone || '',
      institution: participant.institution || '',
      city: participant.city || '',
      state: participant.state || '',
      activities: [],
      inscriptionStatus: registration.status === 'cancelled' ? 'cancelled' : registration.status === 'pending' ? 'pending' : 'confirmed',
      credentialStatus: 'pending',
      registeredAt: formatDateTime(registration.createdAt),
    };
    base.registrationIds = [...(base.registrationIds || []), String(registration._id || registration.id)];
    if (registration.ticketCode) base.ticketCodes = [...(base.ticketCodes || []), registration.ticketCode];
    if (!base.activities.includes(activity)) base.activities = [...base.activities, activity];
    base.activityRegistrations = [
      ...(base.activityRegistrations || []),
      {
        id: String(registration._id || registration.id),
        activity,
        checkedIn: checked,
        checkedInAt: checked ? formatDateTime(registration.checkedInAt) : undefined,
        checkedInBy: checked ? (registration.checkedInBy?.name || 'Equipe SIMITEC') : undefined,
        ticketCode: registration.ticketCode || undefined,
      },
    ];
    if (checked) {
      base.credentialedAt = formatDateTime(registration.checkedInAt);
      base.credentialedBy = registration.checkedInBy?.name || 'Equipe SIMITEC';
    }
    grouped.set(key, base);
  });
  return [...grouped.values()].map((participant) => ({
    ...participant,
    credentialStatus: participant.registrationIds?.every((id) => checkedById.get(id)) ? 'credentialed' : 'pending',
  }));
}

interface AppContextType {
  currentUser: Staff;
  currentRole: Role;
  theme: 'dark' | 'light';
  isAuthenticated: boolean;
  roles: Role[];
  staff: Staff[];
  participants: Participant[];
  activities: Activity[];
  history: HistoryEntry[];
  hasPermission: (p: Permission) => boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogleCredential: (credential: string) => Promise<boolean>;
  logout: () => Promise<void>;
  toggleTheme: () => void;
  refreshData: () => Promise<void>;
  credentialParticipant: (participant: Participant, checkedIn?: boolean) => Promise<void>;
  scanCode: (payload: string) => Promise<Participant>;
  changeStaffRole: (staffId: string, roleId: string) => Promise<void>;
  setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
  setStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  addHistory: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<Staff>(INITIAL_STAFF[0]);
  const [currentRole, setCurrentRole] = useState<Role>(ROLE_BY_BACKEND.super_admin);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [roles, setRoles] = useState<Role[]>(BACKEND_ROLES);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const refreshInFlight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    api('/api/auth/me')
      .then(async ({ user }) => {
        if (!user) return;
        const staffUser = toStaff(user);
        const role = roleFromBackend(user.role);
        setCurrentUser(staffUser);
        setCurrentRole(role);
        setIsAuthenticated(true);
        await refreshData();
      })
      .catch(() => {});
  }, []);

  const hasPermission = useCallback((p: Permission) => currentRole.permissions.includes(p), [currentRole.permissions]);

  const refreshData = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current;

    refreshInFlight.current = (async () => {
      const [bootstrap, adminUsers, adminContent] = await Promise.all([
        api('/api/checkin/bootstrap'),
        api('/api/admin/users').catch(() => ({ users: [] })),
        api('/api/admin/content').catch(() => ({ content: null })),
      ]);
      const nextParticipants = groupRegistrations(bootstrap.registrations || []);
      const nextActivities = (bootstrap.areas || []).map(toActivity);
      const nextStaff = (adminUsers.users || []).map(toStaff);
      const nextRoles = applyRoleSettings(BACKEND_ROLES, adminContent.content?.event?.roleSettings || {}, nextStaff);
      setParticipants(nextParticipants);
      setActivities(nextActivities);
      setStaff(nextStaff);
      setRoles(nextRoles);
      setCurrentUser(previous => {
        const updated = nextStaff.find(user => user.id === previous.id || user.email === previous.email);
        return updated || previous;
      });
      setCurrentRole(previous => nextRoles.find(role => role.id === previous.id) || previous);
    })().finally(() => {
      refreshInFlight.current = null;
    });

    return refreshInFlight.current;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const autoRefresh = () => {
      if (document.visibilityState !== 'visible') return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      refreshData().catch(() => {});
    };

    autoRefresh();
    const interval = window.setInterval(autoRefresh, 60000);
    window.addEventListener('focus', autoRefresh);
    window.addEventListener('online', autoRefresh);
    document.addEventListener('visibilitychange', autoRefresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', autoRefresh);
      window.removeEventListener('online', autoRefresh);
      document.removeEventListener('visibilitychange', autoRefresh);
    };
  }, [isAuthenticated, refreshData]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const { user } = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const staffUser = toStaff(user);
      const role = roleFromBackend(user.role);
      if (!['checkin', 'admin', 'super_admin'].includes(role.id)) {
        await api('/api/auth/logout', { method: 'POST', body: '{}' }).catch(() => {});
        return false;
      }
      setCurrentUser(staffUser);
      setCurrentRole(role);
      setIsAuthenticated(true);
      await refreshData();
      return true;
    } catch (_error) {
      return false;
    }
  }, [refreshData]);

  const loginWithGoogleCredential = useCallback(async (credential: string): Promise<boolean> => {
    try {
      const { user } = await api('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential }),
      });
      const staffUser = toStaff(user);
      const role = roleFromBackend(user.role);
      if (!['checkin', 'admin', 'super_admin'].includes(role.id)) {
        await api('/api/auth/logout', { method: 'POST', body: '{}' }).catch(() => {});
        return false;
      }
      setCurrentUser(staffUser);
      setCurrentRole(role);
      setIsAuthenticated(true);
      await refreshData();
      return true;
    } catch (_error) {
      return false;
    }
  }, [refreshData]);

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST', body: '{}' }).catch(() => {});
    setIsAuthenticated(false);
    setParticipants([]);
    setStaff([]);
  }, []);
  const toggleTheme = useCallback(() => setTheme(p => p === 'dark' ? 'light' : 'dark'), []);

  const credentialParticipant = useCallback(async (participant: Participant, checkedIn = true) => {
    const ids = participant.registrationIds?.length ? participant.registrationIds : [participant.id];
    await Promise.all(ids.map(id => api(`/api/checkin/registrations/${id}/checkin`, {
      method: 'PATCH',
      body: JSON.stringify({ checkedIn }),
    })));
    await refreshData();
  }, [refreshData]);

  const scanCode = useCallback(async (payload: string): Promise<Participant> => {
    const data = await api('/api/checkin/scan', {
      method: 'POST',
      body: JSON.stringify({ payload }),
    });
    await refreshData();
    const reg = data.registration;
    const name = reg?.participant?.name;
    return groupRegistrations(reg ? [reg] : []).find(item => item.name === name) || {
      id: String(reg?._id || reg?.id || payload),
      registrationIds: reg ? [String(reg._id || reg.id)] : [],
      ticketCodes: reg?.ticketCode ? [reg.ticketCode] : [],
      name: name || 'Participante',
      cpf: reg?.participant?.cpf || '',
      email: reg?.participant?.email || '',
      phone: reg?.participant?.phone || '',
      institution: reg?.participant?.institution || '',
      city: reg?.participant?.city || '',
      state: '',
      activities: [reg?.activityTitle || 'Credenciamento geral'],
      inscriptionStatus: 'confirmed',
      credentialStatus: 'credentialed',
      credentialedAt: new Date().toLocaleString('pt-BR'),
      credentialedBy: currentUser.name,
      registeredAt: '',
    };
  }, [currentUser.name, refreshData]);

  const changeStaffRole = useCallback(async (staffId: string, roleId: string) => {
    await api(`/api/admin/users/${staffId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role: roleId }),
    });
    await refreshData();
  }, [refreshData]);

  const addHistory = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: String(Date.now()),
      timestamp: new Date().toLocaleString('pt-BR'),
    };
    setHistory(prev => [newEntry, ...prev.slice(0, 49)]);
  }, []);

  const contextValue = useMemo(() => ({
    currentUser, currentRole, theme, isAuthenticated,
    roles, staff, participants, activities, history,
    hasPermission, login, loginWithGoogleCredential, logout, toggleTheme, refreshData,
    credentialParticipant, scanCode, changeStaffRole,
    setRoles, setStaff, setParticipants, addHistory,
  }), [
    currentUser, currentRole, theme, isAuthenticated,
    roles, staff, participants, activities, history,
    hasPermission, login, loginWithGoogleCredential, logout, toggleTheme, refreshData,
    credentialParticipant, scanCode, changeStaffRole, addHistory,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
