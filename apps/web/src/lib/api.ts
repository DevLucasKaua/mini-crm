import type {
  ConversationDto,
  MeDto,
  MessageDto,
  SendMessageInput,
  StatsDto,
  WhatsappStatusDto,
} from '@mini-crm/shared-types';
import { auth } from './firebase';

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new ApiError(401, 'Usuário não autenticado');
  }
  const token = await user.getIdToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let detail = `Erro ${response.status} em ${path}`;
    try {
      const body = (await response.json()) as { message?: unknown };
      if (typeof body.message === 'string') {
        detail = body.message;
      }
    } catch {
      // corpo não-JSON — mantém a mensagem genérica
    }
    throw new ApiError(response.status, detail);
  }
  return response.json() as Promise<T>;
}

export const api = {
  getMe: () => request<MeDto>('/me'),
  getStats: () => request<StatsDto>('/stats'),
  getConversations: () => request<ConversationDto[]>('/conversations'),
  getMessages: (conversationId: string) =>
    request<MessageDto[]>(`/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, content: string) =>
    request<MessageDto>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content } satisfies SendMessageInput),
    }),
  connectWhatsapp: () =>
    request<WhatsappStatusDto>('/whatsapp/connect', { method: 'POST' }),
  disconnectWhatsapp: () =>
    request<WhatsappStatusDto>('/whatsapp/disconnect', { method: 'POST' }),
  getWhatsappStatus: () => request<WhatsappStatusDto>('/whatsapp/status'),
};
