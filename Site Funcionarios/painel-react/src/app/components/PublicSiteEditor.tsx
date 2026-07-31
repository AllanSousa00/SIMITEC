import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { SIMITEC_BRAND, SIMITEC_EDITOR_SWATCHES } from '../lib/brand';
import { toast } from 'sonner';
import {
  Save, Eye, Upload, RotateCcw, Globe, Image, Type, Calendar,
  MapPin, Palette, Layout, List, MessageSquare, Users, Plus, Trash2,
  Loader2, ExternalLink, Ticket, Clock, HelpCircle, GripVertical
} from 'lucide-react';

type Tab = 'geral' | 'visual' | 'conteudo' | 'secoes' | 'rodape';

const COLORS = SIMITEC_EDITOR_SWATCHES;
const emptyContent = { event: {}, areas: [], schedule: [], faq: [], people: [], gallery: [], ticket: {} };
const OFFICIAL_LOGO_URL = '/assets/simitec-logo-oficial-2026-transparente.png';

function normalizeLogoUrl(url?: string) {
  if (!url || url === '/assets/simitec-logo.png' || url === '/assets/simitec-logo-email.png' || url === '/assets/simitec-logo-oficial-2026.jpeg') return OFFICIAL_LOGO_URL;
  return url;
}

function normalizeEditorContent(raw: any) {
  const next = { ...emptyContent, ...(raw || {}) };
  const event = { ...(next.event || {}) };
  const year = String(event.year || event.edition || '2026').match(/\d{4}/)?.[0] || '2026';
  const footer = event.footer || {};
  event.logoUrl = normalizeLogoUrl(event.logoUrl);
  event.footer = {
    organizerName: footer.organizerName || 'ECIT ENGENHEIRA MARCIA GUEDES ALCOFORADO DE CARVALHO',
    email: footer.email || event.contactEmail || 'simitec.suporte.oficial@gmail.com',
    instagram: footer.instagram || '@simitec',
    whatsapp: footer.whatsapp || event.contactPhone || '',
    footerText: footer.footerText || `© ${year} SIMITEC · Todos os direitos reservados`,
    termsEnabled: footer.termsEnabled !== false,
    privacyEnabled: footer.privacyEnabled !== false,
  };
  return { ...next, event };
}

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data?.message || 'Não foi possível concluir.');
  return data;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

function toFaqGroups(faq: any[]) {
  return (faq || []).length ? faq : [{ category: 'Perguntas frequentes', items: [] }];
}

