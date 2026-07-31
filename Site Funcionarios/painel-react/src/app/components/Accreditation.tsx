import { useMemo, useState } from 'react';
import { useApp, type Participant } from '../context/AppContext';
import { toast } from 'sonner';
import { UserCheck, Clock, Search, RotateCcw, X, Activity, Phone, Mail, BadgeCheck, AlertTriangle, Check } from 'lucide-react';

const normalize = (value = '') => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const onlyDigits = (value = '') => value.replace(/\D/g, '');

function parsePtBrDate(value?: string) {
  if (!value) return 0;
  const match = value.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return new Date(value).getTime() || 0;
  const [, day, month, year, hour, minute, second = '0'] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)).getTime();
}

function getLatestCredential(p: Participant) {
  const checked = (p.activityRegistrations || []).filter(item => item.checkedIn && item.checkedInAt);
  return checked.sort((a, b) => parsePtBrDate(b.checkedInAt) - parsePtBrDate(a.checkedInAt))[0];
}

function initials(name = 'Participante') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'P';
}

function participantPhoto(p: Participant) {
  const url = p.avatarUrl || p.photoUrl || p.imageUrl || '';
  return url && !url.endsWith('avatar-default.svg') ? url : '';
}

function ParticipantAvatar({ participant, sizeClass }: { participant: Participant; sizeClass: string }) {
  const photo = participantPhoto(participant);
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        className={`${sizeClass} rounded-full object-cover border border-border flex-shrink-0`}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials(participant.name)}
    </div>
  );
}

