// Browser side of the server sync: API calls, saving record changes, and the live Socket.IO feed.
import { io } from 'socket.io-client';

// Identifies this tab, so it can ignore the echo of its own changes
export const clientId = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const api = async (url, { method = 'GET', body, headers = {} } = {}) => {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body instanceof FormData ? headers : { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong. Please try again.'), { status: res.status });
  return data;
};

// ---------- Record changes ----------
// What changed between two versions of a collection: arrays of records with ids, or the live map keyed by auction id
export const diffCollection = (prev, next, isMap = false) => {
  const upserts = [];
  const deletes = [];
  if (isMap) {
    for (const [id, value] of Object.entries(next)) if (prev[id] !== value) upserts.push({ ...value, id });
    for (const id of Object.keys(prev)) if (!(id in next)) deletes.push(id);
  } else {
    const before = new Map(prev.map(r => [r.id, r]));
    const after = new Set();
    for (const r of next) {
      after.add(r.id);
      if (before.get(r.id) !== r) upserts.push(r);
    }
    for (const r of prev) if (!after.has(r.id)) deletes.push(r.id);
  }
  return { upserts, deletes };
};

// Changes go to the server in order, one request at a time. Everything made while a request is on its way
// goes together in the next one, so fast bidding never builds a queue of requests that screens lag behind.
let pending = [];
let sending = false;
let scheduled = false;
let onSaveError = () => {};
export const setSaveErrorHandler = (fn) => { onSaveError = fn; };

export const queueChange = (collection, upserts, deletes) => {
  if (!upserts.length && !deletes.length) return;
  pending.push({ collection, upserts, deletes });
  if (!sending && !scheduled) {
    scheduled = true;
    queueMicrotask(flush);
  }
};

const flush = async () => {
  scheduled = false;
  if (sending || pending.length === 0) return;
  const changes = pending;
  pending = [];
  sending = true;
  try {
    await api('/api/sync', { method: 'POST', body: { changes }, headers: { 'x-client-id': clientId } });
  } catch (err) {
    onSaveError(err);
  } finally {
    sending = false;
    if (pending.length) flush();
  }
};

// ---------- Live feed ----------
let socket = null;
const watched = new Set();

// New version deployed while this page was open: screens (?screen=...) keep all their state on the server, so they
// simply reload; other pages may hold an unsaved form, so they get a bar with a Reload button instead.
let loadedVersion = null;
const onVersion = (v) => {
  if (!loadedVersion) { loadedVersion = v; return; }
  if (v === loadedVersion || typeof window === 'undefined') return;
  loadedVersion = v;
  if (new URLSearchParams(window.location.search).has('screen')) {
    setTimeout(() => window.location.reload(), 1500 + Math.random() * 2000);
    return;
  }
  if (document.getElementById('fp-new-version')) return;
  const bar = document.createElement('div');
  bar.id = 'fp-new-version';
  bar.setAttribute('role', 'status');
  bar.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9999;display:flex;gap:12px;align-items:center;padding:10px 14px;border-radius:12px;background:#0f172a;color:#fff;font:600 14px system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)';
  bar.textContent = 'A new version of Force Pulse is ready.';
  const btn = document.createElement('button');
  btn.textContent = 'Reload';
  btn.style.cssText = 'padding:6px 12px;border-radius:8px;background:#ffb000;color:#0f172a;font-weight:800;border:0;cursor:pointer';
  btn.onclick = () => window.location.reload();
  bar.appendChild(btn);
  document.body.appendChild(bar);
};
export const connectLive = ({ onSync, onRegistrations, onReconnect }) => {
  socket?.disconnect();
  socket = io({ withCredentials: true });
  socket.on('connect', () => {
    if (watched.size) socket.emit('watch', [...watched]);
  });
  socket.io.on('reconnect', () => onReconnect?.());
  socket.on('sync', (msg) => { if (msg.origin !== clientId) onSync(msg); });
  socket.on('registrations', (msg) => onRegistrations?.(msg));
  socket.on('version', onVersion);
  return () => { socket?.disconnect(); socket = null; };
};

// Follow live changes for these auctions
export const watchAuctions = (ids) => {
  const fresh = ids.filter(id => id && !watched.has(id));
  if (!fresh.length) return;
  fresh.forEach(id => watched.add(id));
  socket?.connected && socket.emit('watch', fresh);
};
