/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
export const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mobile Preview</title>
  <style>
    :root { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #ececec; min-height: 100vh; color: #1a1a1a; }
    .topbar { padding: 0.75rem 1rem; background: #fff; border-bottom: 1px solid #ddd; display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; position: sticky; top: 0; z-index: 100; }
    .topbar input[type=text] { flex: 1; min-width: 22rem; padding: 0.4rem 0.6rem; border: 1px solid #ccc; border-radius: 4px; font: inherit; font-size: 0.9rem; }
    .topbar button { padding: 0.4rem 0.8rem; border: 1px solid #999; background: #fff; border-radius: 4px; cursor: pointer; font: inherit; font-size: 0.85rem; }
    .topbar button:hover { background: #f4f4f4; }
    .topbar .status { font-size: 0.8rem; color: #666; padding: 0 0.5rem; }
    .topbar .status.err { color: #c62828; }
    .topbar .status.warn { color: #ef6c00; }
    .topbar .status.ok { color: #2e7d32; }
    .stage { display: flex; justify-content: center; align-items: flex-start; padding: 2rem 1rem; gap: 2rem; flex-wrap: wrap; }

    /* Phone frame */
    .phone { width: 380px; height: 780px; background: #1a1a1a; border-radius: 50px; padding: 10px; box-shadow: 0 30px 60px -10px rgba(0,0,0,0.35), 0 0 0 2px #2a2a2a inset; position: relative; flex-shrink: 0; }
    .phone-screen { width: 100%; height: 100%; background: linear-gradient(#176e3a 0 55%, #fff 55% 100%); border-radius: 42px; overflow: hidden; position: relative; display: flex; flex-direction: column; }
    .notch { position: absolute; top: 18px; left: 50%; transform: translateX(-50%); width: 110px; height: 28px; background: #0a0a0a; border-radius: 18px; z-index: 10; }
    .home-bar { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); width: 120px; height: 4px; background: rgba(0,0,0,0.35); border-radius: 2px; z-index: 10; }

    /* Status bar */
    .statusbar { height: 50px; padding: 18px 28px 0; display: flex; justify-content: space-between; align-items: flex-start; color: #fff; font-size: 0.8rem; font-weight: 600; flex-shrink: 0; }
    .statusbar .right { display: flex; gap: 5px; align-items: center; }
    .statusbar svg { width: 16px; height: 11px; }

    /* Scrollable screen body */
    .screen-body { flex: 1; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; padding-bottom: 90px; }
    .screen-body::-webkit-scrollbar { width: 0; }

    /* Header (green top zone) */
    .app-header { padding: 0.5rem 1.25rem 1rem; color: #fff; }
    .app-header .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .app-header .user { display: flex; align-items: center; gap: 0.6rem; font-size: 0.95rem; }
    .app-header .user .avatar { width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.18); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; }
    .app-header .icons { display: flex; gap: 1rem; }
    .app-header .icons .ico { width: 26px; height: 26px; border-radius: 50%; background: rgba(255,255,255,0.0); display: flex; align-items: center; justify-content: center; }
    .app-header h1 { font-size: 1.6rem; font-weight: 700; margin: 0.5rem 0 0.75rem; }

    /* Cards on green */
    .green-card { background: rgba(255,255,255,0.08); border-radius: 8px; padding: 0.6rem 0.85rem; margin: 0 1rem 0.4rem; color: #fff; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
    .green-card:hover { background: rgba(255,255,255,0.14); }
    .green-card .label { font-size: 0.75rem; opacity: 0.85; }
    .green-card .value { font-size: 1rem; font-weight: 600; margin-top: 2px; }
    .green-card .cta { color: #d8e83a; font-weight: 700; font-size: 0.95rem; }
    .green-card .chev { color: rgba(255,255,255,0.7); font-size: 1.2rem; }

    /* Carousel dots */
    .dots { display: flex; justify-content: center; align-items: center; gap: 6px; padding: 0.85rem 0 0.4rem; color: rgba(255,255,255,0.7); }
    .dots .dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.5); }
    .dots .dot.active { background: #fff; width: 7px; height: 7px; }
    .dots .arrow { font-size: 0.8rem; opacity: 0.7; padding: 0 0.4rem; cursor: pointer; }

    /* White content section */
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

    /* Generic key/value card */
    .kv-card { background: #fafafa; border: 1px solid #ececec; border-radius: 10px; padding: 0.75rem 0.9rem; margin-bottom: 0.65rem; }
    .kv-card .k { font-size: 0.7rem; color: #888; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.15rem; }
    .kv-card .v { font-size: 0.9rem; color: #1a1a1a; word-break: break-word; }
    .raw-json { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.7rem; background: #f5f5f5; padding: 0.5rem; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; color: #333; }

    /* Tab bar */
    .tabbar { position: absolute; left: 12px; right: 12px; bottom: 22px; height: 64px; background: #fff; border-radius: 28px; box-shadow: 0 8px 20px -4px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04); display: flex; align-items: center; justify-content: space-around; padding: 0 0.4rem; z-index: 5; }
    .tab { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 0.3rem 0.6rem; cursor: pointer; min-width: 56px; color: #888; }
    .tab.active { color: #176e3a; }
    .tab .ico { font-size: 1.3rem; line-height: 1; }
    .tab .name { font-size: 0.65rem; }

    /* Json side panel */
    .json-panel { width: 380px; max-width: 100%; max-height: 780px; overflow: auto; background: #fff; border-radius: 12px; padding: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.06); flex-shrink: 0; }
    .json-panel h3 { margin: 0 0 0.5rem; font-size: 0.95rem; }
    .json-panel pre { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.7rem; background: #f8f8f8; padding: 0.6rem; border-radius: 6px; overflow: auto; margin: 0; line-height: 1.4; }
    .empty { padding: 4rem 1rem; text-align: center; color: #888; }
    .empty a { color: #176e3a; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { h, render } from 'https://esm.sh/preact@10';
    import { useState, useEffect, useMemo, useCallback } from 'https://esm.sh/preact@10/hooks';
    import htm from 'https://esm.sh/htm@3';
    const html = htm.bind(h);

    const storageKey = (p) => 'manifest-bundle:' + p;

    function loadStored(path) {
      const raw = localStorage.getItem(storageKey(path));
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    }

    // Find a screen JSON inside a stored bundle. Files are keyed by path
    // (e.g. "digi2/home" or "digi2/home.json") — match either form.
    function getScreenFile(stored, screenPath) {
      if (!stored || !stored.files || !screenPath) return null;
      const clean = screenPath.replace(/^\\//, '');
      const candidates = [clean, clean + '.json', screenPath, screenPath + '.json'];
      for (const k of candidates) {
        if (stored.files[k] != null) return stored.files[k];
      }
      // Fallback: substring match on the leaf
      const leaf = clean.split('/').pop();
      const found = Object.entries(stored.files).find(([k]) => k.endsWith(leaf) || k.endsWith(leaf + '.json'));
      return found ? found[1] : null;
    }

    function getManifestFile(stored) {
      if (!stored || !stored.files) return null;
      const entries = Object.entries(stored.files);
      const direct = entries.find(([, v]) => v && typeof v === 'object' && v.metadata && v.data && Array.isArray(v.data.screens));
      if (direct) return direct[1];
      const named = entries.find(([k]) => /manifest/i.test(k));
      return named ? named[1] : null;
    }

    function StatusBar() {
      const [time] = useState(() => {
        const d = new Date();
        return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      });
      return html\`
        <div class="statusbar">
          <span>\${time}</span>
          <div class="right">
            <span>•••</span>
            <svg viewBox="0 0 16 11" fill="currentColor"><path d="M0 8h2v3H0zM4 5h2v6H4zM8 2h2v9H8zM12 0h2v11h-2z"/></svg>
            <span>66</span>
          </div>
        </div>\`;
    }

    function HomeBar() { return html\`<div class="home-bar"></div>\`; }

    // Render a screen as a banking-app-style mockup. The data is whatever
    // came back from the json converter, which is shaped \`{ metadata, data }\`.
    function ScreenContent({ json, manifest }) {
      if (!json) return html\`<div class="empty">No screen data — pick a screen above.</div>\`;
      const data = json.data ?? json;
      const meta = json.metadata ?? {};
      const title = data?.title ?? meta?.title ?? meta?.schemaName ?? 'Screen';
      const userName = data?.userName ?? data?.user ?? data?.greeting ?? 'Mr JOHN SMITH';
      const accounts = pickArray(data, ['accounts', 'cards']);
      const promos = pickArray(data, ['promos', 'banners', 'offers']);
      const widgets = pickArray(data, ['widgets', 'shortcuts', 'actions', 'tiles']);
      const featured = data?.featured ?? data?.highlight ?? null;
      const known = new Set(['accounts', 'cards', 'promos', 'banners', 'offers', 'widgets', 'shortcuts', 'actions', 'tiles', 'featured', 'highlight', 'title', 'userName', 'user', 'greeting']);
      const extra = (data && typeof data === 'object' && !Array.isArray(data))
        ? Object.entries(data).filter(([k, v]) => !known.has(k) && v != null && (typeof v !== 'object' || Object.keys(v).length))
        : [];

      return html\`
        <\${StatusBar} />
        <div class="app-header">
          <div class="row">
            <div class="user">
              <div class="avatar">N</div>
              <span>\${userName}</span>
            </div>
            <div class="icons"><div class="ico">🔔</div><div class="ico">💬</div></div>
          </div>
          <h1>\${title}</h1>
        </div>
        \${accounts.length ? accounts.map((a) => html\`
          <div class="green-card">
            <div>
              <div class="label">\${a.label ?? a.type ?? a.subtitle ?? 'Account'}</div>
              <div class="value">\${a.name ?? a.title ?? a.balance ?? ''}</div>
            </div>
            <div class="chev">›</div>
          </div>\`) : null}
        \${promos.length ? promos.map((p) => html\`
          <div class="green-card">
            <div>
              <div class="label">\${p.label ?? p.eyebrow ?? p.kicker ?? ''}</div>
              <div class="value">\${p.title ?? p.name ?? ''}</div>
            </div>
            <div class="cta">\${p.cta ?? p.action ?? 'Apply'}</div>
          </div>\`) : null}
        \${(promos.length || accounts.length) ? html\`
          <div class="dots">
            <span class="arrow">‹</span>
            \${Array.from({ length: 7 }).map((_, i) => html\`<span class="dot \${i === 1 ? 'active' : ''}"></span>\`)}
            <span class="arrow">›</span>
          </div>\` : null}
        <div class="white-zone">
          \${featured ? html\`
            <div class="featured">
              <div class="badge">R</div>
              <div class="text">
                <div class="lead">\${featured.eyebrow ?? featured.kicker ?? 'Featured'}</div>
                <div class="body">\${featured.title ?? featured.text ?? featured.body ?? ''}</div>
              </div>
            </div>\` : null}
          \${widgets.length ? html\`
            <div class="section-title">My widgets</div>
            <div class="widgets">
              \${widgets.map((w) => html\`
                <div class="widget">
                  <div class="ico">\${w.icon ?? '✦'}</div>
                  <div class="name">\${w.name ?? w.label ?? w.title ?? ''}</div>
                </div>\`)}
            </div>\` : null}
          \${extra.length ? html\`
            <div class="section-title">More</div>
            \${extra.map(([k, v]) => html\`
              <div class="kv-card">
                <div class="k">\${k}</div>
                <div class="v">\${formatValue(v)}</div>
              </div>\`)}
          \` : null}
          \${(!accounts.length && !promos.length && !widgets.length && !featured && !extra.length) ? html\`
            <pre class="raw-json">\${JSON.stringify(data, null, 2)}</pre>\` : null}
        </div>\`;
    }

    function pickArray(data, keys) {
      if (!data || typeof data !== 'object') return [];
      for (const k of keys) {
        const v = data[k];
        if (Array.isArray(v) && v.length) return v.map((item) => (typeof item === 'object' && item ? item : { name: String(item) }));
      }
      return [];
    }

    function formatValue(v) {
      if (v == null) return '';
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
      return html\`<pre class="raw-json">\${JSON.stringify(v, null, 2)}</pre>\`;
    }

    function TabBar({ screens, activePath, onSelect }) {
      if (!screens || !screens.length) return null;
      const tabs = screens.slice(0, 5);
      return html\`
        <div class="tabbar">
          \${tabs.map((s) => {
            const id = s.id ?? s.path ?? '';
            const active = (s.path ?? '') === activePath;
            return html\`
              <div class="tab \${active ? 'active' : ''}" onClick=\${() => onSelect(s.path)}>
                <div class="ico">\${tabIcon(id)}</div>
                <div class="name">\${humanize(s.id ?? s.path ?? '')}</div>
              </div>\`;
          })}
        </div>\`;
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
      return leaf.replace(/[-_]/g, ' ').replace(/^\\w/, (c) => c.toUpperCase());
    }

    function App() {
      const initialPath = '/preview/cpilsworth/nedp/digi2/manifest';
      const [path, setPath] = useState(initialPath);
      const [pathInput, setPathInput] = useState(initialPath);
      const [stored, setStored] = useState(() => loadStored(initialPath));
      const [activeScreen, setActiveScreen] = useState(null);
      const [tick, setTick] = useState(0);

      useEffect(() => { setStored(loadStored(path)); }, [path, tick]);

      // React to changes in localStorage made by the manifest viewer in another tab
      useEffect(() => {
        const handler = (e) => {
          if (!e.key || e.key === storageKey(path)) setTick((t) => t + 1);
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
      }, [path]);

      const manifest = useMemo(() => getManifestFile(stored), [stored]);
      const screens = manifest?.data?.screens ?? [];

      const currentScreenPath = activeScreen ?? screens[0]?.path ?? null;
      const screenJson = useMemo(
        () => (currentScreenPath ? getScreenFile(stored, currentScreenPath) : null),
        [stored, currentScreenPath],
      );

      const status = !stored
        ? { text: 'No data in localStorage for this path. Use the manifest viewer to fetch first.', kind: 'warn' }
        : !manifest
          ? { text: 'Bundle loaded but no manifest file detected.', kind: 'warn' }
          : !screenJson
            ? { text: 'Manifest loaded — pick a screen.', kind: '' }
            : { text: \`Showing \${currentScreenPath} · \${screens.length} screen(s) in manifest\`, kind: 'ok' };

      const onApply = useCallback(() => {
        setPath(pathInput.trim());
        setActiveScreen(null);
      }, [pathInput]);

      return html\`
        <div class="topbar">
          <input type="text" value=\${pathInput} onInput=\${(e) => setPathInput(e.target.value)}
            onKeyDown=\${(e) => { if (e.key === 'Enter') onApply(); }} />
          <button onClick=\${onApply}>Load</button>
          <button onClick=\${() => setTick((t) => t + 1)}>Refresh</button>
          \${screens.length ? html\`
            <select value=\${currentScreenPath ?? ''}
              onChange=\${(e) => setActiveScreen(e.target.value)}>
              \${screens.map((s) => html\`<option value=\${s.path}>\${humanize(s.id ?? s.path)}</option>\`)}
            </select>\` : null}
          <span class="status \${status.kind}">\${status.text}</span>
        </div>
        <div class="stage">
          <div class="phone">
            <div class="phone-screen">
              <div class="notch"></div>
              <div class="screen-body">
                <\${ScreenContent} json=\${screenJson} manifest=\${manifest} />
              </div>
              <\${TabBar} screens=\${screens} activePath=\${currentScreenPath}
                onSelect=\${(p) => setActiveScreen(p)} />
              <\${HomeBar} />
            </div>
          </div>
          \${screenJson ? html\`
            <div class="json-panel">
              <h3>Source JSON</h3>
              <pre>\${JSON.stringify(screenJson, null, 2)}</pre>
            </div>\` : null}
        </div>\`;
    }

    render(h(App), document.getElementById('app'));
  </script>
</body>
</html>`;
