'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { hashPassword, isValidPassword, verifyPassword } = require('../src/security');

test('teacher password accepts only 8–64 characters', () => {
  assert.equal(isValidPassword('1234567'), false);
  assert.equal(isValidPassword('12345678'), true);
  assert.equal(isValidPassword('a'.repeat(64)), true);
  assert.equal(isValidPassword('a'.repeat(65)), false);
});

test('teacher password is salted, hashed, and verified without plaintext', async () => {
  const first = await hashPassword('correct horse');
  const second = await hashPassword('correct horse');
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
  assert.equal(JSON.stringify(first).includes('correct horse'), false);
  assert.equal(await verifyPassword('correct horse', first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
});
