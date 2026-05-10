# da-sc — Document Authoring Screen Content

A Cloudflare Worker that bundles a Document Authoring **manifest** plus its referenced **screen JSON** documents into a single zip archive, with HTTP conditional-fetch semantics for cheap update checks.

It also serves a small, build-step-free client app that previews those bundles as an iOS-style mobile app, exposed as a drop-in `<mobile-app-preview>` Web Component plus a `ManifestBundle` JS API.

```
┌──────────────┐   GET /tier/org/site/path/to/manifest    ┌─────────────────────┐
│  Browser     │ ────────────────────────────────────────▶│  da-sc-zip Worker   │
│              │                                          │                     │
│  ManifestBundle ◀── zip stream + Last-Modified ─────────│  fetches manifest,  │
│  ▼                                                      │  fans out to each   │
│  <mobile-app-preview>                                   │  screen, zips it    │
└──────────────┘                                          └─────────────────────┘
                                                                    │
                                                                    ▼
                                                          ┌──────────────────┐
                                                          │  DA backend      │
                                                          │  (DA_SC_BASE_URL)│
                                                          └──────────────────┘
```

## What lives where

```
da-sc/
├── src/                   # TypeScript worker (build with wrangler)
│   └── zip-worker.ts      # the only worker entry point
├── public/                # Static client assets — no build step
│   ├── index.html         # Default page: topbar + preview + JSON panel
│   ├── components/
│   │   └── mobile-app-preview.js   # <mobile-app-preview> Web Component
│   └── lib/
│       └── manifest-bundle.js      # ManifestBundle API
├── schema/                # JSON Schemas for manifest + page documents
├── test/                  # Vitest worker tests (uses Cloudflare workers pool)
└── wrangler.toml          # Worker + [assets] config
```

The worker is TypeScript and runs through `wrangler` (`build`/`dev`/`deploy`). The client modules under `public/` are plain ES modules served as-is by the Workers Assets binding — **no bundler, no transpile step**.

## How the worker works

### Endpoint

```
GET /<tier>/<org>/<site>/<path/to/manifest>[?since=<ISO timestamp>]
```

* Fetches the manifest JSON from `${DA_SC_BASE_URL}/<tier>/<org>/<site>/<path/to/manifest>`.
* Reads `manifest.data.screens[]` and fetches every referenced screen in parallel.
* Forwards `If-Modified-Since` (and the optional `?since=` upper bound) to each screen request, so unchanged screens come back as `304` and don't re-stream their bodies.
* Streams a zip back containing `<manifestName>.json` plus one `<screen-path>.json` per screen.
* Sets `Last-Modified` on the response to the latest mtime across the manifest and all screens, so the client can revalidate cheaply.
* Honours `If-Modified-Since` from the client, returning `304 Not Modified` when nothing in the bundle changed.
* Supports `HEAD` for update probing without transferring the zip body.

### Static UI

`/` (and any other URL matching a file in `public/`) is served by Cloudflare Workers Assets directly — the worker `fetch` handler is never invoked. Worker code only runs for the manifest-zip route.

## Local dev / deploy

```bash
cd da-sc
npm install
npm run dev          # wrangler dev — serves worker + assets at http://localhost:8787
npm test             # vitest, uses @cloudflare/vitest-pool-workers
npm run deploy       # wrangler deploy -e production
```

`DA_SC_BASE_URL` is set per environment in `wrangler.toml`.

---

## Client API: `ManifestBundle`

`public/lib/manifest-bundle.js` is the only thing the client app needs to think about. It hides:

* **Storage** — bundles cached in `localStorage` under `manifest-bundle:<path>`.
* **Zip handling** — fflate is loaded lazily from a CDN on the first fetch.
* **Conditional revalidation** — `Last-Modified` / `If-Modified-Since` plumbing.
* **Cross-tab sync** — listens for `storage` events so multiple windows stay coherent.

### Surface

```js
import ManifestBundle from '/lib/manifest-bundle.js';

const bundle = new ManifestBundle('/preview/cpilsworth/nedp/digi2/manifest');

// Reads (synchronous; serve from in-memory cache of the localStorage entry)
bundle.getManifest();          // → { metadata, data: { screens: [...] } } | null
bundle.getScreens();           // → [{ id, path, lastModified, ... }, ...]
bundle.getScreen('digi2/home');// → that screen's JSON | null
bundle.getMeta();              // → { lastModified, fetchedAt, fileCount } | null
bundle.load();                 // → re-read from localStorage

// Network actions
await bundle.fetch();          // GET zip, store, return data (sends If-Modified-Since)
await bundle.checkForUpdates();// HEAD → boolean
await bundle.refresh();        // checkForUpdates → fetch if stale; returns boolean

bundle.clear();                // drop the cache entry
bundle.path = '/other/path';   // re-point and re-read

// Events
bundle.addEventListener('change', (e) => console.log(e.detail.reason));
bundle.addEventListener('error',  (e) => console.error(e.detail.error));
```

