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
import { downloadZip } from 'client-zip';

interface Env {
  DA_SC_BASE_URL: string;
}

interface ScreenRef {
  id?: string;
  path?: string;
  lastModified?: string | null;
  [key: string]: unknown;
}

interface Manifest {
  metadata?: Record<string, unknown>;
  data?: {
    screens?: ScreenRef[];
    [key: string]: unknown;
  };
  lastModified?: string;
  [key: string]: unknown;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface FetchedScreen {
  screen: ScreenRef;
  body: unknown;
  lastModified: string | null;
}

function resolveScreenUrl(sitePrefix: string, path: string): string | null {
  if (path.startsWith('/')) return `${sitePrefix}${path}`;
  const base = `${sitePrefix}/`;
  const resolved = new URL(path, base).href;
  if (!resolved.startsWith(base)) return null;
  return resolved;
}

async function fetchScreen(
  sitePrefix: string,
  screen: ScreenRef,
  ifModifiedSince?: string | null,
): Promise<FetchedScreen> {
  if (!screen.path) return { screen, body: null, lastModified: null };
  const url = resolveScreenUrl(sitePrefix, screen.path);
  if (!url) return { screen, body: null, lastModified: null };
  const headers: Record<string, string> = {};
  if (ifModifiedSince) headers['If-Modified-Since'] = ifModifiedSince;
  const resp = await fetch(url, { headers });
  if (resp.status === 304) {
    // Origin SHOULD include Last-Modified on 304; if it doesn't, fall back to
    // the IMS we sent — a safe upper bound, since the resource's LM <= IMS.
    return {
      screen,
      body: null,
      lastModified: resp.headers.get('Last-Modified') ?? ifModifiedSince ?? null,
    };
  }
  if (!resp.ok) return { screen, body: null, lastModified: null };
  const body = await resp.json();
  return { screen, body, lastModified: resp.headers.get('Last-Modified') };
}

function latestDate(values: Array<string | null>): Date {
  const ms = values
    .filter((v): v is string => Boolean(v))
    .map((v) => Date.parse(v))
    .filter((n) => Number.isFinite(n));
  return ms.length ? new Date(Math.max(...ms)) : new Date();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
      }

      const url = new URL(request.url);
      if (url.pathname === '/favicon.ico') {
        return new Response('', { status: 404 });
      }

      const segments = url.pathname.replace(/\.zip$/, '').slice(1).split('/');
      const [tier, org, site, ...rest] = segments;
      if (!tier || !org || !site || rest.length === 0) {
        return new Response('Usage: /tier/org/site/path/to/manifest', { status: 400, headers: corsHeaders });
      }

      const sitePrefix = `${env.DA_SC_BASE_URL}/${tier}/${org}/${site}`;
      const manifestPath = rest.join('/');
      const manifestUrl = `${sitePrefix}/${manifestPath}`;

      const sinceParam = url.searchParams.get('since');
      const sinceDate = sinceParam ? new Date(sinceParam) : null;
      if (sinceParam && (!sinceDate || Number.isNaN(sinceDate.getTime()))) {
        return new Response(`Invalid 'since' parameter: ${sinceParam}`, {
          status: 400,
          headers: corsHeaders,
        });
      }
      const sinceIMS = sinceDate ? sinceDate.toUTCString() : null;

      const manifestResp = await fetch(manifestUrl);
      if (!manifestResp.ok) {
        return new Response(`Failed to fetch manifest: ${manifestUrl}`, {
          status: manifestResp.status,
          headers: corsHeaders,
        });
      }
      const manifestLastModified = manifestResp.headers.get('Last-Modified');
      const manifestCacheControl = manifestResp.headers.get('Cache-Control');
      const manifest = await manifestResp.json() as Manifest;

      const screens = manifest.data?.screens ?? [];
      const fetched = await Promise.all(screens.map((s) => fetchScreen(sitePrefix, s, sinceIMS)));

      const latest = latestDate([manifestLastModified, ...fetched.map((f) => f.lastModified)]);

      const clientIMS = request.headers.get('If-Modified-Since');
      const clientIMSMs = clientIMS ? Date.parse(clientIMS) : NaN;
      if (Number.isFinite(clientIMSMs) && latest.getTime() <= clientIMSMs) {
        return new Response(null, {
          status: 304,
          headers: {
            ...corsHeaders,
            'Last-Modified': latest.toUTCString(),
          },
        });
      }

      const baseName = (manifestPath.split('/').pop() || 'manifest').replace(/\.json$/, '');
      const responseHeaders: Record<string, string> = {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${baseName}.zip"`,
        'Last-Modified': latest.toUTCString(),
        'Cache-Control': manifestCacheControl ?? 'public, max-age=0, must-revalidate',
      };

      if (request.method === 'HEAD') {
        return new Response(null, { headers: responseHeaders });
      }

      manifest.data ??= {};
      manifest.data.screens = screens.map((screen, i) => ({
        ...screen,
        lastModified: fetched[i]?.lastModified ?? null,
      }));
      manifest.lastModified = latest.toUTCString();

      const zipFiles: { name: string; input: string; lastModified: Date }[] = [{
        name: `${baseName}.json`,
        input: JSON.stringify(manifest, null, 2),
        lastModified: latest,
      }];
      for (const f of fetched) {
        if (!f.body) continue;
        const path = (f.screen.path ?? '').replace(/^\//, '') || `screen-${zipFiles.length}`;
        zipFiles.push({
          name: `${path}.json`,
          input: JSON.stringify(f.body, null, 2),
          lastModified: f.lastModified ? new Date(f.lastModified) : latest,
        });
      }

      const zipResp = downloadZip(zipFiles);
      return new Response(zipResp.body, { headers: responseHeaders });
    } catch (err: any) {
      return new Response(`Error: ${err.message || err}`, {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};
