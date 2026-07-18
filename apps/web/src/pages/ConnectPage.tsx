import type { WhatsappStatusDto } from '@mini-crm/shared-types';
import { useEffect, useState } from 'react';
import { publishWhatsappStatus } from '../components/WhatsappStatusChip';
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
            publishWhatsappStatus(data.status);
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
      const next = await api.connectWhatsapp();
      setStatus(next);
      publishWhatsappStatus(next.status);
    } catch {
      setError('Falha ao iniciar a conexão.');
    } finally {
      setStarting(false);
    }
  };

  const handleDisconnect = async () => {
    setError(null);
    setStarting(true);
    try {
      const next = await api.disconnectWhatsapp();
      setStatus(next);
      publishWhatsappStatus(next.status);
    } catch {
      setError('Falha ao desconectar.');
    } finally {
      setStarting(false);
    }
  };

  const current = status?.status ?? null;

  return (
    <section className="view">
      <div className="view-head">
        <h1>
          Conexão<small>WhatsApp da sua unidade</small>
        </h1>
      </div>

      <div className="panel connect-panel">
        <div className="connect-status-row">
          <span
            className={`status-chip ${current ?? 'loading'}`}
            aria-live="polite"
          >
            <i />
            {current ? STATUS_LABELS[current] : 'Carregando…'}
          </span>
        </div>

        {error && <p className="login-error">{error}</p>}

        {current === 'disconnected' && (
          <>
            <p className="connect-hint">
              Conecte o número de WhatsApp desta unidade para receber as
              conversas no CRM.
            </p>
            <button
              type="button"
              className="btn primary"
              onClick={() => void handleConnect()}
              disabled={starting}
            >
              {starting ? 'Iniciando…' : 'Conectar WhatsApp'}
            </button>
          </>
        )}

        {current === 'qr' && status?.qrDataUrl && (
          <div className="connect-qr">
            <img src={status.qrDataUrl} alt="QR code para parear o WhatsApp" />
            <p>
              Abra o WhatsApp no celular em <strong>Aparelhos conectados</strong>{' '}
              e escaneie o código. Ele é renovado automaticamente.
            </p>
            <button
              type="button"
              className="btn"
              onClick={() => void handleDisconnect()}
              disabled={starting}
            >
              Cancelar
            </button>
          </div>
        )}

        {current === 'connected' && (
          <>
            <p className="connect-ok">
              WhatsApp conectado. As mensagens recebidas aparecem em Conversas.
            </p>
            <button
              type="button"
              className="btn"
              onClick={() => void handleDisconnect()}
              disabled={starting}
            >
              {starting ? 'Desconectando…' : 'Desconectar'}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
