import { Module } from '@nestjs/common';
import { WhatsappMessageHandler } from './whatsapp-message.handler';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

@Module({
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappMessageHandler],
  exports: [WhatsappService],
})
export class WhatsappModule {}
