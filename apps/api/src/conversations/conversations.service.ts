import { Injectable, NotFoundException } from '@nestjs/common';
import { ConversationDto, MessageDto } from '@mini-crm/shared-types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
