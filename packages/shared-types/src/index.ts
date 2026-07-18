export type MessageDirection = 'INBOUND' | 'OUTBOUND';

export type WhatsappConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'qr'
  | 'connected';

export interface UnitDto {
  id: string;
  name: string;
  slug: string;
}

export interface MeDto {
  id: string;
  email: string;
  name: string | null;
  unit: UnitDto;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  content: string;
  timestamp: string;
}

export interface ConversationDto {
  id: string;
  contactPhone: string;
  contactName: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
}

export interface WhatsappStatusDto {
  status: WhatsappConnectionStatus;
  qrDataUrl: string | null;
}