`change` fires on `fetch` / `refresh` / `clear` / `path-changed`, and also on `storage` events from other tabs that touch the same key.

### Example: poll for updates

```js
const bundle = new ManifestBundle('/preview/cpilsworth/nedp/digi2/manifest');

// Show whatever is already cached, then revalidate
const initial = bundle.load();
render(initial);

bundle.addEventListener('change', () => render(bundle.load()));

// Cheap revalidation every 30s — only fetches if the worker says something moved
setInterval(() => bundle.refresh().catch(() => {}), 30_000);
```

---

## Web Component: `<mobile-app-preview>`

`public/components/mobile-app-preview.js` is a self-contained Custom Element that renders a `ManifestBundle` as a phone-shaped mockup. It uses Shadow DOM, so its styles never leak; rendering is done with Preact + htm loaded directly from `esm.sh`.

The component is a **reader only** — fetching is the host page's job. Drive it via `preview.bundle.fetch()` / `.refresh()` etc.

### Attributes

| Attribute  | Purpose                                                        |
|------------|----------------------------------------------------------------|
| `path`     | Manifest path/URL. Required to do anything.                    |
| `screen`   | Optional. The active screen path. Defaults to the first one.   |

### Properties (read-only)

| Property             | Returns                                                      |
|----------------------|--------------------------------------------------------------|
| `bundle`             | The underlying `ManifestBundle` instance.                    |
| `manifest`           | The parsed manifest object, or `null`.                       |
| `screens`            | The screens array, or `[]`.                                  |
| `currentScreen`      | The JSON for the active screen, or `null`.                   |
| `currentScreenPath`  | The active screen's path string, or `null`.                  |

### Methods

* `selectScreen(path)` — change the active screen and rerender.

### Events (bubble + composed)

* `bundle-change` — `detail: { manifest, screen }` — fires after every render.
* `screen-change` — `detail: { path }` — fires when `selectScreen` is called.

### Drop-in usage

```html
<script type="module" src="/components/mobile-app-preview.js"></script>

<mobile-app-preview
  id="preview"
  path="/preview/cpilsworth/nedp/digi2/manifest">
</mobile-app-preview>

<script type="module">
  const preview = document.getElementById('preview');

  // Kick off the first fetch — component just renders whatever lands in cache
  preview.bundle.fetch().catch(console.error);

  // Refresh button
  document.getElementById('refresh').addEventListener('click', () => {
    preview.bundle.refresh();
  });

  // React to data updates
  preview.addEventListener('bundle-change', (e) => {
    console.log('manifest screens:', e.detail.manifest?.data?.screens?.length);
  });
</script>
```

### Polling for live previews

```html
<mobile-app-preview id="p" path="/preview/cpilsworth/nedp/digi2/manifest"></mobile-app-preview>

<script type="module">
  import '/components/mobile-app-preview.js';

  const p = document.getElementById('p');
  await p.bundle.fetch();
  setInterval(() => p.bundle.refresh().catch(() => {}), 15_000);
</script>
```

### Switching screens programmatically

```js
preview.selectScreen('digi2/accounts');
```

Or set the attribute and let the component pick it up:

```js
preview.setAttribute('screen', 'digi2/accounts');
```

### Two components, one cache

If you mount two `<mobile-app-preview>` elements with the same `path`, they share the underlying `localStorage` entry. A `fetch()` on one will rerender the other automatically through the storage event — no extra wiring needed.

---

## Manifest shape

```json
{
  "metadata": { "schemaName": "manifest", "title": "..." },
  "data": {
    "screens": [
      { "id": "home",     "path": "digi2/home" },
      { "id": "accounts", "path": "digi2/accounts" }
    ]
  }
}
```

The worker enriches each screen entry with the `lastModified` it observed when fetching, and stamps the manifest itself with the latest mtime across the bundle. See `schema/manifest.schema.json` and `schema/page.schema.json` for the full shapes.

## Caching contract at a glance

| Layer            | Validator                | Where                                               |
|------------------|--------------------------|-----------------------------------------------------|
| Browser → Worker | `If-Modified-Since`      | `bundle.fetch()` / `bundle.refresh()`               |
| Worker → DA      | `If-Modified-Since`      | per-screen and manifest fetches                     |
| Worker response  | `Last-Modified`          | latest mtime across manifest + all screens          |
| Browser cache    | `localStorage`           | `manifest-bundle:<path>` JSON blob (zip unpacked)   |
