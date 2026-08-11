import fs from 'node:fs';
import path from 'node:path';
import { seedDatabase } from '../db/seed/seed';
import { getDb, closeDb } from '../db/client';

function assertSafeDataDir(): string {
  const projectRoot = process.cwd();
  const dataDir = path.resolve(projectRoot, 'data');
  const projectReal = fs.realpathSync(projectRoot);
  const dataReal = fs.existsSync(dataDir) ? fs.realpathSync(dataDir) : dataDir;
  if (!dataReal.startsWith(projectReal + path.sep) && dataReal !== projectReal) {
    throw new Error(`data 目录不在项目内: ${dataReal}`);
  }
  return dataDir;
}

async function main() {
  const dataDir = assertSafeDataDir();
  const dbFile = path.join(dataDir, 'app.db');
  const journalFile = dbFile + '-journal';
  const walFile = dbFile + '-wal';
  const shmFile = dbFile + '-shm';
  const bakFile = dbFile + '.bak';
  closeDb();
  for (const f of [dbFile, journalFile, walFile, shmFile, bakFile]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  console.log('[db:reset] cleared', dbFile);
  // re-open and apply migrations + seed
  getDb();
  // migrations are applied by importing seed's migration step
  const { runMigrations } = await import('../db/seed/migrate');
  runMigrations();
  await seedDatabase();
  console.log('[db:reset] reset complete');
}

main().catch((e) => {
  console.error('[db:reset] failed', e);
  process.exit(1);
});
