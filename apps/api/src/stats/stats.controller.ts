import { Controller, Get } from '@nestjs/common';
import { StatsDto } from '@mini-crm/shared-types';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  getStats(@CurrentUser() user: AuthenticatedUser): Promise<StatsDto> {
    return this.statsService.getStats(user.unitId);
  }
}
