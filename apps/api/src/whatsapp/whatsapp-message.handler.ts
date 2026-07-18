import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WAMessage } from '@whiskeysockets/baileys';
import { PrismaService } from '../prisma/prisma.service';

const USER_JID_SUFFIX = '@s.whatsapp.net';
const LID_JID_SUFFIX = '@lid';

// Regra do briefing: disparo exato e case-sensitive ("oi" não responde),
// resposta byte-exata. Documentado no README.
const AUTO_REPLY_TRIGGER = 'Oi';
const AUTO_REPLY_TEXT = 'Oi! Aqui é o Atendente da E3';

export interface MessagesUpsertPayload {
  messages: WAMessage[];
  type: string;
}

export type SendText = (
  jid: string,
  text: string,
) => Promise<WAMessage | undefined>;

interface PersistedInbound {
  conversationId: string;
  content: string;
  jid: string;
}

@Injectable()
export class WhatsappMessageHandler {
  private readonly logger = new Logger(WhatsappMessageHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleUpsert(
    unitId: string,
    upsert: MessagesUpsertPayload,
    sendText: SendText,
  ): Promise<void> {
    if (upsert.type !== 'notify') {
      return;
    }
    for (const message of upsert.messages) {
      try {
        const persisted = await this.persistInbound(unitId, message);
        if (persisted && persisted.content.trim() === AUTO_REPLY_TRIGGER) {
          await this.sendAutoReply(unitId, persisted, sendText);
        }
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
  ): Promise<PersistedInbound | null> {
    const jid = message.key.remoteJid;
    if (!jid || message.key.fromMe) {
      return null;
    }
    // exclui grupos (@g.us), status@broadcast e newsletters; DMs chegam como
    // @s.whatsapp.net ou, em contas com privacidade de número, como @lid
    if (!jid.endsWith(USER_JID_SUFFIX) && !jid.endsWith(LID_JID_SUFFIX)) {
      return null;
    }
    const content = this.extractText(message);
    if (!content) {
      return null;
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
      // (Baileys pode reentregar a mesma mensagem); ignora sem re-responder.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return null;
      }
      throw error;
    }

    this.logger.log(
      `Inbound message persisted for unit ${unitId} from ${contactPhone}`,
    );
    return { conversationId: conversation.id, content, jid };
  }

  private async sendAutoReply(
    unitId: string,
    inbound: PersistedInbound,
    sendText: SendText,
  ): Promise<void> {
    const sent = await sendText(inbound.jid, AUTO_REPLY_TEXT);
    const timestamp = sent ? this.toDate(sent.messageTimestamp) : new Date();

    await this.prisma.message.create({
      data: {
        conversationId: inbound.conversationId,
        unitId,
        direction: 'OUTBOUND',
        content: AUTO_REPLY_TEXT,
        waMessageId: sent?.key?.id ?? null,
        timestamp,
      },
    });
    await this.prisma.conversation.update({
      where: { id: inbound.conversationId },
      data: { lastMessageAt: timestamp },
    });

    this.logger.log(
      `Auto-reply sent for unit ${unitId} (conversation ${inbound.conversationId})`,
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
