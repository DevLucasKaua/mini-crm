import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationDto, MessageDto } from '@mini-crm/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

const MAX_MESSAGE_LENGTH = 4096;

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
  ) {}

  async list(unitId: string): Promise<ConversationDto[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: { unitId },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: { content: true },
        },
      },
    });

    return conversations.map((conversation) => ({
      id: conversation.id,
      contactPhone: conversation.contactPhone,
      contactName: conversation.contactName,
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      lastMessagePreview: conversation.messages[0]?.content ?? null,
    }));
  }

  async listMessages(unitId: string, conversationId: string): Promise<MessageDto[]> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, unitId },
      select: { id: true },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' },
    });

    return messages.map((message) => ({
      id: message.id,
      conversationId: message.conversationId,
      direction: message.direction,
      content: message.content,
      timestamp: message.timestamp.toISOString(),
    }));
  }

  async sendMessage(
    unitId: string,
    conversationId: string,
    rawContent: string,
  ): Promise<MessageDto> {
    const content = rawContent?.trim();
    if (!content) {
      throw new BadRequestException('Mensagem vazia');
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestException('Mensagem longa demais');
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, unitId },
      select: { id: true, remoteJid: true },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (!conversation.remoteJid) {
      throw new ConflictException(
        'Conversa sem destino conhecido — aguarde uma nova mensagem do contato',
      );
    }

    const sent = await this.whatsapp.sendText(
      unitId,
      conversation.remoteJid,
      content,
    );
    if (!sent) {
      throw new ConflictException('WhatsApp desconectado');
    }

    const timestamp = new Date();
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        unitId,
        direction: 'OUTBOUND',
        content,
        waMessageId: sent.key?.id ?? null,
        timestamp,
      },
    });
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: timestamp },
    });

    return {
      id: message.id,
      conversationId: message.conversationId,
      direction: message.direction,
      content: message.content,
      timestamp: message.timestamp.toISOString(),
    };
  }
}
