import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import fs from 'node:fs';
import { getDb, closeDb } from '../db/client';

function main() {
  const projectRoot = process.cwd();
  const dataDir = path.resolve(projectRoot, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const db = getDb();
  const migrationsFolder = path.resolve(projectRoot, 'db/migrations');
  migrate(db, { migrationsFolder });
  closeDb();
  console.log('[db:migrate] migrations applied to', path.join(dataDir, 'app.db'));
}

main();