export function Accreditation() {
  const { participants, activities, addHistory, currentUser, hasPermission, credentialParticipant } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<Participant | null | 'not_found'>(null);
  const [filterActivity, setFilterActivity] = useState('');
  const [selectedDetail, setSelectedDetail] = useState<Participant | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [undoConfirm, setUndoConfirm] = useState<string | null>(null);

  if (!hasPermission('credential')) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64">
        <UserCheck size={48} className="text-muted-foreground mb-4" />
        <p className="text-foreground font-medium">Acesso Restrito</p>
        <p className="text-muted-foreground text-sm mt-1">Você não tem permissão para acessar o credenciamento.</p>
      </div>
    );
  }

  const validParticipants = useMemo(() => participants.filter(p => p.inscriptionStatus !== 'cancelled'), [participants]);
  const accreditationStats = useMemo(() => {
    const credentialed = validParticipants.filter(p => p.credentialStatus === 'credentialed');
    const pending = validParticipants.filter(p => p.credentialStatus === 'pending');
    return {
      credentialed,
      pending,
      credentialRate: validParticipants.length ? Math.round((credentialed.length / validParticipants.length) * 100) : 0,
    };
  }, [validParticipants]);
  const { credentialed, pending, credentialRate } = accreditationStats;

  const recentCredentialed = useMemo(() => [...validParticipants]
    .filter(p => (p.activityRegistrations || []).some(item => item.checkedIn))
    .filter(p => filterActivity ? (p.activityRegistrations || []).some(item => item.activity === filterActivity && item.checkedIn) : true)
    .sort((a, b) => parsePtBrDate(getLatestCredential(b)?.checkedInAt || b.credentialedAt) - parsePtBrDate(getLatestCredential(a)?.checkedInAt || a.credentialedAt))
    .slice(0, 50), [validParticipants, filterActivity]);

  const handleSearch = () => {
    if (!searchQuery.trim()) { toast.error('Informe um CPF, nome ou e-mail'); return; }
    const q = normalize(searchQuery);
    const qDigits = onlyDigits(searchQuery);
    const found = participants.find(p =>
      (qDigits && (
        onlyDigits(p.cpf).includes(qDigits) ||
        onlyDigits(p.phone).includes(qDigits)
      )) ||
      normalize(p.name).includes(q) ||
      normalize(p.email).includes(q) ||
      normalize(p.institution).includes(q) ||
      (p.ticketCodes || []).some(code => normalize(code).includes(q))
    );
    setSearchResult(found || 'not_found');
  };

  const handleCredential = async (p: Participant) => {
    if (p.credentialStatus === 'credentialed') { toast.warning('Participante já credenciado'); return; }
    if (p.inscriptionStatus === 'cancelled') { toast.error('Inscrição cancelada. Não é possível credenciar.'); return; }
    try {
      setBusyId(p.id);
      await credentialParticipant(p, true);
      addHistory({ user: currentUser.name, action: `Credenciou ${p.name}`, area: 'Credenciamento', status: 'success' });
      toast.success(`✓ ${p.name} credenciado com sucesso!`);
      setSearchResult(null);
      setSearchQuery('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível credenciar.');
    } finally {
      setBusyId(null);
    }
  };

  const handleUndo = async (p: Participant) => {
    if (!hasPermission('undo_credential')) { toast.error('Sem permissão para desfazer credenciamento'); return; }
    try {
      setBusyId(p.id);
      await credentialParticipant(p, false);
      addHistory({ user: currentUser.name, action: `Desfez credenciamento de ${p.name}`, area: 'Credenciamento', status: 'warning' });
      toast.warning(`Credenciamento de ${p.name} desfeito.`);
      setSelectedDetail(null);
      setUndoConfirm(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível desfazer credenciamento.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Credenciamento</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie a entrada de participantes</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card border border-border rounded-lg px-3 py-2">
          <Clock size={14} />
          <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Credenciados', value: credentialed.length, color: 'from-green-500/20 to-green-600/10 border-green-500/20', textColor: 'text-green-400', icon: <UserCheck size={20} /> },
          { label: 'Pendentes', value: pending.length, color: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/20', textColor: 'text-yellow-400', icon: <Clock size={20} /> },
          { label: 'Total', value: validParticipants.length, color: 'from-blue-500/20 to-blue-600/10 border-blue-500/20', textColor: 'text-blue-400', icon: <Activity size={20} /> },
          { label: 'Taxa', value: `${credentialRate}%`, color: 'from-purple-500/20 to-purple-600/10 border-purple-500/20', textColor: 'text-purple-400', icon: <Activity size={20} /> },
        ].map((s, i) => (
          <div key={i} className={`bg-gradient-to-br ${s.color} border rounded-xl p-4 flex items-center gap-4`}>
            <span className={s.textColor}>{s.icon}</span>
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual search + credential */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Search size={14} className="text-blue-400" />
            Credenciar Manualmente
          </h3>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                className="w-full bg-accent/50 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="CPF, nome ou e-mail..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearchResult(null); }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button onClick={handleSearch} className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-all">
              Buscar
            </button>
          </div>

          {searchResult && searchResult !== 'not_found' && (
            <div className={`p-4 rounded-xl border ${searchResult.credentialStatus === 'credentialed' ? 'border-green-500/30 bg-green-500/10' : searchResult.inscriptionStatus === 'cancelled' ? 'border-red-500/30 bg-red-500/10' : 'border-blue-500/30 bg-blue-500/10'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <ParticipantAvatar participant={searchResult} sizeClass="w-10 h-10 text-sm" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{searchResult.name}</p>
                    <p className="text-xs text-muted-foreground">{searchResult.cpf || 'CPF não informado'}</p>
                    <p className="text-xs text-muted-foreground">{searchResult.institution} · {searchResult.city}</p>
                  </div>
                </div>
                <button onClick={() => setSearchResult(null)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
              </div>

              <div className="flex flex-wrap gap-1 mt-3">
                {searchResult.activities.map((a, i) => (
                  <span key={i} className="text-xs bg-accent text-muted-foreground px-2 py-0.5 rounded">{a}</span>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                {searchResult.credentialStatus === 'credentialed' ? (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <UserCheck size={16} />
                    <span>Já credenciado em {searchResult.credentialedAt}</span>
                  </div>
                ) : searchResult.inscriptionStatus === 'cancelled' ? (
                  <p className="text-sm text-red-400">Inscrição cancelada</p>
                ) : (
                  <button disabled={busyId === searchResult.id} onClick={() => handleCredential(searchResult)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-60 transition-all font-medium">
                    <UserCheck size={16} /> {busyId === searchResult.id ? 'Credenciando...' : 'Credenciar'}
                  </button>
                )}
              </div>
            </div>
          )}

          {searchResult === 'not_found' && (
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10">
              <p className="text-sm text-red-400 font-medium">Participante não encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">Verifique os dados informados ou busque por outro CPF, nome ou e-mail.</p>
            </div>
          )}
        </div>

        {/* Activity stats */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Activity size={14} className="text-green-400" />
            Status por Atividade
          </h3>
          <div className="space-y-3">
            {activities.map(a => {
              const actRegistrations = validParticipants.flatMap(p => p.activityRegistrations || []).filter(item => item.activity === a.name);
              const actTotal = actRegistrations.length || validParticipants.filter(p => p.activities.includes(a.name)).length;
              const actCred = actRegistrations.filter(item => item.checkedIn).length || validParticipants.filter(p => p.activities.includes(a.name) && p.credentialStatus === 'credentialed').length;
              const pct = actTotal > 0 ? Math.round((actCred / actTotal) * 100) : 0;
              return (
                <div key={a.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground">{a.name}</span>
                    <span className="text-muted-foreground">{actCred}/{actTotal} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">Histórico de Credenciamentos</h3>
          <div className="flex gap-2">
            <select
              className="bg-accent border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none"
              value={filterActivity}
              onChange={e => setFilterActivity(e.target.value)}
            >
              <option value="">Todas as atividades</option>
              {activities.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Participante</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Horário</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Atividades</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Operador</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {recentCredentialed.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.cpf || p.email || p.phone || 'Sem documento'}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{getLatestCredential(p)?.checkedInAt || p.credentialedAt || '-'}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {(p.activityRegistrations || []).filter(item => item.checkedIn).slice(0, 3).map((item) => (
                        <span key={item.id} className="text-xs bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded border border-green-500/20">{item.activity}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{getLatestCredential(p)?.checkedInBy || p.credentialedBy || '-'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setSelectedDetail(p)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all" title="Ver detalhes">
                        <Search size={14} />
                      </button>
                      {hasPermission('undo_credential') && (undoConfirm === p.id ? (
                        <div className="flex items-center gap-1 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-1">
                          <button disabled={busyId === p.id} onClick={() => handleUndo(p)} className="p-1.5 rounded-lg text-yellow-300 hover:bg-yellow-500/20 disabled:opacity-60 transition-all" title="Confirmar desfazer"><Check size={14} /></button>
                          <button onClick={() => setUndoConfirm(null)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-all" title="Cancelar"><X size={14} /></button>
                        </div>
                      ) : (
                        <button onClick={() => setUndoConfirm(p.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-yellow-400 hover:bg-yellow-500/10 transition-all" title="Desfazer">
                          <RotateCcw size={14} />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {recentCredentialed.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum credenciamento encontrado para o filtro selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-medium text-foreground">Detalhes do Credenciamento</h3>
              <button onClick={() => setSelectedDetail(null)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <ParticipantAvatar participant={selectedDetail} sizeClass="w-12 h-12 text-sm" />
                <div>
                  <p className="font-medium text-foreground">{selectedDetail.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedDetail.institution || selectedDetail.email || selectedDetail.phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'CPF', value: selectedDetail.cpf || 'Não informado' },
                  { label: 'E-mail', value: selectedDetail.email || 'Não informado' },
                  { label: 'Telefone', value: selectedDetail.phone || 'Não informado' },
                  { label: 'Cidade', value: selectedDetail.city || 'Não informada' },
                  { label: 'Credenciado em', value: getLatestCredential(selectedDetail)?.checkedInAt || selectedDetail.credentialedAt || '-' },
                  { label: 'Operador', value: getLatestCredential(selectedDetail)?.checkedInBy || selectedDetail.credentialedBy || '-' },
                ].map((f,i) => (
                  <div key={i} className="bg-accent/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{f.label}</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Atividades</p>
                {(selectedDetail.activityRegistrations || []).map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-accent/20 px-3 py-2">
                    <div>
                      <p className="text-sm text-foreground">{item.activity}</p>
                      <p className="text-xs text-muted-foreground">{item.ticketCode || 'Sem código'}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border ${item.checkedIn ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                      {item.checkedIn ? <BadgeCheck size={12} /> : <AlertTriangle size={12} />}
                      {item.checkedIn ? 'Credenciado' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a href={selectedDetail.phone ? `tel:${onlyDigits(selectedDetail.phone)}` : undefined} className={`flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm ${selectedDetail.phone ? 'text-foreground hover:bg-accent' : 'pointer-events-none text-muted-foreground opacity-60'}`}>
                  <Phone size={14} /> Ligar
                </a>
                <a href={selectedDetail.email ? `mailto:${selectedDetail.email}` : undefined} className={`flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm ${selectedDetail.email ? 'text-foreground hover:bg-accent' : 'pointer-events-none text-muted-foreground opacity-60'}`}>
                  <Mail size={14} /> E-mail
                </a>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              {hasPermission('undo_credential') && (
                undoConfirm === selectedDetail.id ? (
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <button disabled={busyId === selectedDetail.id} onClick={() => handleUndo(selectedDetail)} className="flex items-center justify-center gap-2 py-2 border border-yellow-500/30 text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/10 disabled:opacity-60 transition-all">
                      <Check size={14} /> Confirmar
                    </button>
                    <button onClick={() => setUndoConfirm(null)} className="flex items-center justify-center gap-2 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-accent transition-all">
                      <X size={14} /> Cancelar
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setUndoConfirm(selectedDetail.id)} className="flex-1 flex items-center justify-center gap-2 py-2 border border-yellow-500/30 text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/10 transition-all">
                    <RotateCcw size={14} /> Desfazer Credenciamento
                  </button>
                )
              )}
              <button onClick={() => setSelectedDetail(null)} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-all">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
