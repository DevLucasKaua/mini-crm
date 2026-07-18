import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ConversationsService } from './conversations.service';

const UNIT_ID = 'unit-1';

function makePrismaMock() {
  return {
    conversation: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
    message: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
        direction: 'OUTBOUND',
        content: 'olá',
        timestamp: new Date('2026-07-18T12:00:00Z'),
      }),
    },
  };
}

describe('ConversationsService', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let whatsapp: { sendText: ReturnType<typeof vi.fn> };
  let service: ConversationsService;

  beforeEach(() => {
    prisma = makePrismaMock();
    whatsapp = { sendText: vi.fn().mockResolvedValue({ key: { id: 's1' } }) };
    service = new ConversationsService(
      prisma as unknown as PrismaService,
      whatsapp as unknown as WhatsappService,
    );
  });

  it('list filtra sempre pela unidade', async () => {
    await service.list(UNIT_ID);
    expect(prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { unitId: UNIT_ID } }),
    );
  });

  it('listMessages nega conversa de outra unidade com 404', async () => {
    prisma.conversation.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.listMessages(UNIT_ID, 'conv-de-outra-unidade'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.conversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conv-de-outra-unidade', unitId: UNIT_ID },
      }),
    );
  });

  describe('sendMessage', () => {
    it('rejeita mensagem vazia', async () => {
      await expect(
        service.sendMessage(UNIT_ID, 'conv-1', '   '),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('404 para conversa inexistente ou de outra unidade', async () => {
      prisma.conversation.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.sendMessage(UNIT_ID, 'conv-x', 'olá'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('409 quando a conversa não tem remoteJid', async () => {
      prisma.conversation.findFirst.mockResolvedValueOnce({
        id: 'conv-1',
        remoteJid: null,
      });
      await expect(
        service.sendMessage(UNIT_ID, 'conv-1', 'olá'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('409 quando o whatsapp está desconectado', async () => {
      prisma.conversation.findFirst.mockResolvedValueOnce({
        id: 'conv-1',
        remoteJid: '1@s.whatsapp.net',
      });
      whatsapp.sendText.mockResolvedValueOnce(undefined);
      await expect(
        service.sendMessage(UNIT_ID, 'conv-1', 'olá'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.message.create).not.toHaveBeenCalled();
    });

    it('envia, persiste OUTBOUND e atualiza lastMessageAt', async () => {
      prisma.conversation.findFirst.mockResolvedValueOnce({
        id: 'conv-1',
        remoteJid: '1@s.whatsapp.net',
      });
      const result = await service.sendMessage(UNIT_ID, 'conv-1', ' olá ');
      expect(whatsapp.sendText).toHaveBeenCalledWith(
        UNIT_ID,
        '1@s.whatsapp.net',
        'olá',
      );
      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            direction: 'OUTBOUND',
            content: 'olá',
            waMessageId: 's1',
          }),
        }),
      );
      expect(prisma.conversation.update).toHaveBeenCalled();
      expect(result.direction).toBe('OUTBOUND');
    });
  });
});
