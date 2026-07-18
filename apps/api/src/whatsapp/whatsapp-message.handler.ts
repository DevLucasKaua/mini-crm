import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WAMessage } from '@whiskeysockets/baileys';
import { PrismaService } from '../prisma/prisma.service';

const USER_JID_SUFFIX = '@s.whatsapp.net';
const LID_JID_SUFFIX = '@lid';

export interface MessagesUpsertPayload {
  messages: WAMessage[];
  type: string;
}

@Injectable()
export class WhatsappMessageHandler {
  private readonly logger = new Logger(WhatsappMessageHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleUpsert(
    unitId: string,
    upsert: MessagesUpsertPayload,
  ): Promise<void> {
    if (upsert.type !== 'notify') {
      return;
    }
    for (const message of upsert.messages) {
      try {
        await this.persistInbound(unitId, message);
      } catch (error) {
        this.logger.error(
          `Failed to persist message for unit ${unitId}: ${(error as Error).message}`,
        );
      }
    }
  }

  private async persistInbound(
    unitId: string,
    message: WAMessage,
  ): Promise<void> {
    const jid = message.key.remoteJid;
    if (!jid || message.key.fromMe) {
      return;
    }
    // exclui grupos (@g.us), status@broadcast e newsletters; DMs chegam como
    // @s.whatsapp.net ou, em contas com privacidade de número, como @lid
    if (!jid.endsWith(USER_JID_SUFFIX) && !jid.endsWith(LID_JID_SUFFIX)) {
      return;
    }
    const content = this.extractText(message);
    if (!content) {
      return;
    }

    const contactPhone = this.resolveContactPhone(message, jid);
    const contactName = message.pushName || null;
    const timestamp = this.toDate(message.messageTimestamp);

    const conversation = await this.prisma.conversation.upsert({
      where: { unitId_contactPhone: { unitId, contactPhone } },
      update: {
        lastMessageAt: timestamp,
        ...(contactName ? { contactName } : {}),
      },
      create: { unitId, contactPhone, contactName, lastMessageAt: timestamp },
    });

    try {
      await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          unitId,
          direction: 'INBOUND',
          content,
          waMessageId: message.key.id ?? null,
          timestamp,
        },
      });
    } catch (error) {
      // waMessageId é @unique — colisão significa mensagem já persistida
      // (Baileys pode reentregar a mesma mensagem), então apenas ignora.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }
      throw error;
    }

    this.logger.log(
      `Inbound message persisted for unit ${unitId} from ${contactPhone}`,
    );
  }

  // Em chats @lid o número real vem em key.senderPn (campo ainda não tipado
  // no proto do Baileys 6.7.x); sem ele, usa o próprio identificador do JID.
  private resolveContactPhone(message: WAMessage, jid: string): string {
    const senderPn = (message.key as { senderPn?: string | null }).senderPn;
    const source =
      jid.endsWith(LID_JID_SUFFIX) && senderPn?.endsWith(USER_JID_SUFFIX)
        ? senderPn
        : jid;
    return source.replace(/@.+$/, '');
  }

  private extractText(message: WAMessage): string | null {
    const body = message.message;
    return body?.conversation ?? body?.extendedTextMessage?.text ?? null;
  }

  private toDate(messageTimestamp: WAMessage['messageTimestamp']): Date {
    if (typeof messageTimestamp === 'number') {
      return new Date(messageTimestamp * 1000);
    }
    if (messageTimestamp && typeof messageTimestamp.toNumber === 'function') {
      return new Date(messageTimestamp.toNumber() * 1000);
    }
    return new Date();
  }
}
