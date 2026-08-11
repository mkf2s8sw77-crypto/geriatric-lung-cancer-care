import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import { getDb, closeDb } from '../client';

export function runMigrations(): void {
  const projectRoot = process.cwd();
  const migrationsFolder = path.resolve(projectRoot, 'db/migrations');
  const db = getDb();
  migrate(db, { migrationsFolder });
  // keep connection open, callers may closeDb later
}
