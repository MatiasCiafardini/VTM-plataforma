import { Module } from '@nestjs/common';
import { StudentsModule } from '../students/students.module';
import { StudentLinksController } from './student-links.controller';
import { StudentLinksService } from './student-links.service';

@Module({
  imports: [StudentsModule],
  controllers: [StudentLinksController],
  providers: [StudentLinksService],
  exports: [StudentLinksService],
})
export class StudentLinksModule {}
