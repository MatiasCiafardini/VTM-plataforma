import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { RecalculateAttentionScoreDto } from './dto/recalculate-attention-score.dto';
import { AttentionScoreService } from './attention-score.service';

@ApiTags('attention-score')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attention-scores')
export class AttentionScoreController {
  constructor(private readonly attentionScoreService: AttentionScoreService) {}

  @Post('recalculate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Recalculate attention scores' })
  recalculate(
    @Body() dto: RecalculateAttentionScoreDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attentionScoreService.recalculate(dto, user);
  }

  @Get('admin')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List attention scores for admin' })
  getAdminScores(@CurrentUser() user: AuthenticatedUser) {
    return this.attentionScoreService.getScoresForAdmin(user);
  }

  @Get('mentor')
  @Roles(UserRole.MENTOR)
  @ApiOperation({
    summary: 'List attention scores for mentor assigned students',
  })
  getMentorScores(@CurrentUser() user: AuthenticatedUser) {
    return this.attentionScoreService.getScoresForMentor(user);
  }
}
