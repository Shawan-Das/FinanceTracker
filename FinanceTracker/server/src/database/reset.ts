import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// DatabaseDesign is at the project root, 4 levels up from src/database/
const schemaPath = path.join(__dirname, '../../../../DatabaseDesign/database.sql');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  await client.query('DROP SCHEMA IF EXISTS finance_tracker CASCADE;');
  console.log('✅ Schema dropped');

  const sql = fs.readFileSync(schemaPath, 'utf8');
  await client.query(sql);
  console.log('✅ Schema recreated');

  const res = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'finance_tracker' ORDER BY table_name`
  );
  console.log(`📋 Tables (${res.rows.length}): ${res.rows.map((r) => r.table_name).join(', ')}`);
  await client.end();
}

main().catch((e) => {
  console.error('❌ ERROR:', e.message);
  process.exit(1);
});
