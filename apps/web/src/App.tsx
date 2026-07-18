import { useAuth } from './auth/AuthProvider';
import { LoginPage } from './pages/LoginPage';

export function App() {
  const { user, loading, signOut } = useAuth();

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
      <button type="button" onClick={() => void signOut()}>
        Sair
      </button>
    </main>
  );
}
