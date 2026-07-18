import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';

export function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

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
        <h1>Mini CRM</h1>
        <p>WhatsApp multiatendimento — E3</p>
        <button
          type="button"
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
