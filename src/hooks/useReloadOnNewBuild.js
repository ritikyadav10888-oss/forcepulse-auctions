import { useEffect } from 'react';

const CHECK_MS = 60 * 1000;

// After a deploy every open page (host screens, Live Screen, public pages) reloads itself onto the new version.
// It waits until nobody is typing in a box, so an amount or a name being entered is never lost.
export const useReloadOnNewBuild = () => {
  useEffect(() => {
    let first = null;
    let pending = false;
    const typing = () => !!document.activeElement?.closest?.('input, textarea, select, [contenteditable="true"]');
    const reloadWhenIdle = () => {
      if (!typing()) window.location.reload();
      else pending = true;
    };
    const check = async () => {
      try {
        const { build } = await (await fetch('/api/health', { cache: 'no-store' })).json();
        if (!build) return;
        if (first === null) first = build;
        else if (build !== first) reloadWhenIdle();
      } catch {}
    };
    const onBlur = () => { if (pending) setTimeout(reloadWhenIdle, 300); };
    check();
    const timer = setInterval(check, CHECK_MS);
    document.addEventListener('focusout', onBlur);
    return () => { clearInterval(timer); document.removeEventListener('focusout', onBlur); };
  }, []);
};
