import test from 'node:test';
import assert from 'node:assert/strict';
import { db, initializeDatabase } from '../src/db/connection.js';

test('constraint role hanya customer atau admin', () => {
  initializeDatabase();
  assert.throws(() => db.prepare(`INSERT INTO users(name,email,password_hash,role)
    VALUES('Test','invalid-role@test.local','hash','superadmin')`).run());
});
test('constraint qty keranjang membatasi 1 sampai 10', () => {
  initializeDatabase();
  const user = db.prepare('SELECT id FROM users LIMIT 1').get();
  const product = db.prepare('SELECT id FROM products LIMIT 1').get();
  if (!user || !product) return;
  assert.throws(() => db.prepare('INSERT INTO cart_items(user_id,product_id,color,qty) VALUES(?,?,?,11)')
    .run(user.id,product.id,'Test'));
});
