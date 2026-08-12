import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

let _db: BetterSQLite3Database<typeof schema> | null = null;
let _sqlite: Database.Database | null = null;

function resolveDbPath(): string {
  const raw = process.env.DATABASE_URL || 'file:./data/app.db';
  if (!raw.startsWith('file:')) {
    throw new Error(`仅支持 SQLite file: 协议，实际为 ${raw}`);
  }
  const filePath = raw.slice(5);
  if (!filePath) throw new Error('DATABASE_URL 文件路径为空');
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  // 严格限制：数据库文件必须在项目根目录的 data/ 子目录下
  const projectRoot = path.resolve(process.cwd());
  const dataDir = path.resolve(projectRoot, 'data');
  if (!resolved.startsWith(dataDir + path.sep) && resolved !== dataDir) {
    throw new Error(`数据库路径必须在项目 data/ 目录下: ${resolved}`);
  }
  return resolved;
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (_db) return _db;
  const dbPath = resolveDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  _sqlite = new Database(dbPath);
  _sqlite.pragma('journal_mode = WAL');
  _sqlite.pragma('foreign_keys = ON');
  _db = drizzle(_sqlite, { schema });
  return _db;
}

export function getRawSqlite(): Database.Database {
  if (!_sqlite) {
    getDb();
  }
  return _sqlite!;
}

export function closeDb(): void {
  if (_sqlite) {
    _sqlite.close();
    _sqlite = null;
    _db = null;
  }
}

export { schema };
