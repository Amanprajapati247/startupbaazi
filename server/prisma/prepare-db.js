const path = require('path');
const { execSync } = require('child_process');

const dbUrl = process.env.DATABASE_URL || '';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');
const schemaFile = isPostgres ? 'schema.postgresql.prisma' : 'schema.prisma';

console.log(`\n======================================================`);
console.log(`🚀 [StartupBaazi DB Engine] Auto-detecting Database...`);
console.log(`   Database Type: ${isPostgres ? 'PostgreSQL (Production)' : 'SQLite (Local)'}`);
console.log(`   Using Schema:  prisma/${schemaFile}`);
console.log(`======================================================\n`);

try {
  const cwd = path.resolve(__dirname, '..');
  execSync(`npx prisma generate --schema=prisma/${schemaFile}`, { stdio: 'inherit', cwd });
  execSync(`npx prisma db push --schema=prisma/${schemaFile} --accept-data-loss`, { stdio: 'inherit', cwd });
  console.log('\n✅ [StartupBaazi DB Engine] Database schema synchronized successfully!\n');
} catch (err) {
  console.error('\n❌ [StartupBaazi DB Engine] Failed to synchronize schema:', err.message);
  process.exit(1);
}
