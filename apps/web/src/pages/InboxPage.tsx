import type { ConversationDto, MessageDto } from '@mini-crm/shared-types';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const POLL_INTERVAL_MS = 5000;

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function InboxPage() {
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="inbox">
      <aside className="inbox-list">
        <h2>Conversas</h2>
        {error && <p className="login-error">{error}</p>}
        {conversations.length === 0 && !error && (
          <p className="inbox-empty">Nenhuma conversa ainda.</p>
        )}
        <ul>
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <button
                type="button"
                className={
                  conversation.id === selectedId
                    ? 'conversation-item selected'
                    : 'conversation-item'
                }
                onClick={() => setSelectedId(conversation.id)}
              >
                <span className="conversation-name">
                  {conversation.contactName ?? conversation.contactPhone}
                </span>
                <span className="conversation-preview">
                  {conversation.lastMessagePreview ?? '—'}
                </span>
                <span className="conversation-time">
                  {timeFormatter.format(new Date(conversation.lastMessageAt))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="inbox-thread">
        {!selectedId && (
          <p className="inbox-empty">Selecione uma conversa à esquerda.</p>
        )}
        {selectedId &&
          messages.map((message) => (
            <div
              key={message.id}
              className={
                message.direction === 'OUTBOUND'
                  ? 'bubble outbound'
                  : 'bubble inbound'
              }
            >
              <p>{message.content}</p>
              <span className="bubble-time">
                {timeFormatter.format(new Date(message.timestamp))}
              </span>
            </div>
          ))}
      </section>
    </div>
  );
}
