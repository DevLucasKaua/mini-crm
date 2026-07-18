import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ConversationDto,
  MessageDto,
  SendMessageInput,
} from '@mini-crm/shared-types';
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

  @Post(':id/messages')
  sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
    @Body() body: SendMessageInput,
  ): Promise<MessageDto> {
    return this.conversationsService.sendMessage(
      user.unitId,
      conversationId,
      body?.content ?? '',
    );
  }
}
