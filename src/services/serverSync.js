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

// Changes made in one tick go to the server together, one request at a time, in order
let pending = [];
let chain = Promise.resolve();
let onSaveError = () => {};
export const setSaveErrorHandler = (fn) => { onSaveError = fn; };

export const queueChange = (collection, upserts, deletes) => {
  if (!upserts.length && !deletes.length) return;
  if (pending.length === 0) queueMicrotask(flush);
  pending.push({ collection, upserts, deletes });
};

const flush = () => {
  const changes = pending;
  pending = [];
  chain = chain
    .then(() => api('/api/sync', { method: 'POST', body: { changes }, headers: { 'x-client-id': clientId } }))
    .catch(err => onSaveError(err));
};

// ---------- Live feed ----------
let socket = null;
const watched = new Set();
export const connectLive = ({ onSync, onRegistrations, onReconnect }) => {
  socket?.disconnect();
  socket = io({ withCredentials: true });
  socket.on('connect', () => {
    if (watched.size) socket.emit('watch', [...watched]);
  });
  socket.io.on('reconnect', () => onReconnect?.());
  socket.on('sync', (msg) => { if (msg.origin !== clientId) onSync(msg); });
  socket.on('registrations', (msg) => onRegistrations?.(msg));
  return () => { socket?.disconnect(); socket = null; };
};

// Follow live changes for these auctions
export const watchAuctions = (ids) => {
  const fresh = ids.filter(id => id && !watched.has(id));
  if (!fresh.length) return;
  fresh.forEach(id => watched.add(id));
  socket?.connected && socket.emit('watch', fresh);
};
