import { useEffect, useState } from 'react';

// useState kept in this browser tab's sessionStorage, so a page refresh comes back to the same dashboard view
// (open auction, tab, edit page). Other tabs and devices keep their own. Storage can be blocked: then it is plain state.
const read = (key, fallback) => {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const clearSessionState = (key) => {
  try { window.sessionStorage.removeItem(key); } catch {}
};

export const useSessionState = (key, fallback) => {
  const [value, setValue] = useState(() => read(key, fallback));
  useEffect(() => {
    try {
      if (value === null || value === undefined) window.sessionStorage.removeItem(key);
      else window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
};
