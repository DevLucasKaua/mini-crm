import type { MeDto } from '@mini-crm/shared-types';
import { useEffect, useState } from 'react';
import { useAuth } from './auth/AuthProvider';
import { api, ApiError } from './lib/api';
import { LoginPage } from './pages/LoginPage';

export function App() {
  const { user, loading, signOut } = useAuth();
  const [me, setMe] = useState<MeDto | null>(null);
  const [meError, setMeError] = useState<string | null>(null);

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
    <main>
      <h1>Mini CRM</h1>
      <p>Conectado como {user.email}</p>
      {me && (
        <p>
          Unidade: <strong>{me.unit.name}</strong> ({me.unit.slug})
        </p>
      )}
      {meError && <p className="login-error">{meError}</p>}
      <button type="button" onClick={() => void signOut()}>
        Sair
      </button>
    </main>
  );
}
