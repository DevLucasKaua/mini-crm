import type { MeDto } from '@mini-crm/shared-types';
import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { api, ApiError } from '../lib/api';
import { ThemeToggle } from '../theme/ThemeToggle';

const navClassName = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'nav-link active' : 'nav-link';

export function Layout() {
  const { user, signOut } = useAuth();
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

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-nav">
          <h1>Mini CRM</h1>
          <nav>
            <NavLink to="/" end className={navClassName}>
              Inbox
            </NavLink>
            <NavLink to="/connect" className={navClassName}>
              Conexão
            </NavLink>
          </nav>
        </div>
        <div className="app-header-user">
          <ThemeToggle />
          {me && (
            <span>
              {user?.email} — <strong>{me.unit.name}</strong>
            </span>
          )}
          <button type="button" onClick={() => void signOut()}>
            Sair
          </button>
        </div>
      </header>
      {meError && <p className="login-error">{meError}</p>}
      {me && <Outlet />}
    </div>
  );
}
