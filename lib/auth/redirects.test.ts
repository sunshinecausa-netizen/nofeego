import assert from 'node:assert/strict';
import test from 'node:test';
import { authCallbackUrl, safeAuthNext } from './redirects';

test('keeps internal return paths and rejects external or ambiguous targets', () => {
  assert.equal(safeAuthNext('/cases/case-id?tab=history'), '/cases/case-id?tab=history');
  assert.equal(safeAuthNext('https://evil.example/cases'), '/dashboard');
  assert.equal(safeAuthNext('//evil.example/cases'), '/dashboard');
  assert.equal(safeAuthNext('/\\evil.example/cases'), '/dashboard');
});

test('uses the active HTTPS origin for the auth callback', () => {
  assert.equal(
    authCallbackUrl('https://preview.example', '/agent/cases'),
    'https://preview.example/auth/callback?next=%2Fagent%2Fcases',
  );
  assert.equal(authCallbackUrl('https://preview.example'), 'https://preview.example/auth/callback');
  assert.throws(() => authCallbackUrl('http://preview.example', '/dashboard'), /AUTH_CALLBACK_ORIGIN_NOT_ALLOWED/);
});
