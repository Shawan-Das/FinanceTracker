import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// DatabaseDesign is at the project root, 4 levels up from src/database/
const schemaPath = path.join(__dirname, '../../../../DatabaseDesign/database.sql');

async function main() {
  // Step 1: Create database if it doesn't exist
  const url = new URL(process.env.DATABASE_URL!);
  const admin = new Client({
    host: url.hostname,
    port: parseInt(url.port),
    user: url.username,
    password: url.password,
    database: 'postgres',
  });

  await admin.connect();
  try {
    await admin.query('CREATE DATABASE finance_tracker');
    console.log('✅ Database created');
  } catch (e: any) {
    if (e.code === '42P04') {
      console.log('ℹ️  Database already exists');
    } else {
      throw e;
    }
  }
  await admin.end();

  // Step 2: Check if schema already exists
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const check = await client.query(
    `SELECT count(*) as n FROM information_schema.tables WHERE table_schema = 'finance_tracker'`
  );

  if (parseInt(check.rows[0].n) > 0) {
    console.log(`ℹ️  Schema already exists (${check.rows[0].n} tables). Skipping.`);
    await client.end();
    return;
  }

  // Step 3: Apply schema
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await client.query(sql);
  console.log('✅ Schema applied');

  // Step 4: Verify
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
