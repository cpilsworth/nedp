/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import {
  createExecutionContext, waitOnExecutionContext, fetchMock,
} from 'cloudflare:test';
import {
  describe, it, expect, beforeAll, afterEach,
} from 'vitest';
import worker from '../src/zip-worker';

const BASE = 'https://main.example';
const ENV = { DA_SC_BASE_URL: BASE };

const MANIFEST_BODY = JSON.stringify({
  metadata: { schemaName: 'manifest', title: 'manifest' },
  data: {
    screens: [
      { id: 'home', path: '/digi2/home' },
      { id: 'accounts', path: '/digi2/accounts' },
    ],
  },
});

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});

afterEach(() => fetchMock.assertNoPendingInterceptors());

describe('da-sc-zip worker', () => {
  describe('since parameter', () => {
    it('returns 400 for an invalid since value', async () => {
      const request = new Request<unknown, IncomingRequestCfProperties>(
        'http://example.com/preview/cpilsworth/nedp/digi2/manifest?since=not-a-date',
      );
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(400);
    });

    it('forwards since as If-Modified-Since to each screen fetch', async () => {
      const sinceISO = '2026-04-28T00:00:00.000Z';
      const sinceHTTP = new Date(sinceISO).toUTCString();

      fetchMock.get(BASE)
        .intercept({ path: '/preview/cpilsworth/nedp/digi2/manifest' })
        .reply(200, MANIFEST_BODY, {
          headers: {
            'Content-Type': 'application/json',
            'Last-Modified': 'Mon, 27 Apr 2026 10:00:00 GMT',
          },
        });
      // Both screen intercepts REQUIRE the forwarded IMS header — if the worker
      // doesn't forward `since`, these won't match and the fetch will throw.
      fetchMock.get(BASE)
        .intercept({
          path: '/preview/cpilsworth/nedp/digi2/home',
          headers: { 'If-Modified-Since': sinceHTTP },
        })
        .reply(304, '', {
          headers: { 'Last-Modified': 'Mon, 27 Apr 2026 10:00:00 GMT' },
        });
      fetchMock.get(BASE)
        .intercept({
          path: '/preview/cpilsworth/nedp/digi2/accounts',
          headers: { 'If-Modified-Since': sinceHTTP },
        })
        .reply(200, JSON.stringify({ id: 'accounts' }), {
          headers: {
            'Content-Type': 'application/json',
            'Last-Modified': 'Wed, 29 Apr 2026 12:00:00 GMT',
          },
        });

      const request = new Request<unknown, IncomingRequestCfProperties>(
        `http://example.com/preview/cpilsworth/nedp/digi2/manifest?since=${encodeURIComponent(sinceISO)}`,
      );
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, ENV, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/zip');
      expect(response.headers.get('Content-Disposition')).toContain('manifest.zip');
      // Latest across manifest + screens (304 retains its origin Last-Modified)
      expect(response.headers.get('Last-Modified')).toBe('Wed, 29 Apr 2026 12:00:00 GMT');
    });

    it('falls back to since as the screen Last-Modified when origin 304 omits it', async () => {
      const sinceISO = '2026-04-30T00:00:00.000Z';
      const sinceHTTP = new Date(sinceISO).toUTCString();

      fetchMock.get(BASE)
        .intercept({ path: '/preview/cpilsworth/nedp/digi2/manifest' })
        .reply(200, MANIFEST_BODY, {
          headers: {
            'Content-Type': 'application/json',
            'Last-Modified': 'Mon, 27 Apr 2026 10:00:00 GMT',
          },
        });
      // Both screens 304 WITHOUT a Last-Modified header (matching origin behavior).
      fetchMock.get(BASE)
        .intercept({
          path: '/preview/cpilsworth/nedp/digi2/home',
          headers: { 'If-Modified-Since': sinceHTTP },
        })
        .reply(304, '');
      fetchMock.get(BASE)
        .intercept({
          path: '/preview/cpilsworth/nedp/digi2/accounts',
          headers: { 'If-Modified-Since': sinceHTTP },
        })
        .reply(304, '');

      const request = new Request<unknown, IncomingRequestCfProperties>(
        `http://example.com/preview/cpilsworth/nedp/digi2/manifest?since=${encodeURIComponent(sinceISO)}`,
      );
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, ENV, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      // We can't unzip in this test, but the response Last-Modified is the max
      // of (manifest LM, since-fallback for 304 screens). Since-fallback wins.
      expect(response.headers.get('Last-Modified')).toBe(sinceHTTP);
    });

    it('does not require If-Modified-Since on screens when since is absent', async () => {
      fetchMock.get(BASE)
        .intercept({ path: '/preview/cpilsworth/nedp/digi2/manifest' })
        .reply(200, MANIFEST_BODY, {
          headers: { 'Content-Type': 'application/json' },
        });
      fetchMock.get(BASE)
        .intercept({ path: '/preview/cpilsworth/nedp/digi2/home' })
        .reply(200, JSON.stringify({ id: 'home' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      fetchMock.get(BASE)
        .intercept({ path: '/preview/cpilsworth/nedp/digi2/accounts' })
        .reply(200, JSON.stringify({ id: 'accounts' }), {
          headers: { 'Content-Type': 'application/json' },
        });

      const request = new Request<unknown, IncomingRequestCfProperties>(
        'http://example.com/preview/cpilsworth/nedp/digi2/manifest',
      );
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, ENV, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/zip');
    });
  });

  describe('conditional requests', () => {
    it('returns 304 when client If-Modified-Since covers the latest', async () => {
      fetchMock.get(BASE)
        .intercept({ path: '/preview/cpilsworth/nedp/digi2/manifest' })
        .reply(200, MANIFEST_BODY, {
          headers: {
            'Content-Type': 'application/json',
            'Last-Modified': 'Mon, 27 Apr 2026 10:00:00 GMT',
          },
        });
      fetchMock.get(BASE)
        .intercept({ path: '/preview/cpilsworth/nedp/digi2/home' })
        .reply(200, JSON.stringify({ id: 'home' }), {
          headers: {
            'Content-Type': 'application/json',
            'Last-Modified': 'Sun, 26 Apr 2026 09:00:00 GMT',
          },
        });
      fetchMock.get(BASE)
        .intercept({ path: '/preview/cpilsworth/nedp/digi2/accounts' })
        .reply(200, JSON.stringify({ id: 'accounts' }), {
          headers: {
            'Content-Type': 'application/json',
            'Last-Modified': 'Sat, 25 Apr 2026 09:00:00 GMT',
          },
        });

      const request = new Request<unknown, IncomingRequestCfProperties>(
        'http://example.com/preview/cpilsworth/nedp/digi2/manifest',
        { headers: { 'If-Modified-Since': 'Wed, 29 Apr 2026 00:00:00 GMT' } },
      );
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, ENV, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(304);
      expect(response.headers.get('Last-Modified')).toBe('Mon, 27 Apr 2026 10:00:00 GMT');
    });
  });

  describe('HEAD support', () => {
    it('returns 200 with headers and no body on HEAD when content has changed', async () => {
      fetchMock.get(BASE)
        .intercept({ path: '/preview/cpilsworth/nedp/digi2/manifest' })
        .reply(200, MANIFEST_BODY, {
          headers: {
            'Content-Type': 'application/json',
            'Last-Modified': 'Wed, 29 Apr 2026 12:00:00 GMT',
            'Cache-Control': 'public, max-age=60',
          },
        });
      fetchMock.get(BASE)
        .intercept({ path: '/preview/cpilsworth/nedp/digi2/home' })
        .reply(200, JSON.stringify({ id: 'home' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      fetchMock.get(BASE)
        .intercept({ path: '/preview/cpilsworth/nedp/digi2/accounts' })
        .reply(200, JSON.stringify({ id: 'accounts' }), {
          headers: { 'Content-Type': 'application/json' },
        });

      const request = new Request<unknown, IncomingRequestCfProperties>(
        'http://example.com/preview/cpilsworth/nedp/digi2/manifest',
        { method: 'HEAD' },
      );
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, ENV, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/zip');
      expect(response.headers.get('Content-Disposition')).toContain('manifest.zip');
      expect(response.headers.get('Last-Modified')).toBe('Wed, 29 Apr 2026 12:00:00 GMT');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
      expect(await response.text()).toBe('');
    });
  });

  describe('routing', () => {
    it('serves the UI HTML at /', async () => {
      const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
      const body = await response.text();
      expect(body).toContain('Manifest Bundle Viewer');
    });

    it('returns 400 for paths missing required segments', async () => {
      const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/preview/org');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, ENV, ctx);
      await waitOnExecutionContext(ctx);
      expect(response.status).toBe(400);
    });
  });
});
