import type { StatsDto, WhatsappConnectionStatus } from '@mini-crm/shared-types';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const POLL_INTERVAL_MS = 10_000;

const STATUS_LABELS: Record<WhatsappConnectionStatus, string> = {
  disconnected: 'Desconectado',
  connecting: 'Conectando…',
  qr: 'Aguardando QR',
  connected: 'Conectado',
};

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function OverviewPage() {
  const [stats, setStats] = useState<StatsDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      api
        .getStats()
        .then((data) => {
          if (active) {
            setStats(data);
            setError(null);
          }
        })
        .catch(() => {
          if (active) {
            setError('Falha ao carregar os indicadores.');
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

  return (
    <section className="view">
      <div className="view-head">
        <h1>
          Visão geral<small>resumo da sua unidade</small>
        </h1>
      </div>

      {error && <p className="login-error">{error}</p>}

      <div className="grid dash-grid">
        <div className="panel kpi">
          <p className="panel-label">Conversas</p>
          <span className="num">{stats ? stats.conversations : '—'}</span>
        </div>
        <div className="panel kpi">
          <p className="panel-label">Mensagens recebidas</p>
          <span className="num">{stats ? stats.messagesInbound : '—'}</span>
        </div>
        <div className="panel kpi">
          <p className="panel-label">Mensagens enviadas</p>
          <span className="num">{stats ? stats.messagesOutbound : '—'}</span>
        </div>
        <div className="panel kpi">
          <p className="panel-label">WhatsApp</p>
          <span
            className={`status-chip kpi-chip ${stats?.whatsappStatus ?? 'loading'}`}
          >
            <i />
            {stats ? STATUS_LABELS[stats.whatsappStatus] : 'Carregando…'}
          </span>
        </div>
        <div className="panel kpi wide">
          <p className="panel-label">Última atividade</p>
          <span className="num num-sm">
            {stats?.lastMessageAt
              ? dateTimeFormatter.format(new Date(stats.lastMessageAt))
              : 'Sem mensagens ainda'}
          </span>
        </div>
      </div>
    </section>
  );
}
