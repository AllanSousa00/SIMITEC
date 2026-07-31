import { useEffect, useMemo, useState } from 'react';
import { useApp, type Participant } from '../context/AppContext';
import { toast } from 'sonner';
import { exportRows } from '../utils/exportFiles';
import {
  Search, Filter, Download, Plus, X, Eye, Edit2,
  CheckCircle, XCircle, UserCheck, Clock, FileText,
  ChevronDown, ChevronLeft, ChevronRight, Users, Trash2
} from 'lucide-react';

const PAGE_SIZE = 10;

const emptyNewForm = {
  role: 'Estudante',
  name: '',
  cpf: '',
  email: '',
  phone: '',
  institution: '',
  institutionPlaceId: '',
  institutionAddress: '',
  institutionGoogleMapsUri: '',
  institutionVerifiedAt: '',
  course: '',
  shift: '',
  accessibility: '',
  city: '',
  state: '',
  activity: '',
};

type GroupParticipantDraft = {
  id: string;
  name: string;
  cpf: string;
  email: string;
  phone: string;
};

const createGroupParticipant = (): GroupParticipantDraft => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: '',
  cpf: '',
  email: '',
  phone: '',
});

const createEmptyGroupForm = (activity = '') => ({
  institution: '',
  institutionPlaceId: '',
  institutionAddress: '',
  institutionGoogleMapsUri: '',
  institutionVerifiedAt: '',
  course: '',
  shift: '',
  responsibleName: '',
  responsibleCpf: '',
  responsiblePhone: '',
  responsibleEmail: '',
  city: '',
  state: '',
  activity,
  participants: [createGroupParticipant()],
});

type InstitutionSuggestion = {
  placeId: string;
  code?: string;
  name: string;
  address?: string;
  city?: string;
  uf?: string;
  googleMapsUri?: string;
  verifiedAt?: string;
};

function participantInitials(name = 'Participante') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'P';
}

function participantPhoto(p: Participant) {
  const url = p.avatarUrl || p.photoUrl || p.imageUrl || '';
  return url && !url.endsWith('avatar-default.svg') ? url : '';
}

function ParticipantAvatar({ participant }: { participant: Participant }) {
  const photo = participantPhoto(participant);
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        className="w-14 h-14 rounded-full object-cover border border-border flex-shrink-0"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
      {participantInitials(participant.name)}
    </div>
  );
}

