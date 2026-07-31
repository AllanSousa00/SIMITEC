import { useNavigate } from 'react-router';
import { Home, AlertCircle } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-green-500/20 border border-border flex items-center justify-center mb-6">
        <AlertCircle size={36} className="text-muted-foreground" />
      </div>
      <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
      <p className="text-lg text-muted-foreground mb-1">Página não encontrada</p>
      <p className="text-sm text-muted-foreground mb-8 text-center max-w-sm">
        A página que você está tentando acessar não existe ou foi movida.
      </p>
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all"
      >
        <Home size={16} /> Voltar ao Início
      </button>
    </div>
  );
}
