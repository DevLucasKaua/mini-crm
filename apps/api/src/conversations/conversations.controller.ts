import { Controller, Get, Param } from '@nestjs/common';
import { ConversationDto, MessageDto } from '@mini-crm/shared-types';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<ConversationDto[]> {
    return this.conversationsService.list(user.unitId);
  }

  @Get(':id/messages')
  listMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
  ): Promise<MessageDto[]> {
    return this.conversationsService.listMessages(user.unitId, conversationId);
  }
}
