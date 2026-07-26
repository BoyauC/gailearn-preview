'use strict';

const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 64;
const KEY_LENGTH = 64;

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;
}

async function hashPassword(password) {
  if (!isValidPassword(password)) throw new TypeError('Password must contain 8–64 characters.');
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH);
  return { algorithm: 'scrypt-v1', salt: salt.toString('base64'), hash: key.toString('base64') };
}

async function verifyPassword(password, secret) {
  if (!isValidPassword(password) || !secret || secret.algorithm !== 'scrypt-v1') return false;
  try {
    const salt = Buffer.from(secret.salt, 'base64');
    const expected = Buffer.from(secret.hash, 'base64');
    if (salt.length !== 16 || expected.length !== KEY_LENGTH) return false;
    const actual = await scrypt(password, salt, expected.length);
    return crypto.timingSafeEqual(actual, expected);
  } catch (_) {
    return false;
  }
}

module.exports = { PASSWORD_MIN, PASSWORD_MAX, isValidPassword, hashPassword, verifyPassword };
