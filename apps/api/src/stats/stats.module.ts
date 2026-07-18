import { Module } from '@nestjs/common';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [WhatsappModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
