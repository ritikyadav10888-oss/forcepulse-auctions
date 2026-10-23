import { useEffect, useRef } from 'react';

// Key for the team at each position: 1-9, then 0 for the 10th team
export const teamKey = (index) => (index < 9 ? String(index + 1) : index === 9 ? '0' : null);

// Auction desk keys, ignored while typing in a box:
// 1-9 / 0 bid for that team, + or Up raises the bid amount, - or Down lowers it, Backspace or Ctrl+Z undoes the last bid
export const useTeamBidKeys = (teams, handlers) => {
  // Read the latest teams and handlers on each key press without re-binding the listener
  const latest = useRef({ teams, handlers });
  latest.current = { teams, handlers };

  useEffect(() => {
    const onKey = (e) => {
      const typing = e.target.closest?.('input, textarea, select, [contenteditable="true"]');
      if (typing) return;
      const { onBid, onUndo, onRaise, onLower } = latest.current.handlers;
      // Holding + or - keeps stepping the amount; every other key acts once per press
      const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
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
        return;
      }
      if (!plain || !/^[0-9]$/.test(e.key)) return;
      const index = e.key === '0' ? 9 : Number(e.key) - 1;
      const team = latest.current.teams[index];
      if (!team) return;
      e.preventDefault();
      onBid(team);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
};
