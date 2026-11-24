/** Tests of errors and static files. */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { expect, it } from 'vitest';
import { describeBodyError } from './routes/errors.js';
import { testApp } from './test-utils/app.js';

it('errors and static files: serves the client with the app CSP and immutable assets', async () => {
  const root = mkdtempSync(join(tmpdir(), 'vayu-client-'));
  mkdirSync(join(root, 'assets'));
  writeFileSync(join(root, 'index.html'), '<!doctype html><title>Vayu</title>');
  writeFileSync(join(root, 'assets', 'app-abc.js'), 'export {};');
  const { app } = testApp({}, { STATIC_DIR: root });
  const page = await request(app).get('/chat');
  expect(page.status).toBe(200);
  expect(page.headers['cache-control']).toBe('no-cache');
  expect((await request(app).get('/assets/app-abc.js')).headers['cache-control']).toContain(
    'immutable',
  );
  expect((await request(app).get('/assets/missing.js')).status).toBe(404);
  expect((await request(app).post('/chat')).status).toBe(404);
});

it('errors and static files: allows a configured origin and answers preflight', async () => {
  const { app } = testApp({}, { ALLOWED_ORIGIN: 'https://example.test' });
  const preflight = await request(app).options('/api/chat');
  expect(preflight.status).toBe(204);
  expect(preflight.headers['access-control-allow-origin']).toBe('https://example.test');
  expect(preflight.headers['access-control-allow-headers']).toBe('Content-Type');
});

it('errors and static files: classifies framework errors', () => {
  expect(describeBodyError(null)).toBeUndefined();
  expect(describeBodyError({ status: 404 })).toEqual({ status: 404, message: 'Not found.' });
  expect(describeBodyError({ type: 'other', status: 500 })).toBeUndefined();
});
