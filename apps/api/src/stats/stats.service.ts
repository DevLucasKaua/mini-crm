import { Injectable } from '@nestjs/common';
import { StatsDto } from '@mini-crm/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
  ) {}

  async getStats(unitId: string): Promise<StatsDto> {
    const [conversations, messagesInbound, messagesOutbound, latest] =
      await Promise.all([
        this.prisma.conversation.count({ where: { unitId } }),
        this.prisma.message.count({ where: { unitId, direction: 'INBOUND' } }),
        this.prisma.message.count({ where: { unitId, direction: 'OUTBOUND' } }),
        this.prisma.conversation.findFirst({
          where: { unitId },
          orderBy: { lastMessageAt: 'desc' },
          select: { lastMessageAt: true },
        }),
      ]);

    return {
      conversations,
      messagesInbound,
      messagesOutbound,
      lastMessageAt: latest?.lastMessageAt.toISOString() ?? null,
      whatsappStatus: this.whatsapp.getStatus(unitId).status,
    };
  }
}
