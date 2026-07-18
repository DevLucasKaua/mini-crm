import type {
  ConversationDto,
  MeDto,
  MessageDto,
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
    throw new ApiError(response.status, `Erro ${response.status} em ${path}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  getMe: () => request<MeDto>('/me'),
  getConversations: () => request<ConversationDto[]>('/conversations'),
  getMessages: (conversationId: string) =>
    request<MessageDto[]>(`/conversations/${conversationId}/messages`),
  connectWhatsapp: () =>
    request<WhatsappStatusDto>('/whatsapp/connect', { method: 'POST' }),
  getWhatsappStatus: () => request<WhatsappStatusDto>('/whatsapp/status'),
};
