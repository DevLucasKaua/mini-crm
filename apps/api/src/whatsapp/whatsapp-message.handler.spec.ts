import { Prisma } from '@prisma/client';
import { WAMessage } from '@whiskeysockets/baileys';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import {
  MessagesUpsertPayload,
  SendText,
  WhatsappMessageHandler,
} from './whatsapp-message.handler';

const UNIT_ID = 'unit-1';
const CONVERSATION = {
  id: 'conv-1',
  unitId: UNIT_ID,
  contactPhone: '558199990000',
  contactName: 'Contato',
  remoteJid: '558199990000@s.whatsapp.net',
  lastMessageAt: new Date(),
};

function makePrismaMock() {
  return {
    conversation: {
      upsert: vi.fn().mockResolvedValue(CONVERSATION),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(CONVERSATION),
    },
    message: {
      create: vi.fn().mockResolvedValue({ id: 'msg-1' }),
    },
  };
}

function makeMessage(overrides: {
  remoteJid: string;
  fromMe?: boolean;
  text?: string | null;
  id?: string;
  senderPn?: string;
  pushName?: string;
}) {
  return {
    key: {
      remoteJid: overrides.remoteJid,
      fromMe: overrides.fromMe ?? false,
      id: overrides.id ?? 'wa-msg-1',
      ...(overrides.senderPn ? { senderPn: overrides.senderPn } : {}),
    },
    pushName: overrides.pushName,
    messageTimestamp: 1770000000,
    message:
      overrides.text === null ? {} : { conversation: overrides.text ?? 'olá' },
  };
}

function upsertPayload(messages: unknown[]): MessagesUpsertPayload {
  return { type: 'notify', messages } as MessagesUpsertPayload;
}

describe('WhatsappMessageHandler', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let handler: WhatsappMessageHandler;
  let sendText: Mock<SendText>;

  beforeEach(() => {
    prisma = makePrismaMock();
    handler = new WhatsappMessageHandler(prisma as unknown as PrismaService);
    sendText = vi.fn<SendText>().mockResolvedValue({
      key: { id: 'sent-1' },
      messageTimestamp: 1770000001,
    } as WAMessage);
  });

  it('ignora eventos que não são notify', async () => {
    await handler.handleUpsert(
      UNIT_ID,
      {
        type: 'append',
        messages: [makeMessage({ remoteJid: '1@s.whatsapp.net', text: 'Oi' })],
      } as MessagesUpsertPayload,
      sendText,
    );
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('ignora grupos, status e mensagens sem texto', async () => {
    await handler.handleUpsert(
      UNIT_ID,
      upsertPayload([
        makeMessage({ remoteJid: '123-456@g.us', text: 'num grupo' }),
        makeMessage({ remoteJid: 'status@broadcast', text: 'status' }),
        makeMessage({ remoteJid: '1@s.whatsapp.net', text: null }),
      ]),
      sendText,
    );
    expect(prisma.conversation.upsert).not.toHaveBeenCalled();
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('persiste inbound com upsert da conversa e direção INBOUND', async () => {
    await handler.handleUpsert(
      UNIT_ID,
      upsertPayload([
        makeMessage({
          remoteJid: '558199990000@s.whatsapp.net',
          text: 'bom dia',
          pushName: 'Contato',
        }),
      ]),
      sendText,
    );
    expect(prisma.conversation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          unitId_contactPhone: {
            unitId: UNIT_ID,
            contactPhone: '558199990000',
          },
        },
      }),
    );
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: 'INBOUND',
          content: 'bom dia',
        }),
      }),
    );
    expect(sendText).not.toHaveBeenCalled();
  });

  it('resolve o telefone real via senderPn em chats @lid', async () => {
    await handler.handleUpsert(
      UNIT_ID,
      upsertPayload([
        makeMessage({
          remoteJid: '201185545998457@lid',
          senderPn: '558191827813@s.whatsapp.net',
          text: 'oi pelo lid',
        }),
      ]),
      sendText,
    );
    expect(prisma.conversation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          unitId_contactPhone: {
            unitId: UNIT_ID,
            contactPhone: '558191827813',
          },
        },
      }),
    );
  });

  it('dispara o bot apenas para "Oi" exato', async () => {
    await handler.handleUpsert(
      UNIT_ID,
      upsertPayload([
        makeMessage({ remoteJid: '1@s.whatsapp.net', text: 'Oi', id: 'a' }),
      ]),
      sendText,
    );
    expect(sendText).toHaveBeenCalledWith(
      '1@s.whatsapp.net',
      'Oi! Aqui é o Atendente da E3',
    );
    // resposta persistida como OUTBOUND
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: 'OUTBOUND',
          content: 'Oi! Aqui é o Atendente da E3',
        }),
      }),
    );
  });

  it.each(['oi', 'OI', 'Oi!', 'oi tudo bem'])(
    'não dispara o bot para "%s"',
    async (text) => {
      await handler.handleUpsert(
        UNIT_ID,
        upsertPayload([makeMessage({ remoteJid: '1@s.whatsapp.net', text })]),
        sendText,
      );
      expect(sendText).not.toHaveBeenCalled();
    },
  );

  it('reentrega (P2002) não duplica nem re-responde', async () => {
    prisma.message.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('duplicado', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    await handler.handleUpsert(
      UNIT_ID,
      upsertPayload([
        makeMessage({ remoteJid: '1@s.whatsapp.net', text: 'Oi' }),
      ]),
      sendText,
    );
    expect(sendText).not.toHaveBeenCalled();
    expect(prisma.message.create).toHaveBeenCalledTimes(1);
  });

  it('persiste fromMe como OUTBOUND na conversa mapeada por remoteJid', async () => {
    prisma.conversation.findFirst.mockResolvedValueOnce(CONVERSATION);
    await handler.handleUpsert(
      UNIT_ID,
      upsertPayload([
        makeMessage({
          remoteJid: '201185545998457@lid',
          fromMe: true,
          text: 'respondendo pelo aparelho',
        }),
      ]),
      sendText,
    );
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: 'OUTBOUND',
          conversationId: CONVERSATION.id,
        }),
      }),
    );
    expect(sendText).not.toHaveBeenCalled();
  });

  it('ignora fromMe em chat @lid sem conversa conhecida', async () => {
    await handler.handleUpsert(
      UNIT_ID,
      upsertPayload([
        makeMessage({
          remoteJid: '999@lid',
          fromMe: true,
          text: 'sem conversa',
        }),
      ]),
      sendText,
    );
    expect(prisma.message.create).not.toHaveBeenCalled();
  });
});
