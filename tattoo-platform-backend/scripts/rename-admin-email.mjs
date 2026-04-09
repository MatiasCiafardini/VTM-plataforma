import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString =
  process.env.PRISMA_DIRECT_URL || process.env.DATABASE_URL || '';

if (!connectionString) {
  console.error('DATABASE_URL or PRISMA_DIRECT_URL is required.');
  process.exit(1);
}

const oldEmail = (process.env.OLD_ADMIN_EMAIL || '').trim().toLowerCase();
const newEmail = (process.env.NEW_ADMIN_EMAIL || '').trim().toLowerCase();

if (!oldEmail || !newEmail) {
  console.error('OLD_ADMIN_EMAIL and NEW_ADMIN_EMAIL are required.');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

try {
  const existingTarget = await prisma.user.findUnique({
    where: { email: newEmail },
  });

  if (existingTarget) {
    console.error(`Target email already exists: ${newEmail}`);
    process.exit(1);
  }

  const source = await prisma.user.findUnique({
    where: { email: oldEmail },
  });

  if (!source) {
    console.error(`Source admin not found: ${oldEmail}`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { email: oldEmail },
    data: { email: newEmail },
  });

  console.log(`Admin email updated from ${oldEmail} to ${newEmail}`);
} finally {
  await prisma.$disconnect();
}
