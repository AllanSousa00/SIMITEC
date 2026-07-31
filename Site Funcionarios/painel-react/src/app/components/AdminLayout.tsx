import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router';
import { useApp, type Permission } from '../context/AppContext';
import { SIMITEC_BRAND } from '../lib/brand';
import { Toaster } from 'sonner';
import {
  LayoutDashboard, Globe, Users, Shield, UserCheck,
  BarChart3, Settings, LogOut, Sun, Moon, Bell,
  ChevronLeft, ChevronRight, Building2, FileText, Menu, X,
  AlertCircle, CircleHelp, Check,
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  moduleKey: string;
  permission?: Permission;
  group: string;
}

const NAV: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} />, moduleKey: 'dashboard', permission: 'view_dashboard', group: 'Principal' },
  { path: '/inscricoes', label: 'Inscrições', icon: <FileText size={18} />, moduleKey: 'inscriptions', permission: 'search', group: 'Evento' },
  { path: '/credenciamento', label: 'Credenciamento', icon: <UserCheck size={18} />, moduleKey: 'credentialing', permission: 'credential', group: 'Evento' },
  { path: '/site-publico', label: 'Site Público', icon: <Globe size={18} />, moduleKey: 'publicSite', permission: 'edit_public_site', group: 'Administração' },
  { path: '/site-equipe', label: 'Site da Equipe', icon: <Building2 size={18} />, moduleKey: 'teamSite', permission: 'edit_team_site', group: 'Administração' },
  { path: '/funcionarios', label: 'Funcionários', icon: <Users size={18} />, moduleKey: 'staff', permission: 'manage_staff', group: 'Administração' },
  { path: '/cargos', label: 'Cargos', icon: <Shield size={18} />, moduleKey: 'roles', permission: 'manage_roles', group: 'Administração' },
  { path: '/relatorios', label: 'Relatórios', icon: <BarChart3 size={18} />, moduleKey: 'reports', permission: 'view_reports', group: 'Administração' },
  { path: '/configuracoes', label: 'Configurações', icon: <Settings size={18} />, moduleKey: 'settings', permission: 'access_settings', group: 'Sistema' },
];
const OFFICIAL_LOGO_URL = '/assets/simitec-logo-oficial-2026-transparente.png';

const GUIDE_CONTENT = [
  {
    moduleKey: 'dashboard',
    title: 'Veja o que aconteceu hoje',
    description: 'Comece pelos números de inscrições e entradas confirmadas. Eles mostram a situação do evento agora.',
    location: 'Principal / Dashboard',
  },
  {
    moduleKey: 'inscriptions',
    title: 'Localize uma inscrição',
    description: 'Pesquise participantes, confira as atividades e altere dados apenas quando for necessário.',
    location: 'Evento / Inscrições',
  },
  {
    moduleKey: 'credentialing',
    title: 'Confirme a entrada',
    description: 'Leia o QR Code ou faça uma busca manual. Confira o nome antes de credenciar.',
    location: 'Evento / Credenciamento',
  },
  {
    moduleKey: 'reports',
    title: 'Exporte quando precisar',
    description: 'Use os relatórios para conferir resultados e compartilhar somente os dados permitidos.',
    location: 'Administração / Relatórios',
  },
];

type GuideTargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type TeamSiteConfig = {
  panelName?: string;
  compactMode?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  welcomeText?: string;
  operatorMessage?: string;
  helpText?: string;
  showHelpTexts?: boolean;
  modules?: Record<string, boolean>;
  moduleOrder?: string[];
};

function isRealAvatar(url?: string) {
  return Boolean(url && !url.endsWith('/assets/avatar-default.svg') && !url.endsWith('avatar-default.svg'));
}

