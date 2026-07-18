import { Navigate, Outlet } from 'react-router';
import { useAuth } from './AuthProvider';

export function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return <main className="centered">Carregando…</main>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
