import { useEffect, useRef } from 'react';

// A team's table number in the hall (set in team settings), so the auctioneer can call "table 5" instead of a
// name; a team without one uses its place in table order (worked out once, in the auction context, as `table`)
export const tableNumber = (team, index) => Number(team?.table) || Number(team?.tableNo) || index + 1;

// Keys typed for a team: its table number (two digits for table 10 and up; 0 alone is also table 10)
export const teamKey = (index, team) => String(tableNumber(team, index));

// How long to wait for a second digit, only when a longer table number starts with the first one
const SECOND_DIGIT_MS = 600;

// Auction desk keys, ignored while typing in a box:
// table number digits bid for that team (Enter bids at once instead of waiting for a second digit, Esc cancels),
// + or Up raises the bid amount, - or Down lowers it, Backspace or Ctrl+Z undoes the last bid.
// handlers.onPending(digits | null) shows what has been typed so far; handlers.onMiss(digits) when no team has that table.
export const useTeamBidKeys = (teams, handlers) => {
  // Read the latest teams and handlers on each key press without re-binding the listener
  const latest = useRef({ teams, handlers });
  latest.current = { teams, handlers };

  useEffect(() => {
    let digits = '';
    let timer = null;
    const setPending = (v) => latest.current.handlers.onPending?.(v);
    const clearPending = () => {
      clearTimeout(timer);
      timer = null;
      if (digits) { digits = ''; setPending(null); }
    };
    const tables = () => latest.current.teams.map((t, i) => tableNumber(t, i));
    const commit = (typed) => {
      clearPending();
      const table = typed === '0' ? 10 : Number(typed);
      const team = latest.current.teams.find((t, i) => tableNumber(t, i) === table);
      if (team) latest.current.handlers.onBid(team);
      else latest.current.handlers.onMiss?.(typed);
    };

    const onKey = (e) => {
      const typing = e.target.closest?.('input, textarea, select, [contenteditable="true"]');
      if (typing) return;
      const { onUndo, onRaise, onLower } = latest.current.handlers;
      // Holding + or - keeps stepping the amount; every other key acts once per press
      const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
      if (plain && digits && e.key === 'Enter') {
        e.preventDefault();
        commit(digits);
        return;
      }
      if (plain && /^[0-9]$/.test(e.key)) {
        if (e.repeat) return;
        e.preventDefault();
        const typed = digits + e.key;
        if (typed === '0') { commit('0'); return; }
        // Wait for another digit only if some table number is longer and starts with what has been typed
        const longer = tables().some(n => String(n).length > typed.length && String(n).startsWith(typed));
        if (!longer) { commit(typed); return; }
        clearTimeout(timer);
        digits = typed;
        setPending(typed);
        timer = setTimeout(() => commit(typed), SECOND_DIGIT_MS);
        return;
      }
      if (digits) clearPending();
      if (plain && (e.key === '+' || e.key === '=' || e.key === 'ArrowUp')) {
        e.preventDefault();
        onRaise?.();
        return;
      }
      if (plain && (e.key === '-' || e.key === 'ArrowDown')) {
        e.preventDefault();
        onLower?.();
        return;
      }
      if (e.repeat) return;
      const undo = e.key === 'Backspace' || ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'z' && !e.shiftKey);
      if (undo) {
        e.preventDefault();
        onUndo?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(timer); window.removeEventListener('keydown', onKey); };
  }, []);
};

// Drag-and-drop props for a tile while the operator arranges tiles: drop a tile on another to move it to that place
export const dragTileProps = (arrange, team) => !arrange?.on ? {} : {
  draggable: true,
  onDragStart: (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', team.id); },
  onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; },
  onDrop: (e) => { e.preventDefault(); const from = e.dataTransfer.getData('text/plain'); if (from && from !== team.id) arrange.move(from, team.id); }
};
