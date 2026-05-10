/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

/* eslint-disable import/no-unresolved */
import { h, render } from 'https://esm.sh/preact@10';
import htm from 'https://esm.sh/htm@3';
/* eslint-enable import/no-unresolved */
import ManifestBundle from '../lib/manifest-bundle.js';

const html = htm.bind(h);

/**
 * <mobile-app-preview> — drop-in Web Component that renders an iOS-style
 * mobile preview of a manifest bundle served by the da-sc-zip worker.
 *
 * The component is a *reader*: it consumes whatever is already in cache for
 * the given `path` via the ManifestBundle API and rerenders when the cache
 * changes (locally or in another tab via the storage event). Fetching/
 * refreshing is the responsibility of the host page, which can drive it via
 * `preview.bundle.fetch()` / `preview.bundle.refresh()`.
 *
 * Attributes:
 *   path    — manifest path/URL (e.g. /preview/org/site/path/to/manifest)
 *   screen  — optional screen path to display (defaults to first)
 *
 * Methods:
 *   selectScreen(path)
 *
 * Properties (read-only):
 *   bundle, manifest, screens, currentScreen, currentScreenPath
 *
 * Events (bubble + composed):
 *   bundle-change, screen-change
 */

const STYLES = `
  :host { display: block; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1a1a1a; }
  * { box-sizing: border-box; }
  .empty { padding: 4rem 1rem; text-align: center; color: #888; }

  .phone { width: 380px; height: 780px; background: #1a1a1a; border-radius: 50px; padding: 10px; box-shadow: 0 30px 60px -10px rgba(0,0,0,0.35), 0 0 0 2px #2a2a2a inset; position: relative; }
  .phone-screen { width: 100%; height: 100%; background: linear-gradient(#176e3a 0 55%, #fff 55% 100%); border-radius: 42px; overflow: hidden; position: relative; display: flex; flex-direction: column; }
  .notch { position: absolute; top: 18px; left: 50%; transform: translateX(-50%); width: 110px; height: 28px; background: #0a0a0a; border-radius: 18px; z-index: 10; }
  .home-bar { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); width: 120px; height: 4px; background: rgba(0,0,0,0.35); border-radius: 2px; z-index: 10; }

  .statusbar { height: 50px; padding: 18px 28px 0; display: flex; justify-content: space-between; align-items: flex-start; color: #fff; font-size: 0.8rem; font-weight: 600; flex-shrink: 0; }
  .statusbar .right { display: flex; gap: 5px; align-items: center; }
  .statusbar svg { width: 16px; height: 11px; }

  .screen-body { flex: 1; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; padding-bottom: 90px; }
  .screen-body::-webkit-scrollbar { width: 0; }

  .app-header { padding: 0.5rem 1.25rem 1rem; color: #fff; }
  .app-header .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
  .app-header .user { display: flex; align-items: center; gap: 0.6rem; font-size: 0.95rem; }
  .app-header .user .avatar { width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.18); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; }
  .app-header .icons { display: flex; gap: 1rem; }
  .app-header .icons .ico { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .app-header h1 { font-size: 1.6rem; font-weight: 700; margin: 0.5rem 0 0.75rem; }

  .green-card { background: rgba(255,255,255,0.08); border-radius: 8px; padding: 0.6rem 0.85rem; margin: 0 1rem 0.4rem; color: #fff; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
  .green-card:hover { background: rgba(255,255,255,0.14); }
  .green-card .label { font-size: 0.75rem; opacity: 0.85; }
  .green-card .value { font-size: 1rem; font-weight: 600; margin-top: 2px; }
  .green-card .cta { color: #d8e83a; font-weight: 700; font-size: 0.95rem; }
  .green-card .chev { color: rgba(255,255,255,0.7); font-size: 1.2rem; }

  .dots { display: flex; justify-content: center; align-items: center; gap: 6px; padding: 0.85rem 0 0.4rem; color: rgba(255,255,255,0.7); }
  .dots .dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.5); }
  .dots .dot.active { background: #fff; width: 7px; height: 7px; }
  .dots .arrow { font-size: 0.8rem; opacity: 0.7; padding: 0 0.4rem; }

  .white-zone { background: #fff; border-radius: 18px 18px 0 0; padding: 1rem 1.25rem; flex: 1; }
  .featured { border: 1px solid #e8e8e8; border-radius: 10px; padding: 0.75rem 1rem; display: flex; gap: 0.85rem; align-items: center; }
  .featured .badge { width: 42px; height: 42px; border-radius: 8px; background: linear-gradient(135deg, #f9d7e8, #c8e6f5); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #176e3a; font-size: 0.9rem; flex-shrink: 0; }
  .featured .text .lead { font-size: 0.7rem; color: #888; margin-bottom: 2px; }
  .featured .text .body { font-size: 0.85rem; line-height: 1.3; color: #1a1a1a; }

  .section-title { font-size: 1.4rem; font-weight: 700; margin: 1.25rem 0 0.85rem; }
  .widgets { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.85rem 0.5rem; }
  .widget { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; cursor: pointer; }
  .widget .ico { width: 52px; height: 52px; border-radius: 12px; background: #f5f5f5; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; color: #176e3a; }
  .widget .name { font-size: 0.7rem; color: #333; text-align: center; line-height: 1.15; }

  .kv-card { background: #fafafa; border: 1px solid #ececec; border-radius: 10px; padding: 0.75rem 0.9rem; margin-bottom: 0.65rem; }
  .kv-card .k { font-size: 0.7rem; color: #888; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.15rem; }
  .kv-card .v { font-size: 0.9rem; color: #1a1a1a; word-break: break-word; }
  .raw-json { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.7rem; background: #f5f5f5; padding: 0.5rem; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; color: #333; margin: 0; }

  .tabbar { position: absolute; left: 12px; right: 12px; bottom: 22px; height: 64px; background: #fff; border-radius: 28px; box-shadow: 0 8px 20px -4px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04); display: flex; align-items: center; justify-content: space-around; padding: 0 0.4rem; z-index: 5; }
  .tab { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 0.3rem 0.6rem; cursor: pointer; min-width: 56px; color: #888; background: none; border: 0; font: inherit; }
  .tab.active { color: #176e3a; }
  .tab .ico { font-size: 1.3rem; line-height: 1; }
  .tab .name { font-size: 0.65rem; }
`;

