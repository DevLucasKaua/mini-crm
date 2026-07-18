import { Controller, Get } from '@nestjs/common';
import { MeDto } from '@mini-crm/shared-types';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { UsersService } from './users.service';

@Controller('me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<MeDto> {
    return this.usersService.getMe(user.userId);
  }
}
