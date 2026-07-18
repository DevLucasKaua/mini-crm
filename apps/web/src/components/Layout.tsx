import type { MeDto } from '@mini-crm/shared-types';
import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { api, ApiError } from '../lib/api';
import { ThemeToggle } from '../theme/ThemeToggle';
import { WhatsappStatusChip } from './WhatsappStatusChip';

const navClassName = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'active' : undefined;

function initials(email: string | null | undefined): string {
  if (!email) {
    return '?';
  }
  return email.slice(0, 2).toUpperCase();
}

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

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
    <div className="app">
      <header className="topbar">
        <div className="brand" aria-label="Mini CRM">
          MINI<b>CRM</b>
        </div>
        <div className="top-right">
          {me && (
            <span className="usage">
              {user?.email} · <b>{me.unit.name}</b>
            </span>
          )}
          <WhatsappStatusChip />
          <ThemeToggle />
          <div className="avatar" title={user?.email ?? undefined}>
            {initials(user?.email)}
          </div>
          <button
            type="button"
            className="signout"
            onClick={() => void signOut()}
          >
            Sair
          </button>
        </div>
      </header>

      <div className="shell">
        <aside className="side">
          <nav aria-label="Navegação">
            <NavLink to="/" end className={navClassName}>
              <span>Visão geral</span>
              <svg {...iconProps}>
                <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5Z" />
              </svg>
            </NavLink>
            <NavLink to="/conversas" className={navClassName}>
              <span>Conversas</span>
              <svg {...iconProps}>
                <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H12l-4.5 3.5V17H6.5A2.5 2.5 0 0 1 4 14.5v-8Z" />
              </svg>
            </NavLink>
            <NavLink to="/conexao" className={navClassName}>
              <span>Conexão</span>
              <svg {...iconProps}>
                <path d="M9 7V4.5M15 7V4.5M7.5 7h9v5a4.5 4.5 0 0 1-9 0V7ZM12 16.5v3" />
              </svg>
            </NavLink>
          </nav>
        </aside>

        <main>
          {meError && <p className="login-error">{meError}</p>}
          {me && <Outlet />}
        </main>
      </div>
    </div>
  );
}
