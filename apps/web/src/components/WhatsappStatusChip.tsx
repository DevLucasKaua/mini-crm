import type { WhatsappConnectionStatus } from '@mini-crm/shared-types';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api';

const POLL_INTERVAL_MS = 10_000;

export const WHATSAPP_STATUS_LABELS: Record<WhatsappConnectionStatus, string> =
  {
    disconnected: 'Desconectado',
    connecting: 'Conectando…',
    qr: 'Aguardando QR',
    connected: 'Conectado',
  };

// Store mínimo: qualquer tela que receba um status novo (ação ou polling mais
// rápido, como o da Conexão) publica aqui e todos os assinantes refletem na hora.
type StatusListener = (status: WhatsappConnectionStatus) => void;
const listeners = new Set<StatusListener>();
let lastKnownStatus: WhatsappConnectionStatus | null = null;

export function publishWhatsappStatus(status: WhatsappConnectionStatus): void {
  lastKnownStatus = status;
  listeners.forEach((listener) => listener(status));
}

export function useWhatsappStatus(): WhatsappConnectionStatus | null {
  const [status, setStatus] = useState<WhatsappConnectionStatus | null>(
    lastKnownStatus,
  );

  useEffect(() => {
    const listener: StatusListener = (next) => setStatus(next);
    listeners.add(listener);

    let active = true;
    const load = () => {
      api
        .getWhatsappStatus()
        .then((data) => {
          if (active) {
            publishWhatsappStatus(data.status);
          }
        })
        .catch(() => {
          if (active) {
            setStatus(null);
          }
        });
    };
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      active = false;
      listeners.delete(listener);
      clearInterval(timer);
    };
  }, []);

  return status;
}

export function WhatsappStatusChip() {
  const status = useWhatsappStatus();

  return (
    <Link
      to="/conexao"
      className={`status-chip topbar-chip ${status ?? 'loading'}`}
      title="Status do WhatsApp da unidade"
    >
      <i />
      {status ? WHATSAPP_STATUS_LABELS[status] : '…'}
    </Link>
  );
}