const SIGNAL_SVG = html`<svg viewBox="0 0 16 11" fill="currentColor"><path d="M0 8h2v3H0zM4 5h2v6H4zM8 2h2v9H8zM12 0h2v11h-2z"></path></svg>`;

const KNOWN_KEYS = new Set([
  'accounts', 'cards', 'promos', 'banners', 'offers',
  'widgets', 'shortcuts', 'actions', 'tiles',
  'featured', 'highlight', 'title', 'userName', 'user', 'greeting',
]);

function pickArray(data, keys) {
  if (!data || typeof data !== 'object') return [];
  const key = keys.find((k) => Array.isArray(data[k]) && data[k].length);
  if (!key) return [];
  return data[key].map((item) => (typeof item === 'object' && item ? item : { name: String(item) }));
}

function tabIcon(id) {
  const s = String(id).toLowerCase();
  if (s.includes('home') || s.includes('overview') || s.includes('dashboard')) return '◎';
  if (s.includes('card')) return '▭';
  if (s.includes('account')) return '☰';
  if (s.includes('transact') || s.includes('pay')) return '+';
  if (s.includes('recip') || s.includes('contact')) return '◔';
  return '○';
}

function humanize(s) {
  const leaf = String(s).split('/').pop() || '';
  return leaf.replace(/[-_]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

function clock() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function StatusBar() {
  return html`
    <div class="statusbar">
      <span>${clock()}</span>
      <div class="right">
        <span>•••</span>
        ${SIGNAL_SVG}
        <span>66</span>
      </div>
    </div>`;
}

function formatValue(v) {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  return html`<pre class="raw-json">${JSON.stringify(v, null, 2)}</pre>`;
}

function ScreenContent({ json }) {
  if (!json) return html`<div class="empty">No screen data.</div>`;
  const data = json.data ?? json;
  const meta = json.metadata ?? {};
  const title = data?.title ?? meta?.title ?? meta?.schemaName ?? 'Screen';
  const userName = data?.userName ?? data?.user ?? data?.greeting ?? 'Mr JOHN SMITH';
  const accounts = pickArray(data, ['accounts', 'cards']);
  const promos = pickArray(data, ['promos', 'banners', 'offers']);
  const widgets = pickArray(data, ['widgets', 'shortcuts', 'actions', 'tiles']);
  const featured = data?.featured ?? data?.highlight ?? null;
  const extra = (data && typeof data === 'object' && !Array.isArray(data))
    ? Object.entries(data).filter(([k, v]) => (
      !KNOWN_KEYS.has(k) && v != null && (typeof v !== 'object' || Object.keys(v).length)
    ))
    : [];
  const empty = !accounts.length && !promos.length && !widgets.length && !featured && !extra.length;

  return html`
    <${StatusBar} />
    <div class="app-header">
      <div class="row">
        <div class="user">
          <div class="avatar">N</div>
          <span>${userName}</span>
        </div>
        <div class="icons">
          <div class="ico">🔔</div>
          <div class="ico">💬</div>
        </div>
      </div>
      <h1>${title}</h1>
    </div>
    ${accounts.map((a) => html`
      <div class="green-card">
        <div>
          <div class="label">${a.label ?? a.type ?? a.subtitle ?? 'Account'}</div>
          <div class="value">${a.name ?? a.title ?? a.balance ?? ''}</div>
        </div>
        <div class="chev">›</div>
      </div>`)}
    ${promos.map((p) => html`
      <div class="green-card">
        <div>
          <div class="label">${p.label ?? p.eyebrow ?? p.kicker ?? ''}</div>
          <div class="value">${p.title ?? p.name ?? ''}</div>
        </div>
        <div class="cta">${p.cta ?? p.action ?? 'Apply'}</div>
      </div>`)}
    ${(accounts.length || promos.length) ? html`
      <div class="dots">
        <span class="arrow">‹</span>
        ${Array.from({ length: 7 }).map((_, i) => html`<span class="dot ${i === 1 ? 'active' : ''}"></span>`)}
        <span class="arrow">›</span>
      </div>` : null}
    <div class="white-zone">
      ${featured ? html`
        <div class="featured">
          <div class="badge">R</div>
          <div class="text">
            <div class="lead">${featured.eyebrow ?? featured.kicker ?? 'Featured'}</div>
            <div class="body">${featured.title ?? featured.text ?? featured.body ?? ''}</div>
          </div>
        </div>` : null}
      ${widgets.length ? html`
        <div class="section-title">My widgets</div>
        <div class="widgets">
          ${widgets.map((w) => html`
            <div class="widget">
              <div class="ico">${w.icon ?? '✦'}</div>
              <div class="name">${w.name ?? w.label ?? w.title ?? ''}</div>
            </div>`)}
        </div>` : null}
      ${extra.length ? html`
        <div class="section-title">More</div>
        ${extra.map(([k, v]) => html`
          <div class="kv-card">
            <div class="k">${k}</div>
            <div class="v">${formatValue(v)}</div>
          </div>`)}
      ` : null}
      ${empty ? html`<pre class="raw-json">${JSON.stringify(data, null, 2)}</pre>` : null}
    </div>`;
}

function TabBar({ screens, activePath, onSelect }) {
  if (!screens?.length) return null;
  return html`
    <div class="tabbar">
      ${screens.slice(0, 5).map((s) => {
    const id = s.id ?? s.path ?? '';
    const active = (s.path ?? '') === activePath;
    return html`
          <button type="button" class="tab ${active ? 'active' : ''}" onClick=${() => onSelect(s.path)}>
            <div class="ico">${tabIcon(id)}</div>
            <div class="name">${humanize(s.id ?? s.path ?? '')}</div>
          </button>`;
  })}
    </div>`;
}

function Phone({
  screens, activePath, screenJson, onSelect,
}) {
  return html`
    <div class="phone">
      <div class="phone-screen">
        <div class="notch"></div>
        <div class="screen-body">
          <${ScreenContent} json=${screenJson} />
        </div>
        <${TabBar} screens=${screens} activePath=${activePath} onSelect=${onSelect} />
        <div class="home-bar"></div>
      </div>
    </div>`;
}

class MobileAppPreview extends HTMLElement {
  static get observedAttributes() { return ['path', 'screen']; }

  #bundle = null;

  #activeScreen = null;

  #mount = null;

  #onChange;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.#onChange = () => this.#render();
  }

  connectedCallback() {
    const style = document.createElement('style');
    style.textContent = STYLES;
    this.shadowRoot.appendChild(style);
    this.#mount = document.createElement('div');
    this.shadowRoot.appendChild(this.#mount);
    this.#wireBundle();
    this.#render();
  }

  disconnectedCallback() {
    if (this.#mount) render(null, this.#mount);
    this.#teardownBundle();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'path') {
      this.#activeScreen = null;
      if (this.#bundle) this.#bundle.path = newValue;
      else this.#wireBundle();
      this.#render();
    } else if (name === 'screen') {
      this.#activeScreen = newValue || null;
      this.#render();
    }
  }

  #wireBundle() {
    this.#teardownBundle();
    const path = this.getAttribute('path');
    if (!path) return;
    this.#bundle = new ManifestBundle(path);
    this.#bundle.addEventListener('change', this.#onChange);
  }

  #teardownBundle() {
    if (!this.#bundle) return;
    this.#bundle.removeEventListener('change', this.#onChange);
    this.#bundle.destroy();
    this.#bundle = null;
  }

  // Public API
  get bundle() { return this.#bundle; }

  get manifest() { return this.#bundle?.getManifest() ?? null; }

  get screens() { return this.#bundle?.getScreens() ?? []; }

  get currentScreenPath() {
    return this.#activeScreen ?? this.getAttribute('screen') ?? this.screens[0]?.path ?? null;
  }

  get currentScreen() {
    const p = this.currentScreenPath;
    return p ? this.#bundle?.getScreen(p) ?? null : null;
  }

  selectScreen(path) {
    this.#activeScreen = path || null;
    this.#render();
    this.dispatchEvent(new CustomEvent('screen-change', {
      bubbles: true,
      composed: true,
      detail: { path },
    }));
  }

  #render() {
    if (!this.#mount) return;
    const { screens } = this;
    const activePath = this.currentScreenPath;
    const screenJson = this.currentScreen;
    render(
      h(Phone, {
        screens,
        activePath,
        screenJson,
        onSelect: (p) => this.selectScreen(p),
      }),
      this.#mount,
    );
    this.dispatchEvent(new CustomEvent('bundle-change', {
      bubbles: true,
      composed: true,
      detail: { manifest: this.manifest, screen: activePath },
    }));
  }
}

if (!customElements.get('mobile-app-preview')) {
  customElements.define('mobile-app-preview', MobileAppPreview);
}

export default MobileAppPreview;
