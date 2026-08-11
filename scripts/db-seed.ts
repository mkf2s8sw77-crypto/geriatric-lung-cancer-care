import { seedDatabase } from '../db/seed/seed';

async function main() {
  await seedDatabase();
  console.log('[db:seed] seed complete');
}

main().catch((e) => {
  console.error('[db:seed] failed', e);
  process.exit(1);
});
