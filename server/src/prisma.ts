import { PrismaClient } from '@prisma/client';

const rawUrl = (process.env.DATABASE_URL || '').trim();
if (!rawUrl || rawUrl === 'value' || rawUrl === 'undefined') {
  console.error('\n🚨 [FATAL CONFIG ERROR] DATABASE_URL is missing or empty in environment settings!');
  console.error('👉 Please configure DATABASE_URL in your Render Web Service Environment settings with your PostgreSQL URL.\n');
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/startupbaazi?schema=public';
}

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export default prisma;
