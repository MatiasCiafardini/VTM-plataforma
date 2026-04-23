import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MetricPeriodAutomationService } from '../modules/metrics/metric-periods/metric-period-automation.service';
import { PrismaService } from '../prisma/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const prisma = app.get(PrismaService);
    const automationService = app.get(MetricPeriodAutomationService);
    const students = await prisma.studentProfile.findMany({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    for (const student of students) {
      await automationService.syncStudentProgress(student.id);
    }

    console.log(
      `Challenge backfill completed for ${students.length} students.`,
    );
  } finally {
    await app.close();
  }
}

void main();
