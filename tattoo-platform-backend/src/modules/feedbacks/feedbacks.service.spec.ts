import { ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFeedbackDto, ListFeedbacksDto } from './feedback.dto';
import { FeedbacksService, feedbackWeekStart } from './feedbacks.service';

describe('Mentorship feedback', () => {
  it('uses Monday in the student timezone, including year boundaries', () => {
    const instant = new Date('2026-01-05T02:00:00Z');
    expect(feedbackWeekStart(instant, 'America/Guayaquil').toISOString()).toBe(
      '2025-12-29T00:00:00.000Z',
    );
    expect(feedbackWeekStart(instant, 'Europe/Madrid').toISOString()).toBe(
      '2026-01-05T00:00:00.000Z',
    );
    expect(feedbackWeekStart(instant, 'invalid').toISOString()).toBe(
      '2025-12-29T00:00:00.000Z',
    );
  });

  it('rejects blank feedback, invalid ratings and attempts to set original content', async () => {
    const errors = await validate(
      plainToInstance(CreateFeedbackDto, {
        rating: 6,
        feedback: '   ',
        achievement: '',
        submissionId: 'b1111111-1111-4111-8111-111111111111',
        originalRating: 5,
      }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    expect(errors.map((error) => error.property).sort()).toEqual([
      'feedback',
      'originalRating',
      'rating',
    ]);
    const valid = plainToInstance(CreateFeedbackDto, {
      rating: 1,
      feedback: '  Nos faltó tiempo  ',
      achievement: '',
      submissionId: 'b1111111-1111-4111-8111-111111111111',
    });
    expect(await validate(valid)).toHaveLength(0);
    expect(valid.feedback).toBe('Nos faltó tiempo');
  });

  it('rejects impossible dates and excessive pagination', async () => {
    const errors = await validate(
      plainToInstance(ListFeedbacksDto, { from: '2026-02-31', page: '100001' }),
    );
    expect(errors.map((error) => error.property).sort()).toEqual([
      'from',
      'page',
    ]);
  });

  it('does not overwrite a newer edit or create an audit record on conflict', async () => {
    const tx = {
      mentorshipFeedback: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'feedback-1', version: 2 }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      $transaction: (run: (client: typeof tx) => unknown) => run(tx),
    };
    const service = new FeedbacksService(prisma as unknown as PrismaService);
    await expect(
      service.update('feedback-1', 'admin-1', {
        rating: 4,
        feedback: 'Comentario',
        achievement: '',
        version: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
