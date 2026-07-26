'use strict';

const REGION = 'asia-east1';
const DAY_MS = 24 * 60 * 60 * 1000;

const CALLABLE_OPTIONS = Object.freeze({
  region: REGION,
  memory: '256MiB',
  timeoutSeconds: 30,
  minInstances: 0,
  maxInstances: 3,
  enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true'
});

module.exports = {
  REGION,
  DAY_MS,
  SESSION_ACTIVE_MS: 8 * 60 * 60 * 1000,
  RETENTION_MS: 90 * DAY_MS,
  SUBMISSION_GRACE_MS: 10 * 60 * 1000,
  LOGIN_LOCK_MS: 15 * 60 * 1000,
  LOGIN_MAX_FAILURES: 5,
  CALLABLE_OPTIONS
};
