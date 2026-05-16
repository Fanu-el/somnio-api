import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable for seeding: ${key}`);
  return value;
};

const adapter = new PrismaPg({ connectionString: requireEnv('DATABASE_URL') });

// Cast through unknown so TypeScript resolves the full PrismaClient interface with model accessors
const prisma = new (PrismaClient as any)({ adapter }) as InstanceType<typeof PrismaClient>;

async function main() {
  const email = requireEnv('SUPER_ADMIN_EMAIL');
  const password = requireEnv('SUPER_ADMIN_PASSWORD');
  
  // Set default names if not present in env
  const firstName = process.env.SUPER_ADMIN_FIRST_NAME || 'Somnio';
  const lastName = process.env.SUPER_ADMIN_LAST_NAME || 'Admin';

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`Super admin already exists: ${email} — skipping.`);
    return;
  }

  const hashed = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      email,
      password: hashed,
      firstName,
      lastName,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      joinDetails: {
        joinedAt: new Date().toISOString(),
        joinDevice: 'seed',
      },
    },
  });

  console.log(`✓ Super admin seeded: ${admin.email} (id: ${admin.id})`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
