import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString =
  process.env.PRISMA_DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('PRISMA_DIRECT_URL or DATABASE_URL is required');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const [beforeChallenges, beforeAssignments, beforeLinkedSteps] =
    await Promise.all([
      prisma.challenge.count(),
      prisma.studentChallenge.count(),
      prisma.onboardingStep.count({
        where: {
          challengeId: {
            not: null,
          },
        },
      }),
    ]);

  await prisma.$transaction(async (tx) => {
    await tx.onboardingStep.updateMany({
      where: {
        challengeId: {
          not: null,
        },
      },
      data: {
        challengeId: null,
      },
    });

    await tx.challenge.updateMany({
      where: {
        prerequisiteChallengeId: {
          not: null,
        },
      },
      data: {
        prerequisiteChallengeId: null,
      },
    });

    await tx.studentChallenge.deleteMany();
    await tx.challenge.deleteMany();
  });

  const [afterChallenges, afterAssignments, afterLinkedSteps] =
    await Promise.all([
      prisma.challenge.count(),
      prisma.studentChallenge.count(),
      prisma.onboardingStep.count({
        where: {
          challengeId: {
            not: null,
          },
        },
      }),
    ]);

  console.log(
    JSON.stringify(
      {
        before: {
          challenges: beforeChallenges,
          assignments: beforeAssignments,
          linkedOnboardingSteps: beforeLinkedSteps,
        },
        after: {
          challenges: afterChallenges,
          assignments: afterAssignments,
          linkedOnboardingSteps: afterLinkedSteps,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
