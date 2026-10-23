import React, { useEffect, useState } from 'react';

// Amount box with a Lakh / Cr switch. The value going in and out is always in crore (0.02 = 2 Lakh),
// so forms keep storing crore; only what the organiser types changes with the unit.
const UNITS = { Lakh: 100, Cr: 1 };
const shownIn = (cr, unit) => (cr === '' || cr == null || Number.isNaN(Number(cr)) ? '' : String(Math.round(Number(cr) * UNITS[unit] * 10000) / 10000));

export const MoneyInput = ({ value, onChange, className = '', inputClassName = '', label, ...rest }) => {
  // Below a crore starts in Lakh, so "2 Lakh" is typed as 2, not 0.02
  const [unit, setUnit] = useState(() => (Number(value) > 0 && Number(value) < 1 ? 'Lakh' : 'Cr'));
  const [text, setText] = useState(() => shownIn(value, unit));

  // Follow changes made outside the box (picking a category, "Use it", resetting the form)
  useEffect(() => {
    const typed = text === '' ? '' : Number(text) / UNITS[unit];
    if (value === '' || value == null ? text !== '' : Math.abs(Number(value) - typed) > 1e-9) setText(shownIn(value, unit));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const type = (e) => {
    setText(e.target.value);
    onChange(e.target.value === '' ? '' : Math.round((Number(e.target.value) / UNITS[unit]) * 10000) / 10000);
  };
  const switchUnit = (next) => {
    setUnit(next);
    setText(shownIn(value, next));
  };

  return (
    <div className={`flex items-stretch gap-1.5 ${className}`}>
      <input type="number" min="0" step="any" value={text} onChange={type} aria-label={label} className={`min-w-0 flex-1 ${inputClassName}`} {...rest} />
      <div className="inline-flex shrink-0 rounded-xl border border-slate-200 bg-slate-100 p-0.5" role="group" aria-label={`${label || 'Amount'} unit`}>
        {Object.keys(UNITS).map(u => (
          <button
            key={u}
            type="button"
            onClick={() => switchUnit(u)}
            aria-pressed={unit === u}
            disabled={rest.disabled}
            className={`rounded-lg px-2.5 text-xs font-bold ${unit === u ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}
          >
            {u}
          </button>
        ))}
      </div>
    </div>
  );
};
