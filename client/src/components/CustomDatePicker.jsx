import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  addDigitToSegments,
  DATE_RULES,
  formatDateToYYYYMMDD,
  formatIsoToDisplay,
  getSegmentFromCursor,
  isoToSegments,
  removeDigitFromSegment,
  sanitizePastedDate,
  segmentsToDisplay,
  segmentsToIso,
  validateDateByRule,
  getDobYearBounds,
} from '../utils/dateInput';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// ── Calendar popup ─────────────────────────────────────────────────────────────
const CalendarPopup = ({ value, onChange, onClose, resolvedMin, resolvedMax, validationRule }) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const selected = value ? new Date(value + 'T00:00:00') : null;

  const getEffectiveMax = () => {
    if (validationRule === DATE_RULES.DOB) {
      const { maxYear } = getDobYearBounds();
      const d = new Date(today); d.setFullYear(maxYear); return d;
    }
    return resolvedMax ? new Date(resolvedMax + 'T00:00:00') : null;
  };
  const getEffectiveMin = () => {
    if (validationRule === DATE_RULES.DOB) {
      const { minYear } = getDobYearBounds();
      const d = new Date(today); d.setFullYear(minYear); return d;
    }
    return resolvedMin ? new Date(resolvedMin + 'T00:00:00') : null;
  };

  const effectiveMax = getEffectiveMax();
  const effectiveMin = getEffectiveMin();

  const initDate = selected || (validationRule === DATE_RULES.DOB ? effectiveMax : null) || today;
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [view, setView] = useState('days'); // 'days' | 'months' | 'years'

  // Year range for year picker
  const minY = effectiveMin ? effectiveMin.getFullYear() : today.getFullYear() - 100;
  const maxY = effectiveMax ? effectiveMax.getFullYear() : today.getFullYear() + 10;
  const yearRangeStart = Math.max(minY, viewYear - 6);
  const yearRangeEnd   = Math.min(maxY, yearRangeStart + 11);
  const years = Array.from({ length: yearRangeEnd - yearRangeStart + 1 }, (_, i) => yearRangeStart + i);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const canGoPrev = !effectiveMin || new Date(viewYear, viewMonth - 1, 1) >= new Date(effectiveMin.getFullYear(), effectiveMin.getMonth(), 1);
  const canGoNext = !effectiveMax || new Date(viewYear, viewMonth + 1, 1) <= new Date(effectiveMax.getFullYear(), effectiveMax.getMonth(), 1);

  // Build day grid
  const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev  = new Date(viewYear, viewMonth, 0).getDate();
  const cells = [];
  for (let i = firstDow - 1; i >= 0; i--)
    cells.push({ d: daysInPrev - i, m: viewMonth === 0 ? 11 : viewMonth - 1, y: viewMonth === 0 ? viewYear - 1 : viewYear, out: true });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ d, m: viewMonth, y: viewYear, out: false });
  while (cells.length < 42)
    cells.push({ d: cells.length - firstDow - daysInMonth + 1, m: viewMonth === 11 ? 0 : viewMonth + 1, y: viewMonth === 11 ? viewYear + 1 : viewYear, out: true });

  const same = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const isDisabled = (date) => (effectiveMin && date < effectiveMin) || (effectiveMax && date > effectiveMax);
  const toIso = ({ d, m, y }) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const select = (cell) => {
    const date = new Date(cell.y, cell.m, cell.d);
    if (isDisabled(date)) return;
    onChange(toIso(cell)); onClose();
  };
  const selectToday = () => {
    if (!isDisabled(today)) {
      onChange(toIso({ d: today.getDate(), m: today.getMonth(), y: today.getFullYear() })); onClose();
    }
  };

  // ── Year picker ─────────────────────────────────────────────────────────────
  if (view === 'years') {
    const canPrevYears = yearRangeStart > minY;
    const canNextYears = yearRangeEnd < maxY;
    return (
      <div className="absolute z-50 top-full left-0 mt-1 bg-surface-secondary border border-border rounded-xl shadow-2xl p-3 select-none" style={{ width: 272 }} onMouseDown={e => e.preventDefault()}>
        <div className="flex items-center justify-between mb-2">
          <button type="button" onClick={() => setViewYear(y => Math.max(minY, y - 12))} disabled={!canPrevYears}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-hover text-text-secondary hover:text-primary transition-colors text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed">‹</button>
          <span className="text-text-primary font-semibold text-sm">{yearRangeStart} – {yearRangeEnd}</span>
          <button type="button" onClick={() => setViewYear(y => Math.min(maxY, y + 12))} disabled={!canNextYears}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-hover text-text-secondary hover:text-primary transition-colors text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed">›</button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {years.map(yr => (
            <button key={yr} type="button"
              onClick={() => { setViewYear(yr); setView('months'); }}
              className={['py-2 rounded-lg text-sm transition-colors font-medium',
                yr === viewYear ? 'bg-primary text-black font-bold' : 'text-text-primary hover:bg-primary/20',
                (yr < minY || yr > maxY) ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}>
              {yr}
            </button>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-border flex justify-center">
          <button type="button" onClick={() => setView('days')} className="text-xs text-primary hover:underline font-medium">Back</button>
        </div>
      </div>
    );
  }

  // ── Month picker ─────────────────────────────────────────────────────────────
  if (view === 'months') {
    return (
      <div className="absolute z-50 top-full left-0 mt-1 bg-surface-secondary border border-border rounded-xl shadow-2xl p-3 select-none" style={{ width: 272 }} onMouseDown={e => e.preventDefault()}>
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={() => setViewYear(y => Math.max(minY, y - 1))} disabled={viewYear <= minY}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-hover text-text-secondary hover:text-primary transition-colors text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed">‹</button>
          <button type="button" onClick={() => setView('years')}
            className="text-text-primary font-bold text-sm hover:text-primary transition-colors">
            {viewYear}
          </button>
          <button type="button" onClick={() => setViewYear(y => Math.min(maxY, y + 1))} disabled={viewYear >= maxY}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-hover text-text-secondary hover:text-primary transition-colors text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed">›</button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((name, idx) => {
            const monthDisabled = (effectiveMax && new Date(viewYear, idx + 1, 0) < effectiveMin) ||
                                  (effectiveMin && new Date(viewYear, idx, 1) > effectiveMax);
            return (
              <button key={name} type="button"
                disabled={monthDisabled}
                onClick={() => { if (!monthDisabled) { setViewMonth(idx); setView('days'); } }}
                className={['py-2 rounded-lg text-xs transition-colors font-medium',
                  idx === viewMonth && viewYear === initDate.getFullYear() ? 'bg-primary text-black font-bold' : 'text-text-primary hover:bg-primary/20',
                  monthDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
                ].join(' ')}>
                {name.slice(0, 3)}
              </button>
            );
          })}
        </div>
        <div className="mt-2 pt-2 border-t border-border flex justify-center">
          <button type="button" onClick={() => setView('days')} className="text-xs text-primary hover:underline font-medium">Back</button>
        </div>
      </div>
    );
  }

  // ── Day view ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="absolute z-50 top-full left-0 mt-1 bg-surface-secondary border border-border rounded-xl shadow-2xl p-3 select-none"
      style={{ width: 272 }}
      onMouseDown={e => e.preventDefault()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={prevMonth} disabled={!canGoPrev}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-hover text-text-secondary hover:text-primary transition-colors text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed">
          ‹
        </button>
        <button type="button" onClick={() => setView('months')}
          className="text-text-primary font-semibold text-sm hover:text-primary transition-colors">
          {MONTHS[viewMonth]}, {viewYear} ▾
        </button>
        <button type="button" onClick={nextMonth} disabled={!canGoNext}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-hover text-text-secondary hover:text-primary transition-colors text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed">
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-text-muted py-0.5">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((cell, i) => {
          const date    = new Date(cell.y, cell.m, cell.d);
          const isToday = same(date, today);
          const isSel   = selected && same(date, selected);
          const isDis   = isDisabled(date);
          return (
            <button
              key={i}
              type="button"
              onClick={() => select(cell)}
              disabled={isDis}
              className={[
                'text-center text-sm py-1 rounded-lg transition-colors leading-none',
                cell.out ? 'text-text-muted/40' : 'text-text-primary',
                isSel  ? 'bg-primary text-black font-bold' : '',
                isToday && !isSel ? 'border border-primary text-primary font-semibold' : '',
                !isSel && !isDis && !cell.out ? 'hover:bg-primary/20' : '',
                isDis ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
              ].filter(Boolean).join(' ')}
            >
              {cell.d}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex justify-between mt-2 pt-2 border-t border-border">
        <button type="button" onClick={() => { onChange(''); onClose(); }}
          className="text-xs text-primary hover:underline font-medium">
          Clear
        </button>
        <button type="button" onClick={selectToday} disabled={isDisabled(today)}
          className="text-xs text-primary hover:underline font-medium disabled:opacity-30 disabled:cursor-not-allowed">
          Today
        </button>
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
const CustomDatePicker = React.forwardRef(({
  value,
  onChange,
  onBlur,
  disabled,
  minDate,
  maxDate,
  min,
  max,
  validationRule = DATE_RULES.DEFAULT,
  onValidationError,
  placeholder = 'DD-MM-YYYY',
  className = '',
  ...rest
}, ref) => {
  const [segments, setSegments] = useState(() => isoToSegments(value));
  const [showCal,  setShowCal]  = useState(false);
  const inputRef = useRef(null);
  const wrapRef  = useRef(null);
  const resolvedMin = formatDateToYYYYMMDD(minDate || min);
  const resolvedMax = formatDateToYYYYMMDD(maxDate || max);

  const setRef = useCallback((node) => {
    inputRef.current = node;
    if (node) {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      if (descriptor && !node.__valueDescriptorDefined) {
        Object.defineProperty(node, 'value', {
          get() {
            const displayVal = descriptor.get.call(this);
            const parts = (displayVal || '').split('-');
            if (parts.length === 3) {
              const [d, m, y] = parts;
              if (d.length === 2 && m.length === 2 && y.length === 4 && /^\d+$/.test(d) && /^\d+$/.test(m) && /^\d+$/.test(y)) {
                return `${y}-${m}-${d}`;
              }
            }
            return displayVal;
          },
          set(val) {
            let nextVal = val;
            const parts = (val || '').split('-');
            if (parts.length === 3) {
              const [y, m, d] = parts;
              if (y.length === 4 && m.length === 2 && d.length === 2 && /^\d+$/.test(y) && /^\d+$/.test(m) && /^\d+$/.test(d)) {
                nextVal = `${d}-${m}-${y}`;
              }
            }
            descriptor.set.call(this, nextVal);
          },
          configurable: true,
        });
        node.__valueDescriptorDefined = true;
      }
    }
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }, [ref]);

  useEffect(() => {
    const currentIso = segmentsToIso(segments);
    const normalizedValue = formatDateToYYYYMMDD(value);
    if (normalizedValue !== currentIso) setSegments(isoToSegments(normalizedValue));
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!showCal) return;
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowCal(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCal]);

  const emitChange = (nextSegments) => {
    const isoValue = segmentsToIso(nextSegments);
    const validationError = isoValue
      ? validateDateByRule(isoValue, validationRule, { minDate: resolvedMin, maxDate: resolvedMax })
      : '';
    if (onValidationError) {
      onValidationError(validationError, isoValue ? formatIsoToDisplay(isoValue) : segmentsToDisplay(nextSegments));
    }
    if (onChange) {
      onChange({ target: { name: rest.name || '', value: isoValue } });
    }
  };

  const updateSegments = (nextSegments, cursorPos) => {
    setSegments(nextSegments);
    emitChange(nextSegments);
    requestAnimationFrame(() => {
      if (inputRef.current && typeof cursorPos === 'number') {
        inputRef.current.setSelectionRange(cursorPos, cursorPos);
      }
    });
  };

  const getNextCursor = (prevSegments, nextSegments) => {
    const display = segmentsToDisplay(nextSegments);
    const cursorPos = inputRef.current?.selectionStart ?? 0;
    if (cursorPos >= 6) {
      if (nextSegments.year.length < 4) return 6 + nextSegments.year.length;
      return display.length;
    }
    if (cursorPos >= 3 && cursorPos <= 5) {
      if (nextSegments.month.length < 2) return 3 + nextSegments.month.length;
      if (nextSegments.year.length < 4) return 6;
      return display.length;
    }
    if (nextSegments.day.length === 1 && prevSegments.day.length === 0) return 1;
    if (nextSegments.day.length === 2 && prevSegments.day.length === 1) return 3;
    if (nextSegments.month.length === 1 && prevSegments.month.length === 0) return 4;
    if (nextSegments.month.length === 2 && prevSegments.month.length === 1) return 6;
    return display.length;
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Escape') { setShowCal(false); return; }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      const cursorPos    = e.currentTarget.selectionStart ?? 0;
      const segment      = getSegmentFromCursor(cursorPos);
      const nextSegments = removeDigitFromSegment(segments, segment);
      const unchanged    = nextSegments.day === segments.day && nextSegments.month === segments.month && nextSegments.year === segments.year;
      if (unchanged) return;
      let nextCursor = cursorPos;
      if (segment === 'day')        nextCursor = Math.min(cursorPos, nextSegments.day.length);
      else if (segment === 'month') nextCursor = Math.max(3, 3 + nextSegments.month.length);
      else                          nextCursor = Math.max(6, 6 + nextSegments.year.length);
      updateSegments(nextSegments, nextCursor);
      return;
    }
    if (e.key.length === 1 && /\d/.test(e.key)) {
      e.preventDefault();
      const cursorPos    = e.currentTarget.selectionStart ?? 0;
      const nextSegments = addDigitToSegments(segments, e.key, cursorPos);
      const unchanged    = nextSegments.day === segments.day && nextSegments.month === segments.month && nextSegments.year === segments.year;
      if (unchanged) return;
      updateSegments(nextSegments, getNextCursor(segments, nextSegments));
      return;
    }
    if (e.key.length === 1 && /\D/.test(e.key)) e.preventDefault();
  };

  const handleChange = () => {
    // Digit entry and deletion are handled in onKeyDown for masked placeholder display.
  };

  const handlePaste = (e) => {
    e.preventDefault();
    if (disabled) return;
    const pasted = sanitizePastedDate(e.clipboardData.getData('text'));
    if (!pasted) return;
    const nextSegments = { day: pasted.day.slice(0, 2), month: pasted.month.slice(0, 2), year: pasted.year.slice(0, 4) };
    updateSegments(nextSegments, segmentsToDisplay(nextSegments).length);
  };

  const handleCalendarChange = (isoValue) => {
    const nextSegments = isoValue ? isoToSegments(isoValue) : { day: '', month: '', year: '' };
    updateSegments(nextSegments, segmentsToDisplay(nextSegments).length);
  };

  const displayValue = segmentsToDisplay(segments);
  const currentIso   = segmentsToIso(segments);

  return (
    <div className="relative w-full" ref={wrapRef}>
      <input
        type="text"
        ref={setRef}
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={(e) => { onBlur?.(e); }}
        onPaste={handlePaste}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={10}
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        className={`${className} pr-12`.trim()}
        {...rest}
      />

      {/* Calendar icon toggle */}
      <div
        className="absolute right-0 top-0 h-full w-11 z-10 cursor-pointer flex items-center justify-center"
        onClick={() => { if (!disabled) setShowCal(v => !v); }}
      >
        <span className="text-text-secondary text-base pointer-events-none">📅</span>
      </div>

      {/* Custom yellow calendar popup */}
      {showCal && !disabled && (
        <CalendarPopup
          value={currentIso}
          onChange={handleCalendarChange}
          onClose={() => setShowCal(false)}
          resolvedMin={resolvedMin}
          resolvedMax={resolvedMax}
          validationRule={validationRule}
        />
      )}
    </div>
  );
});

CustomDatePicker.displayName = 'CustomDatePicker';

export default CustomDatePicker;
