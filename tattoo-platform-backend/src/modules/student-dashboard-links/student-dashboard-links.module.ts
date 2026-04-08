import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StudentDashboardLinksController } from './student-dashboard-links.controller';
import { StudentDashboardLinksService } from './student-dashboard-links.service';

@Module({
  imports: [PrismaModule],
  controllers: [StudentDashboardLinksController],
  providers: [StudentDashboardLinksService],
  exports: [StudentDashboardLinksService],
})
export class StudentDashboardLinksModule {}
