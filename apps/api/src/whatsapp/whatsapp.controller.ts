import { Controller, Get, Post } from '@nestjs/common';
import { WhatsappStatusDto } from '@mini-crm/shared-types';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('connect')
  connect(@CurrentUser() user: AuthenticatedUser): Promise<WhatsappStatusDto> {
    return this.whatsappService.connect(user.unitId);
  }

  @Post('disconnect')
  disconnect(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WhatsappStatusDto> {
    return this.whatsappService.disconnect(user.unitId);
  }

  @Get('status')
  getStatus(@CurrentUser() user: AuthenticatedUser): WhatsappStatusDto {
    return this.whatsappService.getStatus(user.unitId);
  }
}
