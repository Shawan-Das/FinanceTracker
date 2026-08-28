import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query(
    `SELECT count(*) as n FROM information_schema.tables WHERE table_schema = 'finance_tracker'`
  );
  console.log(`✅ Connected (${r.rows[0].n} tables)`);
  await c.end();
}

main().catch((e) => {
  console.log(`❌ ${e.message}`);
  process.exit(1);
});
