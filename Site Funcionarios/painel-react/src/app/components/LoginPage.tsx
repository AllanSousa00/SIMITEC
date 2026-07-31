import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';

const OFFICIAL_LOGO_URL = '/assets/simitec-logo-oficial-2026-transparente.png';

async function requestApi(path: string, body: Record<string, string>) {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data?.message || 'Não foi possível concluir a solicitação.');
  return data;
}

export function LoginPage() {
  const { login, loginWithGoogleCredential, isAuthenticated } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const resetToken = new URLSearchParams(location.search).get('reset')?.trim() || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [teamSite, setTeamSite] = useState<Record<string, any>>({});

  useEffect(() => {
    let active = true;
    fetch('/api/registrations/event', { credentials: 'include' })
      .then(async response => {
        const text = await response.text();
        return text ? JSON.parse(text) : {};
      })
      .then(data => {
        if (active) setTeamSite(data?.event?.teamSite || data?.content?.event?.teamSite || {});
      })
      .catch(() => {
        if (active) setTeamSite({});
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (isAuthenticated && !resetToken) navigate('/', { replace: true });
  }, [isAuthenticated, navigate, resetToken]);

  useEffect(() => {
    if (teamSite.passwordRecoveryEnabled === false && forgotMode) setForgotMode(false);
  }, [teamSite.passwordRecoveryEnabled, forgotMode]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      toast.error('Preencha e-mail e senha.');
      return;
    }
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) {
      toast.success('Entrada realizada.');
      navigate('/');
    } else {
      toast.error('E-mail ou senha inválidos, ou sua conta não possui acesso à equipe.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const configResponse = await fetch('/api/auth/google/config', { credentials: 'include' });
      const config = await configResponse.json();
      if (teamSite.googleLoginEnabled === false) {
        toast.error('Login com Google desativado para a equipe.');
        return;
      }
      if (!config.enabled || !config.clientId) {
        toast.error('Login com Google não configurado.');
        return;
      }
      await new Promise<void>((resolve, reject) => {
        if ((window as any).google?.accounts?.id) return resolve();
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Não foi possível carregar o login com Google.'));
        document.head.appendChild(script);
      });
      (window as any).google.accounts.id.initialize({
        client_id: config.clientId,
        callback: async (response: { credential?: string }) => {
          if (!response.credential) {
            toast.error('O Google não retornou uma credencial.');
            return;
          }
          const ok = await loginWithGoogleCredential(response.credential);
          if (ok) {
            toast.success('Entrada com Google realizada.');
            navigate('/');
          } else {
            toast.error('Esta conta Google não possui acesso à equipe.');
          }
        },
      });
      (window as any).google.accounts.id.prompt();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível entrar com Google.');
    }
  };

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!forgotEmail) {
      toast.error('Informe seu e-mail.');
      return;
    }
    setLoading(true);
    try {
      await requestApi('/api/auth/forgot-password', { email: forgotEmail, audience: 'staff' });
      toast.success('Se a conta existir, enviaremos as instruções de recuperação.');
      setForgotMode(false);
      setForgotEmail('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar as instruções.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newPassword || !confirmation) {
      toast.error('Preencha e confirme a nova senha.');
      return;
    }
    if (newPassword !== confirmation) {
      toast.error('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      await requestApi('/api/auth/reset-password', { token: resetToken, password: newPassword });
      toast.success('Senha atualizada. Entre com a nova senha.');
      setNewPassword('');
      setConfirmation('');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar a senha.');
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = 'w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';

  if (isAuthenticated && !resetToken) return null;

  return (
    <main className="min-h-screen bg-background px-4 py-8 flex items-center justify-center">
      <section className="w-full max-w-[420px]">
        <header className="flex items-center gap-3 mb-7">
          <img src={OFFICIAL_LOGO_URL} alt="SIMITEC" className="w-11 h-11 object-contain" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">SIMITEC</h1>
            <p className="text-sm text-muted-foreground">{teamSite.loginSubtitle || 'Acesso da equipe'}</p>
          </div>
        </header>

        <div className="bg-card border border-border rounded-lg shadow-sm p-6 sm:p-8">
          {resetToken ? (
            <>
              <div className="flex items-start gap-3 mb-6">
                <div className="shrink-0 w-10 h-10 rounded-md bg-primary/10 text-primary grid place-items-center"><KeyRound size={19} /></div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Crie uma nova senha</h2>
                  <p className="text-sm text-muted-foreground mt-1">Escolha uma senha segura para recuperar seu acesso.</p>
                </div>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-foreground">Nova senha</span>
                  <span className="relative block mt-1.5">
                    <LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={event => setNewPassword(event.target.value)} className={`${fieldClass} pl-9 pr-10`} autoComplete="new-password" />
                    <button type="button" aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowNewPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-foreground">Confirmar nova senha</span>
                  <input type={showNewPassword ? 'text' : 'password'} value={confirmation} onChange={event => setConfirmation(event.target.value)} className={`${fieldClass} mt-1.5`} autoComplete="new-password" />
                </label>
                <p className="text-xs text-muted-foreground">Use pelo menos 8 caracteres, com letras e números.</p>
                <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {loading ? 'Atualizando...' : 'Atualizar senha'}
                </button>
              </form>
            </>
          ) : forgotMode ? (
            <>
              <button type="button" onClick={() => setForgotMode(false)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5">
                <ArrowLeft size={16} /> Voltar para entrada
              </button>
              <div className="flex items-start gap-3 mb-6">
                <div className="shrink-0 w-10 h-10 rounded-md bg-primary/10 text-primary grid place-items-center"><Mail size={19} /></div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Recuperar senha</h2>
                  <p className="text-sm text-muted-foreground mt-1">Enviaremos um link seguro para o e-mail cadastrado.</p>
                </div>
              </div>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-foreground">E-mail</span>
                  <span className="relative block mt-1.5">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input type="email" value={forgotEmail} onChange={event => setForgotEmail(event.target.value)} className={`${fieldClass} pl-9`} placeholder="nome@instituicao.edu.br" autoComplete="email" />
                  </span>
                </label>
                <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 mb-7">
                <div className="shrink-0 w-10 h-10 rounded-md bg-primary/10 text-primary grid place-items-center"><ShieldCheck size={19} /></div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{teamSite.loginTitle || 'Entrar na equipe'}</h2>
                  <p className="text-sm text-muted-foreground mt-1">Use suas credenciais autorizadas.</p>
                </div>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-foreground">E-mail</span>
                  <span className="relative block mt-1.5">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input type="email" value={email} onChange={event => setEmail(event.target.value)} className={`${fieldClass} pl-9`} placeholder="nome@instituicao.edu.br" autoComplete="email" />
                  </span>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-foreground">Senha</span>
                  <span className="relative block mt-1.5">
                    <LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input type={showPass ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} className={`${fieldClass} pl-9 pr-10`} autoComplete="current-password" />
                    <button type="button" aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPass(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                </label>
                {teamSite.passwordRecoveryEnabled !== false && (
                  <div className="flex justify-end">
                    <button type="button" onClick={() => setForgotMode(true)} className="text-sm text-primary hover:underline">Esqueceu a senha?</button>
                  </div>
                )}
                <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
              {teamSite.googleLoginEnabled !== false && (
                <div className="mt-6 pt-5 border-t border-border">
                  <button type="button" onClick={handleGoogleLogin} className="w-full inline-flex items-center justify-center gap-2 border border-border rounded-md py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors">
                    <CheckCircle2 size={16} className="text-primary" /> Entrar com Google
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">Acesso restrito a pessoas autorizadas pela SIMITEC.</p>
      </section>
    </main>
  );
}
