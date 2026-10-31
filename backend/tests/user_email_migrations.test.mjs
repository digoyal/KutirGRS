// Real PostgreSQL semantics in an isolated PGlite database, no production data.
// Setup: npm install --prefix .deploy/pg-test --no-audit --no-fund @electric-sql/pglite
// Run from repo root: node --test backend/tests/user_email_migrations.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const { PGlite } = await import(pathToFileURL(resolve(
  process.env.PGLITE_MODULE ?? '.deploy/pg-test/node_modules/@electric-sql/pglite/dist/index.js'
)).href);
const sql025 = await readFile(new URL('../scripts/025_password_reset_tokens.sql', import.meta.url), 'utf8');
const sql027 = await readFile(new URL('../scripts/027_legacy_user_email_compatibility.sql', import.meta.url), 'utf8');

test('pending 025 preserves legacy NULL/blank emails and enforces new writes', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE users (id SERIAL PRIMARY KEY, email VARCHAR(254) UNIQUE);
      INSERT INTO users(email) VALUES (NULL), (''), ('   '), ('known@example.invalid');
      CREATE TABLE schema_migrations (filename TEXT PRIMARY KEY);`);
    const before = (await db.query('SELECT * FROM users ORDER BY id')).rows;
    await db.exec(`BEGIN; ${sql025}
      INSERT INTO schema_migrations VALUES ('025_password_reset_tokens.sql'); COMMIT;`);
    await db.exec(`BEGIN; ${sql027}
      INSERT INTO schema_migrations VALUES ('027_legacy_user_email_compatibility.sql'); COMMIT;`);
    assert.deepEqual((await db.query('SELECT * FROM users ORDER BY id')).rows, before);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM password_reset_tokens')).rows[0].n, 0);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM schema_migrations')).rows[0].n, 2);
    for (const email of [null, '', '   ']) {
      await assert.rejects(db.query('INSERT INTO users(email) VALUES ($1)', [email]), /users_email_required/);
    }
    await assert.rejects(db.query('UPDATE users SET email = NULL WHERE id = 4'), /users_email_required/);
    await db.query('UPDATE users SET email = $1 WHERE id = 1', ['fixed@example.invalid']);
    assert.equal((await db.query('SELECT email FROM users WHERE id = 1')).rows[0].email, 'fixed@example.invalid');
    // Reset tokens retain their uniqueness and user FK constraints.
    await db.exec(`INSERT INTO password_reset_tokens(user_id,token_hash,expires_at)
      VALUES (1, 'hash', now() + interval '30 minutes');`);
    await assert.rejects(db.exec(`INSERT INTO password_reset_tokens(user_id,token_hash,expires_at)
      VALUES (1, 'hash', now());`), /unique/);
    await assert.rejects(db.exec(`INSERT INTO password_reset_tokens(user_id,token_hash,expires_at)
      VALUES (999, 'another', now());`), /foreign key/);
    // Safe even if token storage was created by app startup before a failed deploy.
    await db.exec(sql025);
    await db.exec(sql027);
  } finally { await db.close(); }
});

test('027 aligns databases where original 025 was already applied', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE users (id SERIAL PRIMARY KEY, email VARCHAR(254) NOT NULL UNIQUE);
      INSERT INTO users(email) VALUES ('existing@example.invalid');`);
    await db.exec(sql027);
    const column = await db.query(`SELECT is_nullable FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'email'`);
    assert.equal(column.rows[0].is_nullable, 'YES');
    await assert.rejects(db.exec('INSERT INTO users(email) VALUES (NULL)'), /users_email_required/);
    assert.equal((await db.query('SELECT email FROM users')).rows[0].email, 'existing@example.invalid');
  } finally { await db.close(); }
});