export function Inscriptions() {
  const { participants, setParticipants, activities, addHistory, currentUser, hasPermission, credentialParticipant } = useApp();
  const [search, setSearch] = useState('');
  const [filterActivity, setFilterActivity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCredential, setFilterCredential] = useState('');
  const [page, setPage] = useState(1);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [newModal, setNewModal] = useState(false);
  const [newForm, setNewForm] = useState(emptyNewForm);
  const [groupModal, setGroupModal] = useState(false);
  const [groupForm, setGroupForm] = useState(() => createEmptyGroupForm());
  const [institutionSuggestions, setInstitutionSuggestions] = useState<InstitutionSuggestion[]>([]);
  const [institutionStatus, setInstitutionStatus] = useState('Digite ao menos 3 letras para buscar na base INEP/MEC.');
  const [institutionLoading, setInstitutionLoading] = useState(false);
  const [groupInstitutionSuggestions, setGroupInstitutionSuggestions] = useState<InstitutionSuggestion[]>([]);
  const [groupInstitutionStatus, setGroupInstitutionStatus] = useState('Digite ao menos 3 letras para buscar na base INEP/MEC.');
  const [groupInstitutionLoading, setGroupInstitutionLoading] = useState(false);
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
  const [editModal, setEditModal] = useState<Participant | null>(null);
  const [editForm, setEditForm] = useState<Partial<Participant>>({});

  useEffect(() => {
    if (!newModal || newForm.role !== 'Estudante') return;
    const query = newForm.institution.trim();
    if (newForm.institutionPlaceId) return;
    if (query.length < 3) {
      setInstitutionSuggestions([]);
      setInstitutionStatus('Digite ao menos 3 letras para buscar na base INEP/MEC.');
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setInstitutionLoading(true);
        const response = await fetch(`/api/checkin/institutions/search?q=${encodeURIComponent(query)}`, {
          credentials: 'include',
          signal: controller.signal,
        });
        const data = await response.json();
        const institutions = Array.isArray(data.institutions) ? data.institutions : [];
        setInstitutionSuggestions(institutions);
        setInstitutionStatus(institutions.length ? 'Selecione uma instituição encontrada na base INEP/MEC.' : 'Nenhuma instituição encontrada para esse texto.');
      } catch (error) {
        if (!controller.signal.aborted) {
          setInstitutionSuggestions([]);
          setInstitutionStatus('Não foi possível consultar a base INEP agora.');
        }
      } finally {
        if (!controller.signal.aborted) setInstitutionLoading(false);
      }
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [newForm.institution, newForm.institutionPlaceId, newForm.role, newModal]);

  useEffect(() => {
    if (!groupModal) return;
    const query = groupForm.institution.trim();
    if (groupForm.institutionPlaceId) return;
    if (query.length < 3) {
      setGroupInstitutionSuggestions([]);
      setGroupInstitutionStatus('Digite ao menos 3 letras para buscar na base INEP/MEC.');
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setGroupInstitutionLoading(true);
        const response = await fetch(`/api/checkin/institutions/search?q=${encodeURIComponent(query)}`, {
          credentials: 'include',
          signal: controller.signal,
        });
        const data = await response.json();
        const institutions = Array.isArray(data.institutions) ? data.institutions : [];
        setGroupInstitutionSuggestions(institutions);
        setGroupInstitutionStatus(institutions.length ? 'Selecione uma instituição encontrada na base INEP/MEC.' : 'Nenhuma instituição encontrada para esse texto.');
      } catch (error) {
        if (!controller.signal.aborted) {
          setGroupInstitutionSuggestions([]);
          setGroupInstitutionStatus('Não foi possível consultar a base INEP agora.');
        }
      } finally {
        if (!controller.signal.aborted) setGroupInstitutionLoading(false);
      }
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [groupForm.institution, groupForm.institutionPlaceId, groupModal]);

  const searchableParticipants = useMemo(() => participants.map(participant => ({
    participant,
    searchText: [participant.name, participant.cpf, participant.email, participant.phone].join(' ').toLowerCase(),
    activities: new Set(participant.activities),
  })), [participants]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return searchableParticipants
      .filter(({ participant, searchText, activities }) => {
        const matchSearch = !q || searchText.includes(q);
        const matchActivity = !filterActivity || activities.has(filterActivity);
        const matchStatus = !filterStatus || participant.inscriptionStatus === filterStatus;
        const matchCred = !filterCredential || participant.credentialStatus === filterCredential;
        return matchSearch && matchActivity && matchStatus && matchCred;
      })
      .map(({ participant }) => participant);
  }, [searchableParticipants, search, filterActivity, filterStatus, filterCredential]);

  const totalPages = useMemo(() => Math.ceil(filtered.length / PAGE_SIZE), [filtered.length]);
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const updateParticipant = (id: string, updates: Partial<Participant>) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleConfirmInscription = (p: Participant) => {
    if (!hasPermission('edit_inscription')) { toast.error('Sem permissão'); return; }
    const updates = { inscriptionStatus: 'confirmed' as const };
    updateParticipant(p.id, updates);
    if (selectedParticipant?.id === p.id) setSelectedParticipant({ ...p, ...updates });
    addHistory({ user: currentUser.name, action: `Confirmou inscrição de ${p.name}`, area: 'Inscrições', status: 'success' });
    toast.success(`Inscrição de ${p.name} confirmada!`);
  };

  const handleCancelInscription = (p: Participant) => {
    if (!hasPermission('edit_inscription')) { toast.error('Sem permissão'); return; }
    const updates = { inscriptionStatus: 'cancelled' as const };
    updateParticipant(p.id, updates);
    if (selectedParticipant?.id === p.id) setSelectedParticipant({ ...p, ...updates });
    addHistory({ user: currentUser.name, action: `Cancelou inscrição de ${p.name}`, area: 'Inscrições', status: 'warning' });
    toast.warning(`Inscrição de ${p.name} cancelada.`);
  };

  const handleCredential = async (p: Participant) => {
    if (!hasPermission('credential')) { toast.error('Sem permissão para credenciar'); return; }
    if (p.inscriptionStatus === 'cancelled') {
      toast.error('Inscrição cancelada não pode ser credenciada.');
      return;
    }
    try {
      await credentialParticipant(p, true);
      const updates = {
        credentialStatus: 'credentialed' as const,
        credentialedAt: new Date().toLocaleString('pt-BR'),
        credentialedBy: currentUser.name,
      };
      updateParticipant(p.id, updates);
      if (selectedParticipant?.id === p.id) setSelectedParticipant({ ...p, ...updates });
      addHistory({ user: currentUser.name, action: `Credenciou ${p.name} pela aba Inscrições`, area: 'Inscrições', status: 'success' });
      toast.success(`${p.name} credenciado!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível credenciar.');
    }
  };

  const handleUndoCredential = async (p: Participant) => {
    if (!hasPermission('undo_credential')) { toast.error('Sem permissão para desfazer credenciamento'); return; }
    try {
      await credentialParticipant(p, false);
      const updates = {
        credentialStatus: 'pending' as const,
        credentialedAt: undefined,
        credentialedBy: undefined,
      };
      updateParticipant(p.id, updates);
      if (selectedParticipant?.id === p.id) setSelectedParticipant({ ...p, ...updates });
      addHistory({ user: currentUser.name, action: `Desfez credenciamento de ${p.name} pela aba Inscrições`, area: 'Inscrições', status: 'warning' });
      toast.warning(`Credenciamento de ${p.name} desfeito.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível desfazer credenciamento.');
    }
  };

  const toExportRows = (items: Participant[]) => items.map(p => ({
    ID: p.id,
    'Códigos de inscrição': (p.registrationIds || []).join(', '),
    'Códigos de credencial': (p.ticketCodes || []).join(', '),
    Nome: p.name,
    CPF: p.cpf,
    'E-mail': p.email,
    Telefone: p.phone,
    Tipo: p.role || 'Estudante',
    Instituição: p.institution,
    'Curso/Turma': p.course || '',
    'Turno de estudo': p.shift || '',
    'Período da atividade': p.eventPeriod || '',
    Acessibilidade: p.accessibility || '',
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

  const handleExport = async (format: string, mode: 'general' | 'institutions' | 'complete' = 'general') => {
    if (!hasPermission('export_reports')) { toast.error('Sem permissão para exportar'); return; }
    setPdfMenuOpen(false);
    const sourceRows = mode === 'complete' ? participants : filtered;
    const titles = {
      general: 'Inscrições SIMITEC - Geral',
      institutions: 'Inscrições SIMITEC - Por Instituição',
      complete: 'Inscrições SIMITEC - Completo',
    };
    const today = new Date().toISOString().slice(0, 10);
    const fileNames = {
      general: `simitec-pdf-geral-${today}`,
      institutions: `simitec-pdf-por-instituicao-${today}`,
      complete: `simitec-pdf-completo-com-ausentes-${today}`,
    };
    try {
      await exportRows(format, format === 'PDF' ? titles[mode] : 'Inscrições SIMITEC', toExportRows(sourceRows), {
        reportMode: mode,
        fileName: format === 'PDF' ? fileNames[mode] : `simitec-exportacao-geral-${today}`,
        filters: {
          fonte: 'Painel SIMITEC',
          status: filterStatus || 'Todos',
          tipo: 'Todos',
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível exportar.');
      return;
    }
    addHistory({ user: currentUser.name, action: `Exportou lista de inscritos (${format})`, area: 'Inscrições', status: 'success' });
    toast.success(`Lista exportada em ${format}!`);
  };

  const openCreate = () => {
    setNewForm({ ...emptyNewForm, activity: activities[0]?.name || 'Credenciamento geral' });
    setInstitutionSuggestions([]);
    setInstitutionStatus('Digite ao menos 3 letras para buscar na base INEP/MEC.');
    setNewModal(true);
  };

  const openGroupCreate = () => {
    setGroupForm(createEmptyGroupForm(activities[0]?.name || 'Credenciamento geral'));
    setGroupInstitutionSuggestions([]);
    setGroupInstitutionStatus('Digite ao menos 3 letras para buscar na base INEP/MEC.');
    setGroupModal(true);
  };

  const getAutoPeriod = (activityName = newForm.activity) => {
    const activity = activities.find(a => a.name === activityName);
    const periods = activity?.periods?.filter(p => p.name) || [];
    if (!periods.length) return '';
    const preferred = new Date().getHours() < 12 ? 'Manhã' : 'Tarde';
    const preferredPeriod = periods.find(p => p.name === preferred);
    if (preferredPeriod && !preferredPeriod.full && Number(preferredPeriod.available ?? 1) > 0) return preferredPeriod.name;
    const available = periods.find(p => !p.full && Number(p.available ?? 1) > 0);
    return available?.name || preferredPeriod?.name || periods[0]?.name || '';
  };

  const getAutoPeriodLabel = (activityName = newForm.activity) => {
    const activity = activities.find(a => a.name === activityName);
    const period = getAutoPeriod(activityName);
    if (!period) return 'Sem turno automático para esta atividade';
    const slot = activity?.sessionSlots?.[period];
    const time = slot?.start && slot?.end ? ` · ${slot.start} às ${slot.end}` : '';
    return `${period}${time}`;
  };

  const selectInstitution = (institution: InstitutionSuggestion) => {
    setNewForm(p => ({
      ...p,
      institution: institution.name,
      institutionPlaceId: institution.placeId,
      institutionAddress: institution.address || '',
      institutionGoogleMapsUri: institution.googleMapsUri || '',
      institutionVerifiedAt: institution.verifiedAt || new Date().toISOString(),
      city: institution.city || p.city,
      state: institution.uf || p.state,
    }));
    setInstitutionSuggestions([]);
    setInstitutionStatus(`${[institution.city, institution.uf].filter(Boolean).join(' - ')} · INEP ${institution.code || ''}`.trim());
  };

  const selectGroupInstitution = (institution: InstitutionSuggestion) => {
    setGroupForm(p => ({
      ...p,
      institution: institution.name,
      institutionPlaceId: institution.placeId,
      institutionAddress: institution.address || '',
      institutionGoogleMapsUri: institution.googleMapsUri || '',
      institutionVerifiedAt: institution.verifiedAt || new Date().toISOString(),
      city: institution.city || p.city,
      state: institution.uf || p.state,
    }));
    setGroupInstitutionSuggestions([]);
    setGroupInstitutionStatus(`${[institution.city, institution.uf].filter(Boolean).join(' - ')} · INEP ${institution.code || ''}`.trim());
  };

  const handleCreate = () => {
    if (!hasPermission('create_inscription')) { toast.error('Sem permissão para criar inscrição'); return; }
    if (!newForm.name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!newForm.cpf.trim() && !newForm.email.trim() && !newForm.phone.trim()) {
      toast.error('Informe CPF, e-mail ou telefone.');
      return;
    }
    if (newForm.email && !newForm.email.includes('@')) { toast.error('E-mail inválido'); return; }
    if (newForm.role === 'Estudante' && !newForm.institution.trim()) {
      toast.error('Para estudante, informe a instituição.');
      return;
    }
    if (newForm.role === 'Estudante' && institutionSuggestions.length && !newForm.institutionPlaceId) {
      toast.error('Selecione uma instituição da base INEP/MEC.');
      return;
    }
    const activityName = newForm.activity || activities[0]?.name || 'Credenciamento geral';
    const automaticPeriod = getAutoPeriod(activityName);
    const newParticipant: Participant = {
      id: String(Date.now()),
      name: newForm.name.trim(),
      cpf: newForm.cpf.trim(),
      email: newForm.email.trim().toLowerCase(),
      phone: newForm.phone.trim(),
      role: newForm.role as Participant['role'],
      institution: newForm.role === 'Estudante' ? newForm.institution.trim() : (newForm.institution.trim() || 'Visitante'),
      institutionPlaceId: newForm.institutionPlaceId,
      institutionAddress: newForm.institutionAddress,
      institutionGoogleMapsUri: newForm.institutionGoogleMapsUri,
      institutionVerifiedAt: newForm.institutionVerifiedAt,
      course: newForm.role === 'Estudante' ? newForm.course.trim() : '',
      shift: newForm.role === 'Estudante' ? newForm.shift.trim() : '',
      eventPeriod: automaticPeriod,
      accessibility: newForm.accessibility.trim(),
      city: newForm.city.trim(),
      state: newForm.state.trim().toUpperCase(),
      activities: [activityName],
      inscriptionStatus: 'confirmed',
      credentialStatus: 'pending',
      registeredAt: new Date().toLocaleString('pt-BR'),
    };
    setParticipants(prev => [newParticipant, ...prev]);
    setPage(1);
    setNewModal(false);
    setNewForm(emptyNewForm);
    addHistory({ user: currentUser.name, action: `Criou inscrição de ${newParticipant.name}`, area: 'Inscrições', status: 'success' });
    toast.success(`Inscrição de ${newParticipant.name} criada!`);
  };

  const parseGroupParticipants = () => {
    return groupForm.participants
      .map(member => ({
        name: member.name.trim(),
        cpf: member.cpf.trim(),
        email: member.email.trim(),
        phone: member.phone.trim(),
      }))
      .filter(member => member.name);
  };

  const updateGroupParticipant = (id: string, field: keyof Omit<GroupParticipantDraft, 'id'>, value: string) => {
    setGroupForm(prev => ({
      ...prev,
      participants: prev.participants.map(member => member.id === id ? { ...member, [field]: value } : member),
    }));
  };

  const addGroupParticipant = () => {
    setGroupForm(prev => ({ ...prev, participants: [...prev.participants, createGroupParticipant()] }));
  };

  const removeGroupParticipant = (id: string) => {
    setGroupForm(prev => ({
      ...prev,
      participants: prev.participants.length === 1
        ? [createGroupParticipant()]
        : prev.participants.filter(member => member.id !== id),
    }));
  };

  const handleGroupCreate = () => {
    if (!hasPermission('create_inscription')) { toast.error('Sem permissão para criar inscrição'); return; }
    const members = parseGroupParticipants();
    if (!groupForm.institution.trim()) { toast.error('Informe a instituição do grupo.'); return; }
    if (!groupForm.course.trim()) { toast.error('Informe a turma/série do grupo.'); return; }
    if (!groupForm.responsibleName.trim()) { toast.error('Informe o responsável pelo grupo.'); return; }
    if (!groupForm.responsiblePhone.trim() && !groupForm.responsibleEmail.trim()) {
      toast.error('Informe telefone ou e-mail do responsável.');
      return;
    }
    if (!members.length) { toast.error('Adicione pelo menos um participante com nome.'); return; }
    const invalidEmail = members.find(member => member.email && !member.email.includes('@'));
    if (invalidEmail) {
      toast.error(`E-mail inválido para ${invalidEmail.name}.`);
      return;
    }
    const activityName = groupForm.activity || activities[0]?.name || 'Credenciamento geral';
    const automaticPeriod = getAutoPeriod(activityName);
    const groupId = `GRP-${Date.now()}`;
    const now = new Date().toLocaleString('pt-BR');
    const created = members.map((member, index): Participant => ({
      id: `${Date.now()}-${index}`,
      name: member.name,
      cpf: member.cpf,
      email: (member.email || groupForm.responsibleEmail.trim() || `grupo-${groupId.toLowerCase()}-${index + 1}@simitec.local`).toLowerCase(),
      phone: member.phone || groupForm.responsiblePhone.trim(),
      role: 'Estudante',
      institution: groupForm.institution.trim(),
      institutionPlaceId: groupForm.institutionPlaceId,
      institutionAddress: groupForm.institutionAddress,
      institutionGoogleMapsUri: groupForm.institutionGoogleMapsUri,
      institutionVerifiedAt: groupForm.institutionVerifiedAt,
      course: groupForm.course.trim(),
      shift: groupForm.shift.trim(),
      eventPeriod: automaticPeriod,
      city: groupForm.city.trim(),
      state: groupForm.state.trim().toUpperCase(),
      activities: [activityName],
      inscriptionStatus: 'confirmed',
      credentialStatus: 'pending',
      registeredAt: now,
      groupId,
      groupResponsibleName: groupForm.responsibleName.trim(),
      groupResponsibleCpf: groupForm.responsibleCpf.trim(),
      groupResponsiblePhone: groupForm.responsiblePhone.trim(),
      groupResponsibleEmail: groupForm.responsibleEmail.trim(),
    }));
    setParticipants(prev => [...created, ...prev]);
    setPage(1);
    setGroupModal(false);
    setGroupForm(createEmptyGroupForm());
    addHistory({ user: currentUser.name, action: `Criou ${created.length} inscrições em grupo`, area: 'Inscrições', status: 'success' });
    toast.success(`${created.length} inscrições criadas em grupo!`);
  };

  const openEdit = (p: Participant) => {
    setEditModal(p);
    setEditForm({ name: p.name, email: p.email, phone: p.phone, institution: p.institution, city: p.city });
  };

  const handleSaveEdit = () => {
    if (!editModal) return;
    updateParticipant(editModal.id, editForm);
    addHistory({ user: currentUser.name, action: `Editou dados de ${editModal.name}`, area: 'Inscrições', status: 'success' });
    toast.success('Dados atualizados!');
    setEditModal(null);
  };

  const statusBadge = (status: Participant['inscriptionStatus']) => {
    const map = {
      confirmed: { cls: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Confirmado' },
      pending: { cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'Pendente' },
      cancelled: { cls: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Cancelado' },
    };
    const { cls, label } = map[status];
    return <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
  };

  const credBadge = (status: Participant['credentialStatus']) => {
    return status === 'credentialed'
      ? <span className="text-xs px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20">Credenciado</span>
      : <span className="text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">Pendente</span>;
  };

  const stats = useMemo(() => participants.reduce((acc, participant) => {
    acc.total += 1;
    if (participant.inscriptionStatus === 'confirmed') acc.confirmed += 1;
    if (participant.inscriptionStatus === 'pending') acc.pending += 1;
    if (participant.credentialStatus === 'credentialed') acc.credentialed += 1;
    return acc;
  }, { total: 0, confirmed: 0, pending: 0, credentialed: 0 }), [participants]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Inscrições</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{participants.length} inscritos no total</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {hasPermission('export_reports') && (
            <div className="flex gap-1 flex-wrap">
              <div className="relative">
                <button onClick={() => setPdfMenuOpen(open => !open)} className="px-3 py-2 border border-border rounded-lg text-xs text-foreground hover:bg-accent transition-all flex items-center gap-1">
                  <Download size={12} /> PDFs <ChevronDown size={12} className={`transition-transform ${pdfMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {pdfMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-card shadow-xl z-30 overflow-hidden">
                    {[
                      { label: 'PDF geral', hint: 'Lista filtrada comum', mode: 'general' as const },
                      { label: 'PDF instituições', hint: 'Separado por escola', mode: 'institutions' as const },
                      { label: 'PDF completo com ausentes', hint: 'Todos, presentes e ausentes', mode: 'complete' as const },
                    ].map(option => (
                      <button key={option.mode} onClick={() => handleExport('PDF', option.mode)} className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors">
                        <span className="block text-xs font-medium text-foreground">{option.label}</span>
                        <span className="block text-[11px] text-muted-foreground mt-0.5">{option.hint}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => handleExport('XLSX')} className="px-3 py-2 border border-border rounded-lg text-xs text-foreground hover:bg-accent transition-all flex items-center gap-1">
                <Download size={12} /> Planilha
              </button>
            </div>
          )}
          {hasPermission('create_inscription') && (
            <>
              <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-all">
                <Plus size={14} /> Inscrição Individual
              </button>
              <button onClick={openGroupCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-all">
                <Users size={14} /> Cadastro em Grupo
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: <FileText size={16} />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Confirmados', value: stats.confirmed, icon: <CheckCircle size={16} />, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'Pendentes', value: stats.pending, icon: <Clock size={16} />, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { label: 'Credenciados', value: stats.credentialed, icon: <UserCheck size={16} />, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
        ].map((s, i) => (
          <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${s.bg}`}>
            <span className={s.color}>{s.icon}</span>
            <div>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            placeholder="Nome, CPF, e-mail ou telefone..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" value={filterActivity} onChange={e => { setFilterActivity(e.target.value); setPage(1); }}>
          <option value="">Todas as atividades</option>
          {activities.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
        </select>
        <select className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">Todos os status</option>
          <option value="confirmed">Confirmado</option>
          <option value="pending">Pendente</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <select className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" value={filterCredential} onChange={e => { setFilterCredential(e.target.value); setPage(1); }}>
          <option value="">Credenciamento</option>
          <option value="credentialed">Credenciado</option>
          <option value="pending">Não credenciado</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Participante</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">CPF</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Instituição</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Atividades</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Inscrição</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Credenciamento</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{p.cpf}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    <div>{p.institution}</div>
                    <div>{p.city}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {p.activities.slice(0,2).map((a, i) => (
                        <span key={i} className="text-xs bg-accent text-muted-foreground px-1.5 py-0.5 rounded">{a.split(' ')[0]}</span>
                      ))}
                      {p.activities.length > 2 && <span className="text-xs text-muted-foreground">+{p.activities.length - 2}</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4">{statusBadge(p.inscriptionStatus)}</td>
                  <td className="py-3 px-4">{credBadge(p.credentialStatus)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setSelectedParticipant(p)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all" title="Ver perfil">
                        <Eye size={14} />
                      </button>
                      {hasPermission('edit_inscription') && (
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Editar">
                          <Edit2 size={14} />
                        </button>
                      )}
                      {hasPermission('edit_inscription') && p.inscriptionStatus === 'pending' && (
                        <button onClick={() => handleConfirmInscription(p)} className="p-1.5 rounded-lg text-muted-foreground hover:text-green-400 hover:bg-green-500/10 transition-all" title="Confirmar">
                          <CheckCircle size={14} />
                        </button>
                      )}
                      {hasPermission('credential') && p.credentialStatus === 'pending' && p.inscriptionStatus !== 'cancelled' && (
                        <button onClick={() => handleCredential(p)} className="p-1.5 rounded-lg text-muted-foreground hover:text-green-400 hover:bg-green-500/10 transition-all" title="Credenciar">
                          <UserCheck size={14} />
                        </button>
                      )}
                      {hasPermission('undo_credential') && p.credentialStatus === 'credentialed' && (
                        <button onClick={() => handleUndoCredential(p)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all" title="Desfazer credenciamento">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">Nenhum inscrito encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-accent disabled:opacity-40 transition-all">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const n = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button key={n} onClick={() => setPage(n)} className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${page === n ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent'}`}>
                    {n}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-accent disabled:opacity-40 transition-all">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Participant profile modal */}
      {selectedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-medium text-foreground">Perfil do Participante</h3>
              <button onClick={() => setSelectedParticipant(null)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <ParticipantAvatar participant={selectedParticipant} />
                <div>
                  <p className="text-base font-semibold text-foreground">{selectedParticipant.name}</p>
                  <p className="text-sm text-muted-foreground">#{selectedParticipant.id.padStart(4,'0')}</p>
                  <div className="flex gap-2 mt-1">
                    {statusBadge(selectedParticipant.inscriptionStatus)}
                    {credBadge(selectedParticipant.credentialStatus)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Código interno', value: `#${selectedParticipant.id.padStart(4,'0')}` },
                  { label: 'CPF', value: selectedParticipant.cpf },
                  { label: 'Tipo', value: selectedParticipant.role || 'Estudante' },
                  { label: 'E-mail', value: selectedParticipant.email },
                  { label: 'Telefone', value: selectedParticipant.phone },
                  { label: 'Instituição', value: selectedParticipant.institution },
                  ...(selectedParticipant.role !== 'Visitante' ? [
                    { label: 'Curso/Turma', value: selectedParticipant.course || '-' },
                    { label: 'Turno de estudo', value: selectedParticipant.shift || '-' },
                  ] : []),
                  { label: 'Período da atividade', value: selectedParticipant.eventPeriod || '-' },
                  { label: 'Acessibilidade', value: selectedParticipant.accessibility || '-' },
                  { label: 'Cidade/UF', value: `${selectedParticipant.city}/${selectedParticipant.state}` },
                  { label: 'Inscrito em', value: selectedParticipant.registeredAt },
                  { label: 'Status da inscrição', value: selectedParticipant.inscriptionStatus === 'confirmed' ? 'Confirmada' : selectedParticipant.inscriptionStatus === 'pending' ? 'Pendente' : 'Cancelada' },
                  { label: 'Status do credenciamento', value: selectedParticipant.credentialStatus === 'credentialed' ? 'Credenciado' : 'Pendente' },
                ].map((f, i) => (
                  <div key={i} className="bg-accent/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">{f.label}</p>
                    <p className="text-sm font-medium text-foreground">{f.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Atividades Inscritas</p>
                <div className="space-y-2">
                  {selectedParticipant.activities.map((a, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-accent/30 px-3 py-2">
                      <span className="text-xs text-foreground">{a}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${selectedParticipant.credentialStatus === 'credentialed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
                        {selectedParticipant.credentialStatus === 'credentialed' ? 'Entrada validada' : 'Aguardando'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {!!selectedParticipant.ticketCodes?.length && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Códigos / QR vinculados</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedParticipant.ticketCodes.map((code, i) => (
                      <span key={`${code}-${i}`} className="text-xs bg-accent text-foreground border border-border px-2.5 py-1 rounded-lg font-mono">{code}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedParticipant.credentialStatus === 'credentialed' && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-xs font-medium text-blue-400 mb-1 flex items-center gap-1"><UserCheck size={12} /> Credenciamento</p>
                  <p className="text-xs text-muted-foreground">Credenciado em: <span className="text-foreground">{selectedParticipant.credentialedAt}</span></p>
                  <p className="text-xs text-muted-foreground">Operador: <span className="text-foreground">{selectedParticipant.credentialedBy}</span></p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {hasPermission('credential') && selectedParticipant.credentialStatus === 'pending' && selectedParticipant.inscriptionStatus !== 'cancelled' && (
                  <button onClick={() => handleCredential(selectedParticipant)} className="flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-all">
                    <UserCheck size={16} /> Credenciar
                  </button>
                )}
                {hasPermission('undo_credential') && selectedParticipant.credentialStatus === 'credentialed' && (
                  <button onClick={() => handleUndoCredential(selectedParticipant)} className="flex items-center justify-center gap-2 py-2.5 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/10 transition-all">
                    <X size={16} /> Desfazer credenciamento
                  </button>
                )}
                {hasPermission('edit_inscription') && selectedParticipant.inscriptionStatus === 'pending' && (
                  <button onClick={() => handleConfirmInscription(selectedParticipant)} className="flex items-center justify-center gap-2 py-2.5 border border-green-500/30 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/10 transition-all">
                    <CheckCircle size={16} /> Confirmar inscrição
                  </button>
                )}
                {hasPermission('edit_inscription') && selectedParticipant.inscriptionStatus !== 'cancelled' && (
                  <button onClick={() => handleCancelInscription(selectedParticipant)} className="flex items-center justify-center gap-2 py-2.5 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/10 transition-all">
                    <XCircle size={16} /> Cancelar inscrição
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group inscription modal */}
      {groupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-medium text-foreground">Cadastro em Grupo</h3>
              <button onClick={() => setGroupModal(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Instituição ou escola *</label>
                  <div className="relative">
                    <input
                      className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Digite ao menos 3 letras"
                      value={groupForm.institution}
                      onChange={e => setGroupForm(p => ({
                        ...p,
                        institution: e.target.value,
                        institutionPlaceId: '',
                        institutionAddress: '',
                        institutionGoogleMapsUri: '',
                        institutionVerifiedAt: '',
                      }))}
                    />
                    {groupInstitutionSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
                        {groupInstitutionSuggestions.map((institution) => (
                          <button
                            key={institution.placeId}
                            type="button"
                            onClick={() => selectGroupInstitution(institution)}
                            className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b border-border/60 last:border-0"
                          >
                            <span className="block text-xs font-medium text-foreground">{institution.name}</span>
                            <span className="block text-xs text-muted-foreground">
                              {[institution.city, institution.uf].filter(Boolean).join(' - ') || 'INEP/MEC'} · INEP {institution.code}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className={`text-xs mt-1 ${groupForm.institutionPlaceId ? 'text-green-400' : 'text-muted-foreground'}`}>
                    {groupInstitutionLoading ? 'Buscando na base INEP/MEC...' : groupInstitutionStatus}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Turma / série / curso *</label>
                  <input
                    className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Ex: 6º ano A"
                    value={groupForm.course}
                    onChange={e => setGroupForm(p => ({ ...p, course: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Turno da turma</label>
                  <select
                    className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={groupForm.shift}
                    onChange={e => setGroupForm(p => ({ ...p, shift: e.target.value }))}
                  >
                    <option value="">Não informado</option>
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                    <option value="Integral">Integral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Atividade *</label>
                  <select
                    className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={groupForm.activity}
                    onChange={e => setGroupForm(p => ({ ...p, activity: e.target.value }))}
                  >
                    {activities.length === 0 && <option value="Credenciamento geral">Credenciamento geral</option>}
                    {activities.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Responsável *</label>
                  <input
                    className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Nome do responsável"
                    value={groupForm.responsibleName}
                    onChange={e => setGroupForm(p => ({ ...p, responsibleName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">CPF do responsável</label>
                  <input
                    className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="000.000.000-00"
                    value={groupForm.responsibleCpf}
                    onChange={e => setGroupForm(p => ({ ...p, responsibleCpf: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Telefone do responsável</label>
                  <input
                    className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="(00) 90000-0000"
                    value={groupForm.responsiblePhone}
                    onChange={e => setGroupForm(p => ({ ...p, responsiblePhone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">E-mail do responsável</label>
                  <input
                    type="email"
                    className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="responsavel@email.com"
                    value={groupForm.responsibleEmail}
                    onChange={e => setGroupForm(p => ({ ...p, responsibleEmail: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Cidade</label>
                  <input
                    className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Cidade"
                    value={groupForm.city}
                    onChange={e => setGroupForm(p => ({ ...p, city: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">UF</label>
                  <input
                    className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="PA"
                    value={groupForm.state}
                    onChange={e => setGroupForm(p => ({ ...p, state: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Período automático da atividade</label>
                  <div className="rounded-lg border border-border bg-accent/50 px-3 py-2 text-sm text-foreground">
                    {getAutoPeriodLabel(groupForm.activity)}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground">Participantes *</label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        CPF, e-mail ou telefone são opcionais por aluno; se ficar em branco, será usado o contato do responsável.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addGroupParticipant}
                      className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-all"
                    >
                      <Plus size={13} /> Adicionar participante
                    </button>
                  </div>
                  <div className="space-y-2">
                    {groupForm.participants.map((member, index) => (
                      <div key={member.id} className="rounded-xl border border-border bg-accent/30 p-3">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <p className="text-xs font-medium text-foreground">Participante {index + 1}</p>
                          <button
                            type="button"
                            onClick={() => removeGroupParticipant(member.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Remover participante"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium text-muted-foreground mb-1">Nome completo *</label>
                            <input
                              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                              placeholder="Nome do aluno"
                              value={member.name}
                              onChange={e => updateGroupParticipant(member.id, 'name', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-muted-foreground mb-1">CPF</label>
                            <input
                              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                              placeholder="000.000.000-00"
                              value={member.cpf}
                              onChange={e => updateGroupParticipant(member.id, 'cpf', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-muted-foreground mb-1">E-mail</label>
                            <input
                              type="email"
                              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                              placeholder="email@exemplo.com"
                              value={member.email}
                              onChange={e => updateGroupParticipant(member.id, 'email', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-muted-foreground mb-1">Telefone</label>
                            <input
                              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                              placeholder="(00) 90000-0000"
                              value={member.phone}
                              onChange={e => updateGroupParticipant(member.id, 'phone', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Válidos: {parseGroupParticipants().length} participante(s). O período da atividade será automático: {getAutoPeriodLabel(groupForm.activity)}.
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
                <p className="text-xs text-blue-400 font-medium">
                  Todas as inscrições do grupo serão criadas como confirmadas e pendentes de credenciamento.
                </p>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setGroupModal(false)} className="flex-1 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-accent transition-all">Cancelar</button>
              <button onClick={handleGroupCreate} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-all">
                Criar Grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New inscription modal */}
      {newModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-medium text-foreground">Nova Inscrição</h3>
              <button onClick={() => setNewModal(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Tipo de inscrição presencial *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'Estudante', title: 'Estudante', desc: 'Pede dados escolares' },
                    { value: 'Visitante', title: 'Visitante', desc: 'Cadastro mais simples' },
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setNewForm(p => ({ ...p, role: option.value }))}
                      className={`rounded-xl border p-3 text-left transition-all ${newForm.role === option.value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-accent/30 text-foreground hover:bg-accent'}`}
                    >
                      <span className="block text-sm font-medium">{option.title}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">{option.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'name', label: 'Nome completo *', type: 'text', placeholder: 'Nome do participante' },
                  { key: 'cpf', label: 'CPF', type: 'text', placeholder: '000.000.000-00' },
                  { key: 'email', label: 'E-mail', type: 'email', placeholder: 'email@exemplo.com' },
                  { key: 'phone', label: 'Telefone', type: 'text', placeholder: '(00) 90000-0000' },
                  { key: 'city', label: 'Cidade', type: 'text', placeholder: 'Cidade' },
                  { key: 'state', label: 'UF', type: 'text', placeholder: 'PA' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">{f.label}</label>
                    <input
                      type={f.type}
                      className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder={f.placeholder}
                      value={(newForm as any)[f.key]}
                      onChange={e => setNewForm(p => ({ ...p, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
                {newForm.role === 'Estudante' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Instituição ou escola *</label>
                      <div className="relative">
                        <input
                          className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="Digite ao menos 3 letras"
                          value={newForm.institution}
                          onChange={e => setNewForm(p => ({
                            ...p,
                            institution: e.target.value,
                            institutionPlaceId: '',
                            institutionAddress: '',
                            institutionGoogleMapsUri: '',
                            institutionVerifiedAt: '',
                          }))}
                        />
                        {institutionSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
                            {institutionSuggestions.map((institution) => (
                              <button
                                key={institution.placeId}
                                type="button"
                                onClick={() => selectInstitution(institution)}
                                className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b border-border/60 last:border-0"
                              >
                                <span className="block text-xs font-medium text-foreground">{institution.name}</span>
                                <span className="block text-xs text-muted-foreground">
                                  {[institution.city, institution.uf].filter(Boolean).join(' - ') || 'INEP/MEC'} · INEP {institution.code}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${newForm.institutionPlaceId ? 'text-green-400' : 'text-muted-foreground'}`}>
                        {institutionLoading ? 'Buscando na base INEP/MEC...' : institutionStatus}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Curso / turma / série</label>
                      <input
                        className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="Ex: 2º ano, Informática, turma A"
                        value={newForm.course}
                        onChange={e => setNewForm(p => ({ ...p, course: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Turno em que estuda</label>
                      <select
                        className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        value={newForm.shift}
                        onChange={e => setNewForm(p => ({ ...p, shift: e.target.value }))}
                      >
                        <option value="">Não informado</option>
                        <option value="Manhã">Manhã</option>
                        <option value="Tarde">Tarde</option>
                        <option value="Noite">Noite</option>
                        <option value="Integral">Integral</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Período automático da atividade</label>
                      <div className="rounded-lg border border-border bg-accent/50 px-3 py-2 text-sm text-foreground">
                        {getAutoPeriodLabel()}
                      </div>
                    </div>
                  </>
                )}
                {newForm.role === 'Visitante' && (
                  <div className="md:col-span-2 rounded-xl border border-border bg-accent/30 p-3">
                    <p className="text-xs text-muted-foreground">
                      Visitante não precisa informar instituição, curso ou turno. Basta identificar a pessoa e registrar um contato.
                    </p>
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Observação de acessibilidade</label>
                  <input
                    className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Opcional"
                    value={newForm.accessibility}
                    onChange={e => setNewForm(p => ({ ...p, accessibility: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Atividade *</label>
                  <select
                    className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={newForm.activity}
                    onChange={e => setNewForm(p => ({ ...p, activity: e.target.value }))}
                  >
                    {activities.length === 0 && <option value="Credenciamento geral">Credenciamento geral</option>}
                    {activities.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
                <p className="text-xs text-blue-400 font-medium">
                  A inscrição será criada como confirmada e aguardando credenciamento. O período da atividade será definido automaticamente pelo horário atual: {getAutoPeriodLabel()}.
                </p>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setNewModal(false)} className="flex-1 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-accent transition-all">Cancelar</button>
              <button onClick={handleCreate} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-all">
                Criar Inscrição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-medium text-foreground">Editar Participante</h3>
              <button onClick={() => setEditModal(null)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: 'name', label: 'Nome', type: 'text' },
                { key: 'email', label: 'E-mail', type: 'email' },
                { key: 'phone', label: 'Telefone', type: 'text' },
                { key: 'institution', label: 'Instituição', type: 'text' },
                { key: 'city', label: 'Cidade', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{f.label}</label>
                  <input type={f.type} className="w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={(editForm as any)[f.key] || ''} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setEditModal(null)} className="flex-1 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-accent transition-all">Cancelar</button>
              <button onClick={handleSaveEdit} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-all">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
