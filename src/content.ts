/**
 * Content script — runs at document_start on the supported sites.
 *
 * The theming lives in the injected CSS; this script reflects the saved
 * settings onto <html> as data-ef-* attributes, honouring both the master
 * switch and the per-site toggle, and keeps them in sync when the popup changes.
 *
 * Bilibili extra: its comment list renders inside (nested, open) shadow roots.
 * Our token remap reaches most of it — CSS custom properties inherit across the
 * shadow boundary — but the comment "tag" badges ("UP主觉得很赞", pinned, …)
 * hardcode their own light/dark source vars *inside* the shadow, which a
 * page-level stylesheet can neither select nor override. So while the theme is
 * on we inject a tiny override into each comment shadow root, written against
 * the inherited Everforest tokens so it stays light/dark-correct on its own.
 */

import { loadSettings, onSettingsChanged, siteForHost, type Settings } from "./settings";

const root = document.documentElement;
const site = siteForHost(location.hostname);

function apply(s: Settings): void {
  const on = s.enabled && (site ? s.sites[site] !== false : true);
  if (on) root.removeAttribute("data-ef");
  else root.setAttribute("data-ef", "off");

  if (s.mode === "sync") root.removeAttribute("data-ef-mode");
  else root.setAttribute("data-ef-mode", s.mode);

  if (s.contrast === "medium") root.removeAttribute("data-ef-contrast");
  else root.setAttribute("data-ef-contrast", s.contrast);

  if (site === "bilibili") syncBiliShadows(on);
}

// ── Bilibili comment shadow-DOM theming ─────────────────────────────────────
const SHADOW_STYLE_ID = "ef-shadow";
const SHADOW_CSS =
  ".tag{background:var(--bg2)!important;color:var(--text3)!important;" +
  "border-color:var(--line_regular)!important;}";

const rootObservers = new Map<ShadowRoot, MutationObserver>();
let active = false;
let scanQueued = false;
let docObserver: MutationObserver | null = null;

function injectInto(r: ShadowRoot): void {
  if (r.getElementById(SHADOW_STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = SHADOW_STYLE_ID;
  s.textContent = SHADOW_CSS;
  r.appendChild(s);
}

/** Walk every (nested) open shadow root: inject the override and observe it so
 *  lazily-loaded / paginated comments get themed too. */
function scan(node: Document | ShadowRoot): void {
  node.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const sr = el.shadowRoot;
    if (!sr) return;
    injectInto(sr);
    if (!rootObservers.has(sr)) {
      // mutations don't cross a shadow boundary, so each root needs its own
      // observer to notice new comments appended inside it. Tracked in a map so
      // they can all be disconnected when the theme is switched off.
      const mo = new MutationObserver(queueScan);
      mo.observe(sr, { childList: true, subtree: true });
      rootObservers.set(sr, mo);
    }
    scan(sr);
  });
}

function queueScan(): void {
  if (!active || scanQueued) return;
  scanQueued = true;
  setTimeout(() => {
    scanQueued = false;
    if (active) scan(document);
  }, 300);
}

function removeAll(node: Document | ShadowRoot): void {
  node.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const sr = el.shadowRoot;
    if (!sr) return;
    sr.getElementById(SHADOW_STYLE_ID)?.remove();
    removeAll(sr);
  });
}

function syncBiliShadows(on: boolean): void {
  if (on) {
    active = true;
    scan(document);
    if (!docObserver) {
      docObserver = new MutationObserver(queueScan);
      docObserver.observe(root, { childList: true, subtree: true });
    }
  } else if (active) {
    active = false;
    docObserver?.disconnect();
    docObserver = null;
    rootObservers.forEach((mo) => mo.disconnect());
    rootObservers.clear();
    removeAll(document);
  }
}

loadSettings().then(apply);
onSettingsChanged(apply);