export function PublicSiteEditor() {
  const { addHistory, currentUser, hasPermission } = useApp();
  const [tab, setTab] = useState<Tab>('geral');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState('');
  const [content, setContent] = useState<any>(emptyContent);
  const [draggingPersonIndex, setDraggingPersonIndex] = useState<number | null>(null);
  const [draggingFaqIndex, setDraggingFaqIndex] = useState<number | null>(null);
  const [draggingAreaIndex, setDraggingAreaIndex] = useState<number | null>(null);

  const event = content.event || {};
  const settings = event.siteSettings || {};
  const footer = event.footer || {};
  const faqGroups = toFaqGroups(content.faq || []);

  const sections = useMemo(() => ([
    { key: 'hero', label: 'Banner principal', active: true, required: true },
    { key: 'cronograma', label: 'Cronograma', active: (content.schedule || []).length > 0 },
    { key: 'palestrantes', label: 'Palestrantes', active: (content.people || []).some((p: any) => p.visible !== false) },
    { key: 'atividades', label: 'Atividades', active: (content.areas || []).some((a: any) => a.visible !== false) },
    { key: 'galeria', label: 'Galeria', active: (content.gallery || []).some((g: any) => g.visible !== false) },
    { key: 'faq', label: 'FAQ', active: faqGroups.some((g: any) => (g.items || []).length > 0) },
    { key: 'avisos', label: 'Avisos importantes', active: Boolean(event.notice) },
    { key: 'inscricao', label: 'Inscrições', active: settings.inscriptionOpen !== false },
  ]), [content, event.notice, faqGroups, settings.inscriptionOpen]);

  const setEvent = (patch: any) => setContent((prev: any) => ({ ...prev, event: { ...(prev.event || {}), ...patch } }));
  const setSettings = (patch: any) => setEvent({ siteSettings: { ...settings, ...patch } });
  const setFooter = (patch: any) => setEvent({ footer: { ...footer, ...patch } });
  const updateArray = (key: string, updater: (rows: any[]) => any[]) => setContent((prev: any) => ({ ...prev, [key]: updater([...(prev[key] || [])]) }));
  const movePerson = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    updateArray('people', rows => {
      if (from >= rows.length || to >= rows.length) return rows;
      const next = [...rows];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };
  const moveFaqItem = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    const next = [...faqGroups];
    const items = [...(next[0]?.items || [])];
    if (from >= items.length || to >= items.length) return;
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    next[0] = { ...(next[0] || { category: 'Perguntas frequentes' }), items };
    setContent((prev: any) => ({ ...prev, faq: next }));
  };
  const moveArea = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    updateArray('areas', rows => {
      if (from >= rows.length || to >= rows.length) return rows;
      const next = [...rows];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const loadContent = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { content: next } = await api('/api/admin/content');
      setContent(normalizeEditorContent(next));
      if (silent) toast.success('Versão salva recarregada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar o site público.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadContent(); }, []);

  const savePublicSite = async () => {
    const normalized = normalizeEditorContent(content);
    const payload = {
      ...normalized,
      faq: faqGroups,
      areas: normalized.areas || [],
      schedule: normalized.schedule || [],
      people: normalized.people || [],
      gallery: normalized.gallery || [],
      ticket: normalized.ticket || {},
    };
    const { content: saved } = await api('/api/admin/content', { method: 'PUT', body: JSON.stringify(payload) });
    setContent(normalizeEditorContent(saved));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePublicSite();
      addHistory({ user: currentUser.name, action: 'Salvou site público', area: 'Site Público', status: 'success' });
      toast.success('Site público salvo.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!hasPermission('publish')) { toast.error('Você não tem permissão para publicar.'); return; }
    setPublishing(true);
    try {
      await savePublicSite();
      addHistory({ user: currentUser.name, action: 'Publicou site público', area: 'Site Público', before: 'Rascunho', after: 'Publicado', status: 'success' });
      toast.success('Site público publicado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível publicar.');
    } finally {
      setPublishing(false);
    }
  };

  const handleUpload = async (field: 'logoUrl' | 'bannerUrl' | 'backgroundUrl', file?: File) => {
    if (!file) return;
    setUploading(field);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const { media } = await api('/api/admin/media', { method: 'POST', body: JSON.stringify({ kind: 'image', dataUrl }) });
      setEvent({ [field]: media.url });
      toast.success('Imagem enviada. Clique em salvar para aplicar.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar a imagem.');
    } finally {
      setUploading('');
    }
  };

  const inputCls = 'w-full bg-accent/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all';
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1';
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'geral', label: 'Geral', icon: <Globe size={14} /> },
    { id: 'visual', label: 'Visual', icon: <Palette size={14} /> },
    { id: 'conteudo', label: 'Conteúdo', icon: <Type size={14} /> },
    { id: 'secoes', label: 'Seções', icon: <Layout size={14} /> },
    { id: 'rodape', label: 'Rodapé', icon: <List size={14} /> },
  ];

  if (loading) {
    return <div className="p-6 h-64 flex items-center justify-center text-muted-foreground"><Loader2 className="animate-spin mr-2" size={18} /> Carregando site público...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Editar Site Público</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Conteúdo usado diretamente pelo site de inscrições</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => window.open('/', '_blank', 'noopener,noreferrer')} className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-accent transition-all">
            <Eye size={14} /> Visualizar <ExternalLink size={12} />
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

      <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all flex-1 justify-center ${tab === t.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}>
            {t.icon} <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        {tab === 'geral' && (
          <div className="space-y-5">
            <h3 className="text-sm font-medium text-foreground">Informações gerais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelCls}>Nome do evento</label><input className={inputCls} value={event.name || ''} onChange={e => setEvent({ name: e.target.value })} /></div>
              <div><label className={labelCls}>Nome completo/subtítulo</label><input className={inputCls} value={event.fullName || ''} onChange={e => setEvent({ fullName: e.target.value })} /></div>
              <div className="md:col-span-2"><label className={labelCls}>Descrição</label><textarea className={`${inputCls} h-24 resize-none`} value={event.summary || ''} onChange={e => setEvent({ summary: e.target.value })} /></div>
              <div><label className={labelCls}><Calendar size={12} className="inline mr-1" />Data</label><input className={inputCls} value={event.dateLabel || ''} onChange={e => setEvent({ dateLabel: e.target.value })} /></div>
              <div><label className={labelCls}><Clock size={12} className="inline mr-1" />Horário</label><input className={inputCls} value={event.timeLabel || ''} onChange={e => setEvent({ timeLabel: e.target.value })} placeholder="08h00 às 18h00" /></div>
              <div className="md:col-span-2"><label className={labelCls}><MapPin size={12} className="inline mr-1" />Local</label><input className={inputCls} value={event.location || ''} onChange={e => setEvent({ location: e.target.value })} /></div>
              <div className="md:col-span-2"><label className={labelCls}><MessageSquare size={12} className="inline mr-1" />Aviso público</label><textarea className={`${inputCls} h-20 resize-none`} value={event.notice || ''} onChange={e => setEvent({ notice: e.target.value })} placeholder="Ex: inscrições abertas até..." /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              {[
                ['logoUrl', 'Logo do Evento', event.logoUrl],
                ['bannerUrl', 'Banner Principal', event.bannerUrl],
                ['backgroundUrl', 'Imagem de Fundo', event.backgroundUrl],
              ].map(([field, label, value]) => (
                <label key={field} className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col gap-2 cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-all">
                  <span className="text-muted-foreground"><Image size={22} /></span>
                  <span className="text-xs text-foreground font-medium">{label}</span>
                  <span className="text-[11px] text-muted-foreground truncate">{value || 'Nenhuma imagem enviada'}</span>
                  <input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => handleUpload(field as any, e.target.files?.[0])} />
                  <span className="text-xs text-primary">{uploading === field ? 'Enviando...' : 'Selecionar arquivo'}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {tab === 'visual' && (
          <div className="space-y-5">
            <h3 className="text-sm font-medium text-foreground">Aparência</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                ['primaryColor', 'Cor primária', settings.primaryColor || SIMITEC_BRAND.ocean],
                ['secondaryColor', 'Cor secundária', settings.secondaryColor || SIMITEC_BRAND.mint],
                ['backgroundColor', 'Fundo', settings.backgroundColor || SIMITEC_BRAND.navy],
              ].map(([key, label, value]) => (
                <div key={key}>
                  <label className={labelCls}>{label}</label>
                  <div className="flex gap-2"><span className="w-9 h-9 rounded-lg border border-border" style={{ backgroundColor: value }} /><input className={inputCls} value={value} onChange={e => setSettings({ [key]: e.target.value })} /></div>
                  <div className="flex flex-wrap gap-1.5 mt-2">{COLORS.map(c => <button key={c} onClick={() => setSettings({ [key]: c })} className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: c }} />)}</div>
                </div>
              ))}
              <div><label className={labelCls}>Fonte</label><select className={inputCls} value={settings.font || 'Inter'} onChange={e => setSettings({ font: e.target.value })}>{['Inter','Roboto','Poppins','Open Sans','Montserrat'].map(f => <option key={f}>{f}</option>)}</select></div>
              <div><label className={labelCls}>Botões</label><select className={inputCls} value={settings.buttonStyle || 'rounded'} onChange={e => setSettings({ buttonStyle: e.target.value })}><option value="rounded">Arredondado</option><option value="square">Quadrado</option><option value="pill">Pílula</option></select></div>
              <label className="flex items-center gap-2 mt-6"><input type="checkbox" checked={settings.darkMode !== false} onChange={e => setSettings({ darkMode: e.target.checked })} /> <span className="text-sm text-foreground">Modo escuro no site público</span></label>
            </div>
          </div>
        )}

        {tab === 'conteudo' && (
          <div className="space-y-6">
            <EditableList title="Palestrantes e responsáveis" icon={<Users size={14} />} rows={content.people || []} onAdd={() => updateArray('people', rows => [...rows, { name: '', role: '', activityTitle: '', bio: '', visible: true }])}>
              {(person: any, i: number) => (
                <div
                  key={`${person.slug || person.name || 'pessoa'}-${i}`}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const from = Number(e.dataTransfer.getData('text/plain'));
                    movePerson(from, i);
                    setDraggingPersonIndex(null);
                  }}
                  className={`rounded-lg border transition-all ${draggingPersonIndex === i ? 'border-primary bg-primary/10 opacity-70' : 'border-border bg-accent/30'}`}
                >
                  <div
                    draggable
                    onDragStart={e => {
                      setDraggingPersonIndex(i);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(i));
                    }}
                    onDragEnd={() => setDraggingPersonIndex(null)}
                    className="flex cursor-grab active:cursor-grabbing items-center justify-between gap-3 rounded-t-lg border-b border-border/70 px-3 py-2 text-xs text-muted-foreground hover:bg-accent/50"
                    title="Segure e arraste para mudar a ordem no site"
                  >
                    <span className="flex items-center gap-2">
                      <GripVertical size={14} />
                      <strong className="text-foreground">{String(i + 1).padStart(2, '0')}</strong>
                      Segure e arraste para mudar a posição
                    </span>
                    <span className="hidden sm:inline truncate">{person.name || person.activityTitle || 'Pessoa sem nome'}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3">
                    <input className={inputCls} placeholder="Nome" value={person.name || ''} onChange={e => updateArray('people', rows => rows.map((r, idx) => idx === i ? { ...r, name: e.target.value } : r))} />
                    <input className={inputCls} placeholder="Função" value={person.role || ''} onChange={e => updateArray('people', rows => rows.map((r, idx) => idx === i ? { ...r, role: e.target.value } : r))} />
                    <input className={inputCls} placeholder="Atividade" value={person.activityTitle || ''} onChange={e => updateArray('people', rows => rows.map((r, idx) => idx === i ? { ...r, activityTitle: e.target.value } : r))} />
                    <button onClick={() => updateArray('people', rows => rows.filter((_, idx) => idx !== i))} className="text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10"><Trash2 size={14} className="mx-auto" /></button>
                    <textarea className={`${inputCls} md:col-span-4 h-16 resize-none`} placeholder="Bio/resumo" value={person.bio || person.activitySummary || ''} onChange={e => updateArray('people', rows => rows.map((r, idx) => idx === i ? { ...r, bio: e.target.value, activitySummary: e.target.value } : r))} />
                  </div>
                </div>
              )}
            </EditableList>

            <EditableList title="FAQ" icon={<HelpCircle size={14} />} rows={faqGroups[0]?.items || []} onAdd={() => {
              const next = [...faqGroups];
              next[0] = { ...(next[0] || { category: 'Perguntas frequentes' }), items: [...(next[0]?.items || []), { question: '', answer: '' }] };
              setContent((prev: any) => ({ ...prev, faq: next }));
            }}>
              {(item: any, i: number) => (
                <div
                  key={`${item.question || 'faq'}-${i}`}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    moveFaqItem(Number(e.dataTransfer.getData('text/plain')), i);
                    setDraggingFaqIndex(null);
                  }}
                  className={`rounded-lg border transition-all ${draggingFaqIndex === i ? 'border-primary bg-primary/10 opacity-70' : 'border-border bg-accent/30'}`}
                >
                  <div
                    draggable
                    onDragStart={e => {
                      setDraggingFaqIndex(i);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(i));
                    }}
                    onDragEnd={() => setDraggingFaqIndex(null)}
                    className="flex cursor-grab active:cursor-grabbing items-center justify-between gap-3 rounded-t-lg border-b border-border/70 px-3 py-2 text-xs text-muted-foreground hover:bg-accent/50"
                    title="Segure e arraste para mudar a ordem no site"
                  >
                    <span className="flex items-center gap-2">
                      <GripVertical size={14} />
                      <strong className="text-foreground">{String(i + 1).padStart(2, '0')}</strong>
                      Segure e arraste para mudar a posição
                    </span>
                    <span className="hidden sm:inline truncate">{item.question || 'Pergunta sem título'}</span>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex gap-2"><input className={inputCls} placeholder="Pergunta" value={item.question || ''} onChange={e => {
                      const next = [...faqGroups]; next[0].items[i] = { ...item, question: e.target.value }; setContent((prev: any) => ({ ...prev, faq: next }));
                    }} /><button onClick={() => { const next = [...faqGroups]; next[0].items = next[0].items.filter((_: any, idx: number) => idx !== i); setContent((prev: any) => ({ ...prev, faq: next })); }} className="px-3 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10"><Trash2 size={14} /></button></div>
                    <textarea className={`${inputCls} h-16 resize-none`} placeholder="Resposta" value={item.answer || ''} onChange={e => { const next = [...faqGroups]; next[0].items[i] = { ...item, answer: e.target.value }; setContent((prev: any) => ({ ...prev, faq: next })); }} />
                  </div>
                </div>
              )}
            </EditableList>

            <div>
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2 mb-3"><Ticket size={14} /> Credencial</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['headline', 'instructions', 'footer'].map(key => <input key={key} className={inputCls} value={content.ticket?.[key] || ''} placeholder={key} onChange={e => setContent((prev: any) => ({ ...prev, ticket: { ...(prev.ticket || {}), [key]: e.target.value } }))} />)}
              </div>
            </div>
          </div>
        )}

        {tab === 'secoes' && (
          <div className="space-y-5">
            <h3 className="text-sm font-medium text-foreground">Seções e atividades visíveis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{sections.map(s => <div key={s.key} className="flex items-center justify-between p-3 bg-accent/30 border border-border rounded-lg"><span className="text-sm text-foreground">{s.label}</span><span className={`text-xs px-2 py-0.5 rounded-full border ${s.active ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-muted-foreground bg-muted border-border'}`}>{s.active ? 'Ativa' : 'Oculta'}</span></div>)}</div>
            <div className="space-y-2">{(content.areas || []).map((area: any, i: number) => (
              <div
                key={`${area.slug || area.title || 'atividade'}-${i}`}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  moveArea(Number(e.dataTransfer.getData('text/plain')), i);
                  setDraggingAreaIndex(null);
                }}
                className={`rounded-lg border transition-all ${draggingAreaIndex === i ? 'border-primary bg-primary/10 opacity-70' : 'border-border bg-accent/30'}`}
              >
                <div
                  draggable
                  onDragStart={e => {
                    setDraggingAreaIndex(i);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(i));
                  }}
                  onDragEnd={() => setDraggingAreaIndex(null)}
                  className="flex cursor-grab active:cursor-grabbing items-center justify-between gap-3 rounded-t-lg border-b border-border/70 px-3 py-2 text-xs text-muted-foreground hover:bg-accent/50"
                  title="Segure e arraste para mudar a ordem no site"
                >
                  <span className="flex items-center gap-2">
                    <GripVertical size={14} />
                    <strong className="text-foreground">{String(i + 1).padStart(2, '0')}</strong>
                    Segure e arraste para mudar a posição
                  </span>
                  <span className="hidden sm:inline truncate">{area.title || 'Atividade sem título'}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_90px_90px_80px] gap-2 p-3">
                  <input className={inputCls} value={area.title || ''} onChange={e => updateArray('areas', rows => rows.map((r, idx) => idx === i ? { ...r, title: e.target.value, shortTitle: e.target.value } : r))} />
                  <input className={inputCls} type="number" value={area.seats || 0} onChange={e => updateArray('areas', rows => rows.map((r, idx) => idx === i ? { ...r, seats: Number(e.target.value) } : r))} />
                  <label className="flex items-center justify-center gap-2 text-xs text-foreground"><input type="checkbox" checked={area.visible !== false} onChange={e => updateArray('areas', rows => rows.map((r, idx) => idx === i ? { ...r, visible: e.target.checked } : r))} /> Visível</label>
                  <button onClick={() => updateArray('areas', rows => rows.filter((_, idx) => idx !== i))} className="text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10"><Trash2 size={14} className="mx-auto" /></button>
                </div>
              </div>
            ))}</div>
            <button onClick={() => updateArray('areas', rows => [...rows, { title: 'Nova atividade', shortTitle: 'Nova atividade', seats: 60, tag: 'Atividade', visible: true }])} className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-accent"><Plus size={14} /> Adicionar atividade</button>
          </div>
        )}

        {tab === 'rodape' && (
          <div className="space-y-5">
            <h3 className="text-sm font-medium text-foreground">Rodapé e links</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelCls}>Organização</label><input className={inputCls} value={footer.organizerName || ''} onChange={e => setFooter({ organizerName: e.target.value })} /></div>
              <div><label className={labelCls}>E-mail</label><input className={inputCls} value={footer.email || ''} onChange={e => setFooter({ email: e.target.value })} /></div>
              <div><label className={labelCls}>Instagram</label><input className={inputCls} value={footer.instagram || ''} onChange={e => setFooter({ instagram: e.target.value })} /></div>
              <div><label className={labelCls}>WhatsApp</label><input className={inputCls} value={footer.whatsapp || ''} onChange={e => setFooter({ whatsapp: e.target.value })} /></div>
              <div className="md:col-span-2"><label className={labelCls}>Texto do rodapé</label><input className={inputCls} value={footer.footerText || ''} onChange={e => setFooter({ footerText: e.target.value })} /></div>
            </div>
            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={footer.termsEnabled !== false} onChange={e => setFooter({ termsEnabled: e.target.checked })} /> Exibir termos</label>
              <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={footer.privacyEnabled !== false} onChange={e => setFooter({ privacyEnabled: e.target.checked })} /> Exibir privacidade</label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditableList({ title, icon, rows, onAdd, children }: { title: string; icon: React.ReactNode; rows: any[]; onAdd: () => void; children: (row: any, index: number) => React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">{icon}{title}</h3>
        <button onClick={onAdd} className="flex items-center gap-1.5 text-xs text-primary hover:underline"><Plus size={12} /> Adicionar</button>
      </div>
      <div className="space-y-2">
        {rows.length ? rows.map(children) : <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-4">Nenhum item cadastrado.</div>}
      </div>
    </div>
  );
}