function UserAvatar({ avatar, avatarUrl, size = 'sm' }: { avatar: string; avatarUrl?: string; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'md' ? 'w-8 h-8 text-xs' : 'w-7 h-7 text-xs';
  if (isRealAvatar(avatarUrl)) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`${sizeClass} rounded-full object-cover border border-border flex-shrink-0 shadow-sm`}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm`}>
      {avatar}
    </div>
  );
}

export function AdminLayout() {
  const { isAuthenticated, currentUser, currentRole, theme, toggleTheme, logout, hasPermission } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(3);
  const [showNotifs, setShowNotifs] = useState(false);
  const [teamSite, setTeamSite] = useState<TeamSiteConfig>({});
  const [showFirstRunGuide, setShowFirstRunGuide] = useState(false);
  const [firstRunGuideStep, setFirstRunGuideStep] = useState(0);
  const [guideTargetRect, setGuideTargetRect] = useState<GuideTargetRect | null>(null);
  const guideDialogRef = useRef<HTMLElement | null>(null);
  const guideFocusOriginRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    const loadTeamSite = () => {
      fetch('/api/admin/content', { credentials: 'include' })
        .then(async response => {
          const text = await response.text();
          return text ? JSON.parse(text) : {};
        })
        .then(data => {
          if (active) setTeamSite(data?.content?.event?.teamSite || {});
        })
        .catch(() => {
          if (active) setTeamSite({});
        });
    };

    loadTeamSite();
    const intervalId = window.setInterval(loadTeamSite, 60000);
    window.addEventListener('focus', loadTeamSite);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', loadTeamSite);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.email) return;
    const key = `simitec-team-guide-seen:${currentUser.email}`;
    if (localStorage.getItem(key) === '1') return;
    const timer = window.setTimeout(() => {
      guideFocusOriginRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setFirstRunGuideStep(0);
      setShowFirstRunGuide(true);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, currentUser?.email]);

  useEffect(() => {
    if (!showFirstRunGuide) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFirstControl = () => {
      guideDialogRef.current?.querySelector<HTMLElement>('[data-guide-close]')?.focus({ preventScroll: true });
    };
    const timer = window.setTimeout(focusFirstControl, 0);
    const handleGuideKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (currentUser?.email) localStorage.setItem(`simitec-team-guide-seen:${currentUser.email}`, '1');
        setFirstRunGuideStep(0);
        setShowFirstRunGuide(false);
        const focusOrigin = guideFocusOriginRef.current;
        guideFocusOriginRef.current = null;
        window.setTimeout(() => focusOrigin?.isConnected && focusOrigin.focus({ preventScroll: true }), 0);
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = guideDialogRef.current;
      const controls = dialog
        ? Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'))
          .filter(control => !control.hidden && control.offsetParent !== null)
        : [];
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleGuideKeydown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleGuideKeydown);
      document.body.style.overflow = previousOverflow;
    };
  }, [showFirstRunGuide, currentUser?.email]);

  const moduleOrder = teamSite.moduleOrder || [];
  const visibleNav = NAV
    .filter(item => teamSite.modules?.[item.moduleKey] !== false)
    .filter(item => !item.permission || hasPermission(item.permission))
    .sort((a, b) => {
      const aIndex = moduleOrder.indexOf(a.moduleKey);
      const bIndex = moduleOrder.indexOf(b.moduleKey);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  const groups = [...new Set(visibleNav.map(i => i.group))];
  const guideSteps = GUIDE_CONTENT
    .map(guide => {
      const item = visibleNav.find(navItem => navItem.moduleKey === guide.moduleKey);
      return item ? { ...guide, path: item.path, icon: item.icon } : null;
    })
    .filter((guide): guide is { moduleKey: string; title: string; description: string; location: string; path: string; icon: React.ReactNode } => Boolean(guide));
  const activeGuideStep = guideSteps[Math.min(firstRunGuideStep, Math.max(guideSteps.length - 1, 0))];

  useEffect(() => {
    if (!showFirstRunGuide || !activeGuideStep) {
      setGuideTargetRect(null);
      return;
    }

    let frame = 0;
    const updateGuideTarget = () => {
      frame = 0;
      const navTarget = document.querySelector<HTMLElement>(`[data-guide-target="${activeGuideStep.moduleKey}"]`);
      const navRect = navTarget?.getBoundingClientRect();
      const isVisible = navRect && navRect.width > 0 && navRect.height > 0
        && navRect.bottom > 0 && navRect.right > 0
        && navRect.left < window.innerWidth && navRect.top < window.innerHeight;
      const target = isVisible ? navTarget : document.querySelector<HTMLElement>('[data-guide-content]');
      const rect = target?.getBoundingClientRect();

      if (!rect || rect.width <= 0 || rect.height <= 0) {
        setGuideTargetRect(null);
        return;
      }

      const padding = target === navTarget ? 5 : 10;
      setGuideTargetRect({
        top: Math.max(8, rect.top - padding),
        left: Math.max(8, rect.left - padding),
        width: Math.min(window.innerWidth - 16, rect.width + padding * 2),
        height: Math.min(window.innerHeight - 16, rect.height + padding * 2),
      });
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateGuideTarget);
    };

    const timer = window.setTimeout(updateGuideTarget, 120);
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [showFirstRunGuide, firstRunGuideStep, location.pathname, activeGuideStep?.moduleKey]);

  if (!isAuthenticated) return null;

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const currentPage = NAV.find(n => isActive(n.path))?.label || 'Painel';

  const handleLogout = () => { logout(); navigate('/login'); };

  const closeFirstRunGuide = () => {
    if (currentUser?.email) {
      localStorage.setItem(`simitec-team-guide-seen:${currentUser.email}`, '1');
    }
    setFirstRunGuideStep(0);
    setShowFirstRunGuide(false);
    const focusOrigin = guideFocusOriginRef.current;
    guideFocusOriginRef.current = null;
    window.setTimeout(() => focusOrigin?.isConnected && focusOrigin.focus({ preventScroll: true }), 0);
  };

  const openFirstRunGuide = () => {
    if (!guideSteps.length) return;
    guideFocusOriginRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setFirstRunGuideStep(0);
    setShowFirstRunGuide(true);
  };

  const goToGuideStep = (stepIndex: number) => {
    const nextStep = guideSteps[stepIndex];
    if (!nextStep) return;
    setFirstRunGuideStep(stepIndex);
    if (location.pathname !== nextStep.path) navigate(nextStep.path);
  };

  const moveFirstRunGuide = (direction: -1 | 1) => {
    const nextIndex = Math.min(Math.max(firstRunGuideStep + direction, 0), Math.max(guideSteps.length - 1, 0));
    goToGuideStep(nextIndex);
  };

  const openGuideSection = () => {
    if (!activeGuideStep) return;
    navigate(activeGuideStep.path);
  };

  const guideCardStyle = guideTargetRect
    ? {
      left: `${Math.min(Math.max(guideTargetRect.left + guideTargetRect.width + 16, 16), Math.max(16, window.innerWidth - 392))}px`,
      top: `${Math.min(Math.max(guideTargetRect.top, 16), Math.max(16, window.innerHeight - 380))}px`,
    }
    : undefined;

  const alerts = [
    { text: '3 inscrições pendentes de confirmação', color: 'text-yellow-400' },
    { text: 'Site público aguardando publicação', color: 'text-blue-400' },
    { text: 'Backup automático concluído', color: 'text-green-400' },
  ];

  return (
    <div
      className={`flex h-screen overflow-hidden bg-background text-foreground ${teamSite.compactMode ? 'text-[95%]' : ''}`}
      style={{
        ['--team-primary' as string]: teamSite.primaryColor || SIMITEC_BRAND.ocean,
        ['--team-secondary' as string]: teamSite.secondaryColor || SIMITEC_BRAND.mint,
      }}
    >
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          flex flex-col bg-sidebar border-r border-border transition-all duration-300 z-50 flex-shrink-0
          fixed md:relative h-full
          ${collapsed ? 'w-16' : 'w-60'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-4 border-b border-border ${collapsed ? 'justify-center px-2' : ''}`}>
          <img
            src={OFFICIAL_LOGO_URL}
            alt="SIMITEC"
            className="w-8 h-8 object-contain flex-shrink-0 drop-shadow-[0_0_12px_rgba(59,130,246,0.35)]"
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">SIMITEC</p>
              <p className="text-xs text-muted-foreground leading-tight">{teamSite.panelName || 'Painel Administrativo'}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-3">
          {groups.map(group => (
            <div key={group}>
              {!collapsed && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1.5">{group}</p>
              )}
              <div className="space-y-0.5">
                {visibleNav.filter(i => i.group === group).map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    data-guide-target={item.moduleKey}
                    title={collapsed ? item.label : undefined}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                      ${isActive(item.path)
                        ? 'bg-primary/15 text-primary border border-primary/20 shadow-sm'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'}
                      ${collapsed ? 'justify-center px-2' : ''}
                    `}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className={`border-t border-border p-3 space-y-2 ${collapsed ? 'flex flex-col items-center' : ''}`}>
          {!collapsed && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/50">
              <UserAvatar avatar={currentUser.avatar} avatarUrl={currentUser.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground truncate">{currentRole.name}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors rounded-lg px-2 py-1.5 w-full hover:bg-destructive/10 ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={14} />
            {!collapsed && 'Sair do Sistema'}
          </button>
        </div>

        {/* Collapse toggle (desktop) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all hidden md:flex shadow-sm"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-card/60 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <h1 className="text-sm font-medium text-foreground">{currentPage}</h1>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={openFirstRunGuide}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Abrir tutorial"
              aria-label="Abrir tutorial"
            >
              <CircleHelp size={17} />
            </button>
            <button
              onClick={toggleTheme}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div className="relative">
              <button
                onClick={() => { setShowNotifs(!showNotifs); setNotifCount(0); }}
                className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <Bell size={16} />
                {notifCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center" style={{ fontSize: '9px', fontWeight: 600 }}>{notifCount}</span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-10 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Notificações</span>
                    <button onClick={() => setShowNotifs(false)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
                  </div>
                  {alerts.map((a, i) => (
                    <div key={i} className="px-4 py-3 flex items-start gap-2 border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                      <AlertCircle size={14} className={`mt-0.5 flex-shrink-0 ${a.color}`} />
                      <p className="text-xs text-foreground">{a.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="ml-1">
              <UserAvatar avatar={currentUser.avatar} avatarUrl={currentUser.avatarUrl} size="md" />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto" data-guide-content>
          <Outlet />
        </main>
      </div>

      <Toaster richColors position="top-right" style={{ zIndex: showFirstRunGuide ? 70 : 100 }} />

      {showFirstRunGuide && activeGuideStep && (
        <div className="admin-guide-overlay fixed inset-0 z-[80]" role="presentation">
          {guideTargetRect ? (
            <div
              className="admin-guide-highlight pointer-events-none fixed rounded-lg border-2 border-primary"
              style={{
                top: guideTargetRect.top,
                left: guideTargetRect.left,
                width: guideTargetRect.width,
                height: guideTargetRect.height,
              }}
              aria-hidden="true"
            />
          ) : (
            <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
          )}

          <section ref={guideDialogRef} style={guideCardStyle} className="admin-guide-card grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-lg border border-border bg-card shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="teamGuideTitle">
            <header className="flex items-start justify-between gap-3 border-b border-border p-4 sm:gap-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">Guia rápido</p>
                <h2 id="teamGuideTitle" className="mt-1 text-lg font-semibold text-foreground">Primeiros passos no painel</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {teamSite.welcomeText || 'Use este guia para se localizar. Depois, siga direto pelo menu.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeFirstRunGuide}
                className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                data-guide-close
                aria-label="Fechar tutorial"
                title="Fechar tutorial"
              >
                <X size={17} />
              </button>
            </header>

            <div className="space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-5">
              <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Etapas do tutorial">
                {guideSteps.map((step, index) => {
                  const isActiveStep = index === firstRunGuideStep;
                  return (
                    <button
                      key={step.moduleKey}
                      type="button"
                      onClick={() => goToGuideStep(index)}
                      aria-current={isActiveStep ? 'step' : undefined}
                      aria-label={`Ir para etapa ${index + 1}: ${step.title}`}
                      className={`grid h-8 min-w-8 flex-shrink-0 place-items-center rounded-md text-xs font-semibold transition-colors ${isActiveStep ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground'}`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
                <span className="grid h-12 w-12 place-items-center rounded-lg bg-primary/15 text-primary">
                  {activeGuideStep.icon}
                </span>
                <div>
                  <p className="text-xs font-semibold text-primary">Passo {firstRunGuideStep + 1} de {guideSteps.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{activeGuideStep.location}</p>
                  <h3 className="mt-1 text-base font-semibold text-foreground">{activeGuideStep.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{activeGuideStep.description}</p>
                </div>
              </div>

              {(teamSite.showHelpTexts !== false) && (
                <div className="border-l-2 border-emerald-500/70 bg-emerald-500/8 px-4 py-3 text-sm leading-6 text-muted-foreground">
                  {teamSite.operatorMessage || teamSite.helpText || 'Antes de confirmar uma ação, revise os dados do participante, a atividade escolhida e o status de credenciamento.'}
                </div>
              )}
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <button type="button" onClick={closeFirstRunGuide} className="self-start text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                Fechar
              </button>
              <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
                {firstRunGuideStep > 0 && (
                  <button type="button" onClick={() => moveFirstRunGuide(-1)} className="inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-lg border border-border px-3 text-sm text-foreground transition-colors hover:bg-accent sm:flex-none">
                    <ChevronLeft size={16} /> Voltar
                  </button>
                )}
                {firstRunGuideStep === guideSteps.length - 1 ? (
                  <button type="button" onClick={closeFirstRunGuide} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 sm:flex-none">
                    Concluir <Check size={16} />
                  </button>
                ) : (
                  <button type="button" onClick={() => moveFirstRunGuide(1)} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 sm:flex-none">
                    Próximo <ChevronRight size={16} />
                  </button>
                )}
                <button type="button" onClick={openGuideSection} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-primary/35 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10 sm:w-auto">
                  Ir para esta área
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
