/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * ManifestBundle — client-side store for a manifest+screens bundle served
 * by the da-sc-zip worker. Hides localStorage, zip handling, conditional
 * fetching (Last-Modified / If-Modified-Since), and cross-tab sync.
 *
 * Public surface:
 *   const bundle = new ManifestBundle(path);
 *   await bundle.load();              // cache-only read; resolves to data or null
 *   await bundle.fetch();              // network fetch, store, return data
 *   await bundle.checkForUpdates();    // HEAD request → boolean
 *   await bundle.refresh();            // checkForUpdates → fetch if stale; returns boolean
 *   bundle.clear();                    // drop the cached entry
 *   bundle.getManifest();              // sync: parsed manifest (or null)
 *   bundle.getScreens();               // sync: screens array (or [])
 *   bundle.getScreen(path);            // sync: screen JSON for path (or null)
 *   bundle.path = '/new/path';         // re-points and re-reads cache
 *   bundle.addEventListener('change', …);   // emitted when stored data changes
 *   bundle.addEventListener('error', …);    // emitted on fetch errors
 *
 * The 'change' event fires both on local mutations (fetch/refresh/clear)
 * and on storage events from other tabs.
 */

const STORAGE_PREFIX = 'manifest-bundle:';
const FFLATE_URL = 'https://cdn.jsdelivr.net/npm/fflate@0.8.2/+esm';

let fflatePromise = null;
function loadFflate() {
  if (!fflatePromise) fflatePromise = import(FFLATE_URL);
  return fflatePromise;
}

function storageKey(path) {
  return STORAGE_PREFIX + path;
}

function readStored(path) {
  const raw = localStorage.getItem(storageKey(path));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function writeStored(path, data) {
  localStorage.setItem(storageKey(path), JSON.stringify(data));
}

function removeStored(path) {
  localStorage.removeItem(storageKey(path));
}

async function unzipBlob(blob) {
  const { unzip } = await loadFflate();
  const buf = new Uint8Array(await blob.arrayBuffer());
  return new Promise((resolve, reject) => {
    unzip(buf, (err, files) => {
      if (err) {
        reject(err);
        return;
      }
      const dec = new TextDecoder();
      const out = {};
      Object.entries(files).forEach(([name, bytes]) => {
        const text = dec.decode(bytes);
        try { out[name] = JSON.parse(text); } catch { out[name] = text; }
      });
      resolve(out);
    });
  });
}

function findManifest(files) {
  if (!files) return null;
  const entries = Object.entries(files);
  const direct = entries.find(([, v]) => (
    v && typeof v === 'object' && v.metadata && v.data && Array.isArray(v.data.screens)
  ));
  if (direct) return direct[1];
  const named = entries.find(([k]) => /manifest/i.test(k));
  return named ? named[1] : null;
}

function findScreen(files, screenPath) {
  if (!files || !screenPath) return null;
  const clean = screenPath.replace(/^\//, '');
  const candidates = [clean, `${clean}.json`, screenPath, `${screenPath}.json`];
  const direct = candidates.find((k) => files[k] != null);
  if (direct) return files[direct];
  const leaf = clean.split('/').pop();
  const found = Object.entries(files).find(([k]) => k.endsWith(leaf) || k.endsWith(`${leaf}.json`));
  return found ? found[1] : null;
}

export default class ManifestBundle extends EventTarget {
  #path;

  #stored;

  #onStorage;

  constructor(path) {
    super();
    this.#path = path;
    this.#stored = path ? readStored(path) : null;
    this.#onStorage = (e) => {
      if (!e.key || e.key === storageKey(this.#path)) {
        this.#stored = readStored(this.#path);
        this.#emitChange('storage');
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.#onStorage);
    }
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.#onStorage);
    }
  }

  get path() { return this.#path; }

  set path(value) {
    if (value === this.#path) return;
    this.#path = value;
    this.#stored = value ? readStored(value) : null;
    this.#emitChange('path-changed');
  }

  /** Returns the cached bundle data (without network), or null. */
  load() {
    this.#stored = this.#path ? readStored(this.#path) : null;
    return this.#stored;
  }

  /** Network fetch; unzips, stores, emits 'change'. Returns the new data. */
  async fetch() {
    if (!this.#path) throw new Error('ManifestBundle: path is not set');
    const headers = this.#stored?.lastModified
      ? { 'If-Modified-Since': this.#stored.lastModified }
      : {};
    let resp;
    try {
      resp = await fetch(this.#path, { cache: 'no-store', headers });
    } catch (err) {
      this.#emitError(err);
      throw err;
    }
    if (resp.status === 304) return this.#stored;
    if (!resp.ok) {
      const err = new Error(`Fetch failed: ${resp.status} ${resp.statusText}`);
      this.#emitError(err);
      throw err;
    }
    const lastModified = resp.headers.get('Last-Modified');
    const blob = await resp.blob();
    const files = await unzipBlob(blob);
    const data = { lastModified, files, fetchedAt: new Date().toISOString() };
    writeStored(this.#path, data);
    this.#stored = data;
    this.#emitChange('fetch');
    return data;
  }

  /** HEAD request with If-Modified-Since. Returns true if updates available. */
  async checkForUpdates() {
    if (!this.#path) throw new Error('ManifestBundle: path is not set');
    if (!this.#stored?.lastModified) return true;
    let resp;
    try {
      resp = await fetch(this.#path, {
        method: 'HEAD',
        headers: { 'If-Modified-Since': this.#stored.lastModified },
        cache: 'no-store',
      });
    } catch (err) {
      this.#emitError(err);
      throw err;
    }
    if (resp.status === 304) return false;
    if (resp.status === 200) return true;
    throw new Error(`Unexpected status: ${resp.status}`);
  }

  /** checkForUpdates → fetch if stale. Returns true if anything was updated. */
  async refresh() {
    if (!this.#stored) {
      await this.fetch();
      return true;
    }
    const updates = await this.checkForUpdates();
    if (updates) await this.fetch();
    return updates;
  }

  clear() {
    if (!this.#path) return;
    removeStored(this.#path);
    this.#stored = null;
    this.#emitChange('clear');
  }

  /** Sync read: full parsed manifest (or null). */
  getManifest() {
    return findManifest(this.#stored?.files);
  }

  /** Sync read: screens array (or empty). */
  getScreens() {
    const m = this.getManifest();
    return m?.data?.screens ?? [];
  }

  /** Sync read: screen JSON for path (or null). */
  getScreen(screenPath) {
    return findScreen(this.#stored?.files, screenPath);
  }

  /** Sync read: bundle metadata (lastModified, fetchedAt) or null. */
  getMeta() {
    if (!this.#stored) return null;
    return {
      lastModified: this.#stored.lastModified ?? null,
      fetchedAt: this.#stored.fetchedAt ?? null,
      fileCount: Object.keys(this.#stored.files ?? {}).length,
    };
  }

  #emitChange(reason) {
    this.dispatchEvent(new CustomEvent('change', { detail: { reason } }));
  }

  #emitError(error) {
    this.dispatchEvent(new CustomEvent('error', { detail: { error } }));
  }
}
