import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WhatsappConnectionStatus,
  WhatsappStatusDto,
} from '@mini-crm/shared-types';
import { Boom } from '@hapi/boom';
import makeWASocket, {
  ConnectionState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  WAMessage,
  WASocket,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { toDataURL } from 'qrcode';
import * as qrcodeTerminal from 'qrcode-terminal';
import { WhatsappMessageHandler } from './whatsapp-message.handler';

const MAX_RECONNECT_DELAY_MS = 30_000;

interface UnitSession {
  socket: WASocket | null;
  status: WhatsappConnectionStatus;
  qrDataUrl: string | null;
  reconnectAttempts: number;
  reconnectTimer: NodeJS.Timeout | null;
}

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly sessions = new Map<string, UnitSession>();
  private readonly baileysLogger = pino({ level: 'silent' });
  private shuttingDown = false;

  constructor(
    private readonly config: ConfigService,
    private readonly messageHandler: WhatsappMessageHandler,
  ) {}

  async onModuleInit(): Promise<void> {
    const root = this.sessionRootDir();
    if (!fs.existsSync(root)) {
      return;
    }
    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const entry of entries) {
      const hasCreds =
        entry.isDirectory() &&
        fs.existsSync(path.join(root, entry.name, 'creds.json'));
      if (!hasCreds) {
        continue;
      }
      this.logger.log(`Restoring WhatsApp session for unit ${entry.name}`);
      await this.startSocket(entry.name).catch((error: Error) => {
        this.logger.error(
          `Failed to restore session for unit ${entry.name}: ${error.message}`,
        );
      });
    }
  }

  onModuleDestroy(): void {
    this.shuttingDown = true;
    for (const session of this.sessions.values()) {
      if (session.reconnectTimer) {
        clearTimeout(session.reconnectTimer);
        session.reconnectTimer = null;
      }
      session.socket?.end(undefined);
    }
  }

  async connect(unitId: string): Promise<WhatsappStatusDto> {
    const session = this.sessions.get(unitId);
    if (session && session.status !== 'disconnected') {
      return this.getStatus(unitId);
    }
    await this.startSocket(unitId);
    return this.getStatus(unitId);
  }

  getStatus(unitId: string): WhatsappStatusDto {
    const session = this.sessions.get(unitId);
    return {
      status: session?.status ?? 'disconnected',
      qrDataUrl: session?.status === 'qr' ? session.qrDataUrl : null,
    };
  }

  // Logout limpo da sessão da unidade: derruba o socket, invalida o pareamento
  // no servidor do WhatsApp (quando autenticado) e apaga as credenciais locais.
  async disconnect(unitId: string): Promise<WhatsappStatusDto> {
    const session = this.sessions.get(unitId);
    if (!session) {
      return this.getStatus(unitId);
    }
    if (session.reconnectTimer) {
      clearTimeout(session.reconnectTimer);
      session.reconnectTimer = null;
    }
    const socket = session.socket;
    session.socket = null;
    session.status = 'disconnected';
    session.qrDataUrl = null;
    session.reconnectAttempts = 0;

    if (socket) {
      try {
        await socket.logout();
      } catch {
        // sessão não autenticada (ex.: parada no QR) — só encerra o socket
        socket.end(undefined);
      }
    }
    fs.rmSync(path.join(this.sessionRootDir(), unitId), {
      recursive: true,
      force: true,
    });
    this.logger.log(`WhatsApp session disconnected for unit ${unitId}`);
    return this.getStatus(unitId);
  }

  // Envia texto pela sessão da unidade; undefined quando não há sessão conectada.
  async sendText(
    unitId: string,
    jid: string,
    text: string,
  ): Promise<WAMessage | undefined> {
    const session = this.sessions.get(unitId);
    if (!session?.socket || session.status !== 'connected') {
      return undefined;
    }
    return (await session.socket.sendMessage(jid, { text })) ?? undefined;
  }

  private sessionRootDir(): string {
    const dir = this.config.get<string>('WA_SESSION_DIR') || './sessions';
    return path.resolve(process.cwd(), dir);
  }

  private async startSocket(unitId: string): Promise<void> {
    const session: UnitSession = this.sessions.get(unitId) ?? {
      socket: null,
      status: 'disconnected',
      qrDataUrl: null,
      reconnectAttempts: 0,
      reconnectTimer: null,
    };
    this.sessions.set(unitId, session);

    if (session.reconnectTimer) {
      clearTimeout(session.reconnectTimer);
      session.reconnectTimer = null;
    }
    session.status = 'connecting';
    session.qrDataUrl = null;

    const sessionDir = path.join(this.sessionRootDir(), unitId);
    fs.mkdirSync(sessionDir, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    // A versão de WA Web embutida no Baileys 6.7.x é rejeitada pelos servidores
    // com status 405; é preciso anunciar a versão corrente.
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      version,
      auth: state,
      logger: this.baileysLogger,
    });
    session.socket = socket;

    socket.ev.on('creds.update', saveCreds);
    const sendText = async (jid: string, text: string) =>
      (await socket.sendMessage(jid, { text })) ?? undefined;
    socket.ev.on('messages.upsert', (upsert) => {
      void this.messageHandler
        .handleUpsert(unitId, upsert, sendText)
        .catch((error: Error) => {
          this.logger.error(
            `messages.upsert handler failed for unit ${unitId}: ${error.message}`,
          );
        });
    });
    socket.ev.on('connection.update', (update) => {
      void this.handleConnectionUpdate(unitId, update).catch((error: Error) => {
        this.logger.error(
          `connection.update handler failed for unit ${unitId}: ${error.message}`,
        );
      });
    });
  }

  private async handleConnectionUpdate(
    unitId: string,
    update: Partial<ConnectionState>,
  ): Promise<void> {
    const session = this.sessions.get(unitId);
    if (!session) {
      return;
    }

    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      session.status = 'qr';
      session.qrDataUrl = await toDataURL(qr);
      this.logger.log(`QR code ready for unit ${unitId} — scan with WhatsApp:`);
      qrcodeTerminal.generate(qr, { small: true });
    }

    if (connection === 'open') {
      session.status = 'connected';
      session.qrDataUrl = null;
      session.reconnectAttempts = 0;
      this.logger.log(`WhatsApp connected for unit ${unitId}`);
    }

    if (connection === 'close') {
      if (this.shuttingDown) {
        return;
      }
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output
        ?.statusCode;

      if (statusCode === DisconnectReason.restartRequired) {
        // Baileys always closes with restartRequired right after pairing;
        // the socket must be recreated immediately, not treated as a failure.
        this.logger.log(`Restart required for unit ${unitId}, reconnecting`);
        await this.startSocket(unitId);
        return;
      }

      if (statusCode === DisconnectReason.loggedOut) {
        this.logger.warn(`Unit ${unitId} logged out, clearing session files`);
        session.socket = null;
        session.status = 'disconnected';
        session.qrDataUrl = null;
        session.reconnectAttempts = 0;
        fs.rmSync(path.join(this.sessionRootDir(), unitId), {
          recursive: true,
          force: true,
        });
        return;
      }

      const delay = Math.min(
        MAX_RECONNECT_DELAY_MS,
        1000 * 2 ** session.reconnectAttempts,
      );
      session.reconnectAttempts += 1;
      session.status = 'connecting';
      session.qrDataUrl = null;
      this.logger.warn(
        `Connection closed for unit ${unitId} (status ${statusCode ?? 'unknown'}), retrying in ${delay}ms`,
      );
      session.reconnectTimer = setTimeout(() => {
        void this.startSocket(unitId).catch((error: Error) => {
          this.logger.error(
            `Reconnect failed for unit ${unitId}: ${error.message}`,
          );
        });
      }, delay);
    }
  }
}
