import type { WhatsappStatusDto } from '@mini-crm/shared-types';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const POLL_INTERVAL_MS = 2500;

const STATUS_LABELS: Record<WhatsappStatusDto['status'], string> = {
  disconnected: 'Desconectado',
  connecting: 'Conectando…',
  qr: 'Aguardando leitura do QR code',
  connected: 'Conectado',
};

export function ConnectPage() {
  const [status, setStatus] = useState<WhatsappStatusDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () => {
      api
        .getWhatsappStatus()
        .then((data) => {
          if (active) {
            setStatus(data);
            setError(null);
          }
        })
        .catch(() => {
          if (active) {
            setError('Falha ao consultar o status do WhatsApp.');
          }
        });
    };
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const handleConnect = async () => {
    setError(null);
    setStarting(true);
    try {
      setStatus(await api.connectWhatsapp());
    } catch {
      setError('Falha ao iniciar a conexão.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <section className="connect-page">
      <h2>Conexão do WhatsApp</h2>
      <p>
        Status:{' '}
        <strong>{status ? STATUS_LABELS[status.status] : 'Carregando…'}</strong>
      </p>
      {error && <p className="login-error">{error}</p>}

      {status?.status === 'disconnected' && (
        <button
          type="button"
          onClick={() => void handleConnect()}
          disabled={starting}
        >
          {starting ? 'Iniciando…' : 'Conectar WhatsApp'}
        </button>
      )}

      {status?.status === 'qr' && status.qrDataUrl && (
        <div className="connect-qr">
          <img src={status.qrDataUrl} alt="QR code para parear o WhatsApp" />
          <p>
            Abra o WhatsApp no celular em <strong>Aparelhos conectados</strong>{' '}
            e escaneie o código. Ele é renovado automaticamente.
          </p>
        </div>
      )}

      {status?.status === 'connected' && (
        <p className="connect-ok">
          ✅ WhatsApp conectado. As mensagens recebidas aparecem no Inbox.
        </p>
      )}
    </section>
  );
}
