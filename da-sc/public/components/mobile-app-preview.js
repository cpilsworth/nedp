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
  .phone-screen { width: 100%; height: 100%; background: #176e3a; border-radius: 42px; overflow: hidden; position: relative; display: flex; flex-direction: column; }
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
  .section-h1 { color: #fff; font-size: 1.6rem; font-weight: 700; margin: 0.25rem 1.25rem 0.75rem; }

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

// Icon name → emoji, used for cardList grid tiles. Falls back to ✦.
const ICON_EMOJI = {
  account: '💼',
  rewards: '🎁',
  offers: '🌿',
  applications: '📋',
  insure: '☂️',
  'discs-fines': '🚗',
  shop: '🛒',
  shapid: '✦',
  latest: '🎁',
  'quick-pay': '💸',
  'pay-me': '💰',
  atm: '🏧',
  'home-loans': '🏠',
  statements: '📄',
};

function iconFor(name) {
  if (!name) return '✦';
  return ICON_EMOJI[name] ?? '✦';
}

function tabIcon(id) {
  const s = String(id).toLowerCase();
  if (s.includes('home') || s.includes('overview') || s.includes('dashboard')) return '◎';
  if (s.includes('card')) return '▭';
  if (s.includes('account')) return '☰';
  if (s.includes('transact') || s.includes('pay')) return '+';
  if (s.includes('recip') || s.includes('contact')) return '◔';
  if (s.includes('invest')) return '◇';
  if (s.includes('trade')) return '◈';
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

// Partition sections by their natural zone:
//   green (top)   — hero, list, multi-item promo (carousel)
//   white (body)  — cardList, single-item promo (featured), disclaimer
function partitionSections(sections) {
  const green = [];
  const white = [];
  sections.forEach((s) => {
    const itemCount = s.items?.length ?? 0;
    if (s.type === 'hero' || s.type === 'list') green.push(s);
    else if (s.type === 'promo' && itemCount > 1) green.push(s);
    else white.push(s);
  });
  return { green, white };
}

function ListSection({ section }) {
  return html`
    ${section.title ? html`<h1 class="section-h1">${section.title}</h1>` : null}
    ${(section.items ?? []).map((it) => html`
      <div class="green-card">
        <div>
          <div class="label">${it.title ?? ''}</div>
          ${it.description ? html`<div class="value">${it.description}</div>` : null}
        </div>
        <div class="chev">›</div>
      </div>`)}`;
}

function GreenPromoSection({ section }) {
  return html`
    ${(section.items ?? []).map((it) => html`
      <div class="green-card">
        <div>
          ${it.description ? html`<div class="label">${it.description}</div>` : null}
          <div class="value">${it.title ?? ''}</div>
        </div>
        ${it.ctaLabel ? html`<div class="cta">${it.ctaLabel}</div>` : html`<div class="chev">›</div>`}
      </div>`)}`;
}

function FeaturedPromoSection({ section }) {
  return (section.items ?? []).map((it) => html`
    <div class="featured">
      <div class="badge">${iconFor(it.icon)}</div>
      <div class="text">
        <div class="lead">${it.description ?? section.title ?? 'Featured'}</div>
        <div class="body">${it.title ?? ''}</div>
      </div>
    </div>`);
}

function CardListSection({ section }) {
  return html`
    ${section.title ? html`<div class="section-title">${section.title}</div>` : null}
    <div class="widgets">
      ${(section.items ?? []).map((it) => html`
        <div class="widget">
          <div class="ico">${iconFor(it.icon)}</div>
          <div class="name">${it.title ?? it.description ?? ''}</div>
        </div>`)}
    </div>`;
}

function HeroSection({ section }) {
  return html`
    <div class="app-header" style="padding-bottom:0">
      ${section.title ? html`<h1>${section.title}</h1>` : null}
      ${section.subtitle ? html`<div class="label">${section.subtitle}</div>` : null}
    </div>`;
}

function DisclaimerSection({ section }) {
  return html`
    <div class="kv-card">
      <div class="k">${section.title ?? 'Disclaimer'}</div>
      ${(section.items ?? []).map((it) => html`
        <div class="v">${it.title ?? it.description ?? ''}</div>`)}
    </div>`;
}

function GreenSection({ section }) {
  if (section.type === 'hero') return html`<${HeroSection} section=${section} />`;
  if (section.type === 'list') return html`<${ListSection} section=${section} />`;
  if (section.type === 'promo') return html`<${GreenPromoSection} section=${section} />`;
  return null;
}

function WhiteSection({ section }) {
  if (section.type === 'cardList') return html`<${CardListSection} section=${section} />`;
  if (section.type === 'promo') return html`<${FeaturedPromoSection} section=${section} />`;
  if (section.type === 'disclaimer') return html`<${DisclaimerSection} section=${section} />`;
  return null;
}

function Header({ userName }) {
  return html`
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
    </div>`;
}

function CarouselDots({ count, active = 1 }) {
  if (count <= 0) return null;
  return html`
    <div class="dots">
      <span class="arrow">‹</span>
      ${Array.from({ length: count }).map((_, i) => html`<span class="dot ${i === active ? 'active' : ''}"></span>`)}
      <span class="arrow">›</span>
    </div>`;
}

function ScreenContent({ json }) {
  if (!json) return html`<div class="empty">No screen data.</div>`;
  const data = json.data ?? json;
  const userName = data?.userName ?? data?.user ?? data?.greeting ?? 'Mr JOHN SMITH';

  // Section-based schema (page.schema.json)
  if (Array.isArray(data?.sections) && data.sections.length) {
    const { green, white } = partitionSections(data.sections);
    const dotCount = green
      .filter((s) => s.type === 'promo' || s.type === 'list')
      .reduce((sum, s) => sum + (s.items?.length ?? 0), 0);

    return html`
      <${StatusBar} />
      <${Header} userName=${userName} />
      ${green.map((s) => html`<${GreenSection} section=${s} />`)}
      <${CarouselDots} count=${Math.min(dotCount, 8)} active=${1} />
      <div class="white-zone">
        ${white.map((s) => html`<${WhiteSection} section=${s} />`)}
      </div>`;
  }

  // Unknown shape — show the raw JSON so authors can inspect.
  return html`
    <${StatusBar} />
    <${Header} userName=${userName} />
    <div class="white-zone">
      <pre class="raw-json">${JSON.stringify(data, null, 2)}</pre>
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
