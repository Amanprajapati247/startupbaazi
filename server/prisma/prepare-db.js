const path = require('path');
const { execSync } = require('child_process');

// Load environment variables if .env exists
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
} catch (e) {}

let dbUrl = (process.env.DATABASE_URL || '').trim();

// If DATABASE_URL is placeholder or empty, provide a fallback so prisma generate doesn't fail
const isPlaceholder = !dbUrl || dbUrl === 'value' || dbUrl === 'undefined';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://') || process.env.NODE_ENV === 'production';
const schemaFile = isPostgres ? 'schema.postgresql.prisma' : 'schema.prisma';

console.log(`\n======================================================`);
console.log(`🚀 [StartupBaazi DB Engine] Preparing Database...`);
console.log(`   Environment:   ${process.env.NODE_ENV || 'development'}`);
console.log(`   Database Type: ${isPostgres ? 'PostgreSQL (Production)' : 'SQLite (Local)'}`);
console.log(`   Using Schema:  prisma/${schemaFile}`);
console.log(`======================================================\n`);

const cwd = path.resolve(__dirname, '..');

// Ensure DATABASE_URL is temporarily defined for generate if empty
if (isPlaceholder) {
  process.env.DATABASE_URL = isPostgres
    ? 'postgresql://postgres:postgres@localhost:5432/startupbaazi?schema=public'
    : 'file:./dev.db';
}

try {
  // 1. Generate Prisma Client (Works even with placeholder URL)
  console.log(`📦 Generating Prisma Client using prisma/${schemaFile}...`);
  execSync(`npx prisma generate --schema=prisma/${schemaFile}`, {
    stdio: 'inherit',
    cwd,
    env: process.env,
  });

  // 2. Push Database Schema ONLY if a real, valid database URL is provided
  if (!isPlaceholder) {
    console.log(`\n🔄 Synchronizing schema with live database...`);
    execSync(`npx prisma db push --schema=prisma/${schemaFile} --accept-data-loss`, {
      stdio: 'inherit',
      cwd,
      env: process.env,
    });
    console.log('\n✅ [StartupBaazi DB Engine] Database schema synchronized successfully!\n');
  } else {
    console.log('\n⚠️ [StartupBaazi DB Engine] Real DATABASE_URL not detected during build step.');
    console.log('   Prisma Client generated successfully. Schema push will occur when valid DATABASE_URL is set.\n');
  }
} catch (err) {
  console.error('\n❌ [StartupBaazi DB Engine] Error during database preparation:', err.message);
  process.exit(1);
}
