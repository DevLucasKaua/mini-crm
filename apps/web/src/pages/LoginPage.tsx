import { useState } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';

export function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async () => {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch {
      setError('Falha ao entrar com o Google. Tente novamente.');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand login-brand" aria-label="Mini CRM">
          MINI<b>CRM</b>
        </div>
        <p className="login-tagline">
          Atendimento WhatsApp por unidade, num só lugar.
        </p>
        <button
          type="button"
          className="btn primary login-btn"
          onClick={() => void handleSignIn()}
          disabled={signingIn}
        >
          {signingIn ? 'Entrando…' : 'Entrar com Google'}
        </button>
        {error && <p className="login-error">{error}</p>}
      </section>
    </main>
  );
}
