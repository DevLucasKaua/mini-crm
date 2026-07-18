import type { ConversationDto, MessageDto } from '@mini-crm/shared-types';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useWhatsappStatus } from '../components/WhatsappStatusChip';
import { api, ApiError } from '../lib/api';

const POLL_INTERVAL_MS = 5000;

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeStyle: 'short',
});

function contactInitials(conversation: ConversationDto): string {
  const name = conversation.contactName?.trim();
  if (name) {
    const parts = name.split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  return conversation.contactPhone.slice(-2);
}

export function InboxPage() {
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const whatsappStatus = useWhatsappStatus();
  const msgsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      api
        .getConversations()
        .then((data) => {
          if (active) {
            setConversations(data);
            setError(null);
          }
        })
        .catch(() => {
          if (active) {
            setError('Falha ao carregar conversas.');
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

  useEffect(() => {
    setDraft('');
    setSendError(null);
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let active = true;
    const load = () => {
      api
        .getMessages(selectedId)
        .then((data) => {
          if (active) {
            setMessages(data);
          }
        })
        .catch(() => {
          if (active) {
            setError('Falha ao carregar mensagens.');
          }
        });
    };
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selectedId]);

  useEffect(() => {
    const el = msgsRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const handleSend = async () => {
    if (!selectedId || !draft.trim() || sending) {
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      const sent = await api.sendMessage(selectedId, draft.trim());
      setMessages((prev) => [...prev, sent]);
      setDraft('');
    } catch (err) {
      setSendError(
        err instanceof ApiError
          ? err.message
          : 'Falha ao enviar a mensagem. Tente novamente.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="view">
      <div className="view-head">
        <h1>
          Conversas<small>mensagens recebidas da sua unidade</small>
        </h1>
      </div>

      {error && <p className="login-error">{error}</p>}

      {whatsappStatus === 'disconnected' && (
        <div className="cv-banner">
          WhatsApp desconectado — novas mensagens não chegam e o envio está
          indisponível. <Link to="/conexao">Conectar agora</Link>
        </div>
      )}

      <div className="cv-layout">
        <div className="cv-list">
          {conversations.length === 0 && (
            <div className="vempty">Nenhuma conversa ainda.</div>
          )}
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              className={
                conversation.id === selectedId ? 'cv-item sel' : 'cv-item'
              }
              onClick={() => setSelectedId(conversation.id)}
            >
              <span className="ph-av">{contactInitials(conversation)}</span>
              <span className="cv-mid">
                <span className="cv-top">
                  <b>{conversation.contactName ?? conversation.contactPhone}</b>
                  <span>
                    {timeFormatter.format(new Date(conversation.lastMessageAt))}
                  </span>
                </span>
                <p>{conversation.lastMessagePreview ?? '—'}</p>
              </span>
            </button>
          ))}
        </div>

        <div className="cv-chat">
          {!selected && (
            <div className="cv-empty">Selecione uma conversa à esquerda.</div>
          )}
          {selected && (
            <>
              <div className="cv-head">
                <span className="ph-av">{contactInitials(selected)}</span>
                <div className="cv-head-id">
                  <b>{selected.contactName ?? selected.contactPhone}</b>
                  <span className="sub">+{selected.contactPhone}</span>
                </div>
              </div>
              <div className="cv-msgs" ref={msgsRef}>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={
                      message.direction === 'OUTBOUND' ? 'bub out' : 'bub in'
                    }
                  >
                    {message.content}
                    <span className="btime">
                      {timeFormatter.format(new Date(message.timestamp))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="cv-composer">
                {sendError && <p className="send-error">{sendError}</p>}
                <div className="cv-inputrow">
                  <textarea
                    rows={1}
                    placeholder="Escreva sua mensagem…"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void handleSend();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn primary"
                    disabled={sending || !draft.trim()}
                    onClick={() => void handleSend()}
                  >
                    {sending ? 'Enviando…' : 'Enviar'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <aside className="cv-side">
          {selected && (
            <div className="panel">
              <p className="panel-label">Dados do contato</p>
              <table className="tbl">
                <tbody>
                  <tr>
                    <td>Nome</td>
                    <td>{selected.contactName ?? '—'}</td>
                  </tr>
                  <tr>
                    <td>Telefone</td>
                    <td>+{selected.contactPhone}</td>
                  </tr>
                  <tr>
                    <td>Mensagens</td>
                    <td>{messages.length}</td>
                  </tr>
                  <tr>
                    <td>Última atividade</td>
                    <td>
                      {dateTimeFormatter.format(
                        new Date(selected.lastMessageAt),
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
