import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';

// Run only against an explicitly supplied, disposable local database after migrations.
const databaseUrl = process.env.FEEDBACK_TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase('Feedback HTTP persistence and permissions', () => {
  let app: INestApplication;
  let db: PrismaService;
  let server: Server;
  let studentToken: string;
  let adminToken: string;
  let mentorToken: string;
  let studentId: string;
  let adminId: string;
  const userIds: string[] = [];
  const marker = `feedback-qa-${randomUUID()}`;

  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (url.hostname !== '127.0.0.1' || url.pathname !== '/vmt_feedback_test') {
      throw new Error('Use a disposable local vmt_feedback_test database.');
    }
    process.env.DATABASE_URL = databaseUrl;
    process.env.PRISMA_DIRECT_URL = databaseUrl;
    process.env.JWT_SECRET = 'feedback-integration-tests-only';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    server = app.getHttpServer() as Server;
    db = app.get<PrismaService>(PrismaService);
    const jwt = app.get(JwtService);
    for (const role of ['STUDENT', 'ADMIN', 'MENTOR'] as const) {
      const user = await db.user.create({
        data: {
          email: `${marker}-${role}@example.com`,
          passwordHash: 'unused',
          firstName: 'Prueba',
          lastName: marker,
          role,
          ...(role === 'STUDENT'
            ? { studentProfile: { create: { timezone: 'America/Guayaquil' } } }
            : {}),
        },
        include: { studentProfile: true },
      });
      userIds.push(user.id);
      const token = await jwt.signAsync({
        sub: user.id,
        email: user.email,
        role,
      });
      if (role === 'STUDENT') {
        studentToken = token;
        studentId = user.studentProfile!.id;
      }
      if (role === 'ADMIN') {
        adminToken = token;
        adminId = user.id;
      }
      if (role === 'MENTOR') mentorToken = token;
    }
  }, 30000);

  afterAll(async () => {
    if (db) {
      await db.auditLog.deleteMany({ where: { userId: { in: userIds } } });
      if (studentId)
        await db.mentorshipFeedback.deleteMany({ where: { studentId } });
      await db.studentProfile.deleteMany({
        where: { userId: { in: userIds } },
      });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app?.close();
  });

  it('restricts access and prevents changing identity or original fields via payloads', async () => {
    await request(server).get('/api/feedbacks').expect(401);
    for (const token of [studentToken, mentorToken]) {
      await request(server)
        .get('/api/feedbacks?originals=true')
        .auth(token, { type: 'bearer' })
        .expect(403);
      await request(server)
        .get('/api/feedbacks/missing')
        .auth(token, { type: 'bearer' })
        .expect(403);
      await request(server)
        .patch('/api/feedbacks/missing')
        .auth(token, { type: 'bearer' })
        .send({})
        .expect(403);
    }
    await request(server)
      .post('/api/feedbacks')
      .auth(adminToken, { type: 'bearer' })
      .send({})
      .expect(403);
    await request(server)
      .post('/api/feedbacks')
      .auth(studentToken, { type: 'bearer' })
      .send({
        submissionId: randomUUID(),
        rating: 5,
        feedback: 'Comentario',
        achievement: '',
        studentId: 'another-student',
        originalRating: 1,
      })
      .expect(400);
  });

  it('deduplicates concurrent retries, preserves originals through edits, and records the editor', async () => {
    const body = {
      submissionId: randomUUID(),
      rating: 2,
      feedback: 'Quiero más ejemplos.',
      achievement: 'Conseguí mi primer cliente.',
    };
    const receipts = await Promise.all(
      Array.from({ length: 4 }, () =>
        request(server)
          .post('/api/feedbacks')
          .auth(studentToken, { type: 'bearer' })
          .send(body)
          .expect(201),
      ),
    );
    const ids = receipts.map(
      (response) => (response.body as { id: string }).id,
    );
    expect(new Set(ids).size).toBe(1);
    const id = ids[0];
    expect(await db.mentorshipFeedback.count({ where: { studentId } })).toBe(1);
    await request(server)
      .patch(`/api/feedbacks/${id}`)
      .auth(adminToken, { type: 'bearer' })
      .send({
        rating: 4,
        feedback: 'Quiero más ejemplos prácticos.',
        achievement: 'Primer cliente confirmado.',
        version: 1,
      })
      .expect(200);
    await request(server)
      .patch(`/api/feedbacks/${id}`)
      .auth(adminToken, { type: 'bearer' })
      .send({
        rating: 1,
        feedback: 'Versión antigua',
        achievement: '',
        version: 1,
      })
      .expect(409);
    const final = await request(server)
      .patch(`/api/feedbacks/${id}`)
      .auth(adminToken, { type: 'bearer' })
      .send({
        rating: 5,
        feedback: 'Comentario final',
        achievement: '',
        version: 2,
      })
      .expect(200);
    expect(final.body).toMatchObject({
      rating: 5,
      feedback: 'Comentario final',
      achievement: '',
      version: 3,
    });
    expect(final.body).not.toHaveProperty('originalRating');
    const original = await request(server)
      .get('/api/feedbacks')
      .query({ studentId, originals: 'true', rating: 2 })
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    expect(original.body).toMatchObject({
      total: 1,
      items: [
        {
          id,
          rating: 2,
          feedback: body.feedback,
          achievement: body.achievement,
        },
      ],
    });
    const audit = await db.auditLog.findMany({
      where: { entityId: id },
      orderBy: { createdAt: 'asc' },
    });
    expect(audit).toHaveLength(2);
    expect(audit[0]).toMatchObject({
      userId: adminId,
      metadata: { before: { rating: 2 }, after: { rating: 4 } },
    });
    const result = await request(server)
      .get('/api/feedbacks')
      .query({ studentId, q: `Prueba ${marker}`, rating: 5 })
      .auth(adminToken, { type: 'bearer' })
      .expect(200);
    expect(result.body).toMatchObject({
      total: 1,
      items: [{ id, feedback: 'Comentario final' }],
    });
    await request(server)
      .get('/api/feedbacks')
      .query({ from: '2026-10-01', to: '2026-09-01' })
      .auth(adminToken, { type: 'bearer' })
      .expect(400);
    await request(server)
      .get('/api/feedbacks')
      .query({ from: '2026-02-31' })
      .auth(adminToken, { type: 'bearer' })
      .expect(400);
    // A new submission in the same week is allowed; optional achievement may be empty.
    await request(server)
      .post('/api/feedbacks')
      .auth(studentToken, { type: 'bearer' })
      .send({ ...body, submissionId: randomUUID(), achievement: '' })
      .expect(201);
    expect(await db.mentorshipFeedback.count({ where: { studentId } })).toBe(2);
  });
});
