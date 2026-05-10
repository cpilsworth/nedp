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
export const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Manifest Bundle Viewer</title>
  <style>
    :root { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { max-width: 1000px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    p.lead { color: #555; margin-top: 0; font-size: 0.9rem; }
    .controls { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; align-items: center; }
    input[type=text] { flex: 1; min-width: 22rem; padding: 0.5rem 0.75rem; border: 1px solid #ccc; border-radius: 4px; font: inherit; }
    button { padding: 0.5rem 1rem; border: 1px solid #999; background: #fff; border-radius: 4px; cursor: pointer; font: inherit; }
    button:hover { background: #f4f4f4; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .status { padding: 0.5rem 0.75rem; margin: 0.75rem 0; background: #f4f4f4; border-radius: 4px; font-size: 0.9rem; min-height: 1.4em; }
    .status.ok { background: #e8f5e9; }
    .status.warn { background: #fff8e1; }
    .status.err { background: #ffebee; }
    .meta { font-size: 0.85rem; color: #666; margin-bottom: 0.5rem; }
    .files { border: 1px solid #ddd; border-radius: 4px; }
    .file { border-bottom: 1px solid #eee; }
    .file:last-child { border-bottom: none; }
    .file-header { padding: 0.5rem 0.75rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none; }
    .file-header:hover { background: #fafafa; }
    .file-header::before { content: '▸'; margin-right: 0.5rem; display: inline-block; transition: transform 0.1s; }
    .file.expanded .file-header::before { transform: rotate(90deg); }
    .file-name { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9rem; }
    .file-content { display: none; padding: 0 0.75rem 0.75rem; }
    .file.expanded .file-content { display: block; }
    pre { background: #f8f8f8; padding: 0.75rem; border-radius: 4px; overflow-x: auto; font-size: 0.8rem; margin: 0; }
  </style>
</head>
<body>
  <h1>Manifest Bundle Viewer</h1>
  <p class="lead">Fetches a manifest zip from this worker, expands it in the browser, and uses HEAD + If-Modified-Since to check for updates. <a href="/preview" target="_blank">Open mobile preview →</a></p>
  <div class="controls">
    <input type="text" id="path" value="/preview/cpilsworth/nedp/digi2/manifest" placeholder="/tier/org/site/path/to/manifest">
    <button id="fetch">Fetch</button>
    <button id="update">Check for Updates</button>
    <button id="clear">Clear</button>
  </div>
  <div id="status" class="status">Ready.</div>
  <div id="meta" class="meta"></div>
  <div id="files" class="files" hidden></div>

  <script type="module">
    import { unzip } from 'https://cdn.jsdelivr.net/npm/fflate@0.8.2/+esm';

    const \$ = (id) => document.getElementById(id);
    const pathInput = \$('path');
    const statusEl = \$('status');
    const metaEl = \$('meta');
    const filesEl = \$('files');

    const storageKey = (p) => 'manifest-bundle:' + p;
    const load = (p) => {
      const raw = localStorage.getItem(storageKey(p));
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    };
    const save = (p, data) => localStorage.setItem(storageKey(p), JSON.stringify(data));
    const clear = (p) => localStorage.removeItem(storageKey(p));

    function setStatus(msg, kind) {
      statusEl.textContent = msg;
      statusEl.className = 'status' + (kind ? ' ' + kind : '');
    }

    function setMeta(data) {
      if (!data) { metaEl.textContent = ''; return; }
      const count = Object.keys(data.files || {}).length;
      const fetched = data.fetchedAt ? new Date(data.fetchedAt).toLocaleString() : 'unknown';
      metaEl.textContent = count + ' file(s) · Last-Modified: ' + (data.lastModified || 'n/a') + ' · Fetched: ' + fetched;
    }

    async function unzipBlob(blob) {
      const buf = new Uint8Array(await blob.arrayBuffer());
      return new Promise((resolve, reject) => {
        unzip(buf, (err, files) => {
          if (err) return reject(err);
          const dec = new TextDecoder();
          const out = {};
          for (const [name, bytes] of Object.entries(files)) {
            const text = dec.decode(bytes);
            try { out[name] = JSON.parse(text); } catch { out[name] = text; }
          }
          resolve(out);
        });
      });
    }

    function render(data) {
      setMeta(data);
      if (!data || !data.files) { filesEl.hidden = true; filesEl.replaceChildren(); return; }
      const entries = Object.entries(data.files).sort(([a], [b]) => a.localeCompare(b));
      filesEl.hidden = false;
      filesEl.replaceChildren(...entries.map(([name, content]) => {
        const file = document.createElement('div');
        file.className = 'file';
        const header = document.createElement('div');
        header.className = 'file-header';
        const nameEl = document.createElement('span');
        nameEl.className = 'file-name';
        nameEl.textContent = name;
        header.appendChild(nameEl);
        file.appendChild(header);
        const contentEl = document.createElement('div');
        contentEl.className = 'file-content';
        const pre = document.createElement('pre');
        pre.textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        contentEl.appendChild(pre);
        file.appendChild(contentEl);
        header.addEventListener('click', () => file.classList.toggle('expanded'));
        return file;
      }));
    }

    async function doFetch() {
      const p = pathInput.value.trim();
      if (!p) { setStatus('Enter a path.', 'err'); return; }
      setStatus('Fetching…');
      try {
        const stored = load(p);
        const headers = stored && stored.lastModified
          ? { 'If-Modified-Since': stored.lastModified }
          : {};
        const resp = await fetch(p, { cache: 'no-store', headers });
        if (resp.status === 304) { setStatus('No updates.', 'ok'); return; }
        if (!resp.ok) { setStatus('Error: ' + resp.status + ' ' + resp.statusText, 'err'); return; }
        const lastModified = resp.headers.get('Last-Modified');
        const blob = await resp.blob();
        const files = await unzipBlob(blob);
        const data = { lastModified, files, fetchedAt: new Date().toISOString() };
        save(p, data);
        render(data);
        setStatus('Loaded ' + Object.keys(files).length + ' file(s).', 'ok');
      } catch (err) {
        setStatus('Error: ' + (err && err.message ? err.message : err), 'err');
      }
    }

    async function doUpdate() {
      const p = pathInput.value.trim();
      if (!p) { setStatus('Enter a path.', 'err'); return; }
      const stored = load(p);
      if (!stored || !stored.lastModified) {
        setStatus('No stored data — use Fetch first.', 'warn');
        return;
      }
      setStatus('Checking for updates…');
      try {
        const resp = await fetch(p, {
          method: 'HEAD',
          headers: { 'If-Modified-Since': stored.lastModified },
          cache: 'no-store',
        });
        if (resp.status === 304) { setStatus('No updates.', 'ok'); return; }
        if (resp.status === 200) {
          setStatus('Update available — fetching…');
          await doFetch();
          return;
        }
        setStatus('Unexpected status: ' + resp.status, 'err');
      } catch (err) {
        setStatus('Error: ' + (err && err.message ? err.message : err), 'err');
      }
    }

    function doClear() {
      const p = pathInput.value.trim();
      if (!p) return;
      clear(p);
      render(null);
      setStatus('Cleared.');
    }

    \$('fetch').addEventListener('click', doFetch);
    \$('update').addEventListener('click', doUpdate);
    \$('clear').addEventListener('click', doClear);

    pathInput.addEventListener('change', () => {
      const initial = load(pathInput.value.trim());
      render(initial);
      setStatus(initial ? 'Loaded from storage.' : 'Ready.');
    });

    const initial = load(pathInput.value.trim());
    if (initial) {
      render(initial);
      setStatus('Loaded from storage.');
    }
  </script>
</body>
</html>`;
