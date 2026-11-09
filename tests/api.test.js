import test from 'node:test';
import assert from 'node:assert/strict';
import { db, initializeDatabase } from '../src/db/connection.js';

test('SQLite schema menyediakan seluruh tabel inti', () => {
  initializeDatabase();
  const names = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name);
  for (const table of ['users','brands','categories','products','cart_items','wishlists','orders',
    'order_items','order_tracking','chat_logs','newsletter_subscribers']) assert.ok(names.includes(table),table);
});
test('foreign key SQLite aktif', () => {
  assert.equal(db.pragma('foreign_keys',{simple:true}),1);
});
