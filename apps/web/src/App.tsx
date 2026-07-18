import type { MeDto } from '@mini-crm/shared-types';
import { useEffect, useState } from 'react';
import { useAuth } from './auth/AuthProvider';
import { api, ApiError } from './lib/api';
import { ConnectPage } from './pages/ConnectPage';
import { InboxPage } from './pages/InboxPage';
import { LoginPage } from './pages/LoginPage';

type View = 'inbox' | 'connect';

export function App() {
  const { user, loading, signOut } = useAuth();
  const [me, setMe] = useState<MeDto | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [view, setView] = useState<View>('inbox');

  useEffect(() => {
    if (!user) {
      setMe(null);
      setMeError(null);
      return;
    }
    api
      .getMe()
      .then(setMe)
      .catch((error: unknown) => {
        setMeError(
          error instanceof ApiError && error.status === 403
            ? 'Sua conta não está cadastrada em nenhuma unidade.'
            : 'Falha ao carregar seus dados. A API está no ar?',
        );
      });
  }, [user]);

  if (loading) {
    return <main className="centered">Carregando…</main>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-nav">
          <h1>Mini CRM</h1>
          <nav>
            <button
              type="button"
              className={view === 'inbox' ? 'nav-link active' : 'nav-link'}
              onClick={() => setView('inbox')}
            >
              Inbox
            </button>
            <button
              type="button"
              className={view === 'connect' ? 'nav-link active' : 'nav-link'}
              onClick={() => setView('connect')}
            >
              Conexão
            </button>
          </nav>
        </div>
        <div className="app-header-user">
          {me && (
            <span>
              {user.email} — <strong>{me.unit.name}</strong>
            </span>
          )}
          <button type="button" onClick={() => void signOut()}>
            Sair
          </button>
        </div>
      </header>
      {meError && <p className="login-error">{meError}</p>}
      {me && (view === 'inbox' ? <InboxPage /> : <ConnectPage />)}
    </div>
  );
}
