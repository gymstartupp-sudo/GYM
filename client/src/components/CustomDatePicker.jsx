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
} from '../utils/dateInput';

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
  const inputRef = useRef(null);
  const dateInputRef = useRef(null);
  const resolvedMin = minDate || min;
  const resolvedMax = maxDate || max;

  const setRef = useCallback((node) => {
    inputRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }, [ref]);

  useEffect(() => {
    const currentIso = segmentsToIso(segments);
    const normalizedValue = formatDateToYYYYMMDD(value);
    if (normalizedValue !== currentIso) {
      setSegments(isoToSegments(normalizedValue));
    }
  }, [value]);

  const emitChange = (nextSegments) => {
    const isoValue = segmentsToIso(nextSegments);
    const validationError = isoValue
      ? validateDateByRule(isoValue, validationRule, { minDate: resolvedMin, maxDate: resolvedMax })
      : '';

    if (onValidationError) {
      onValidationError(validationError, isoValue ? formatIsoToDisplay(isoValue) : segmentsToDisplay(nextSegments));
    }

    if (onChange) {
      onChange({
        target: {
          name: rest.name || '',
          value: isoValue,
        },
      });
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
      if (nextSegments.year.length < 4) {
        return 6 + nextSegments.year.length;
      }
      return display.length;
    }

    if (cursorPos >= 3 && cursorPos <= 5) {
      if (nextSegments.month.length < 2) {
        return 3 + nextSegments.month.length;
      }
      if (nextSegments.year.length < 4) {
        return 6;
      }
      return display.length;
    }

    if (nextSegments.day.length === 1 && prevSegments.day.length === 0) {
      return 1;
    }
    if (nextSegments.day.length === 2 && prevSegments.day.length === 1) {
      return 3;
    }
    if (nextSegments.month.length === 1 && prevSegments.month.length === 0) {
      return 4;
    }
    if (nextSegments.month.length === 2 && prevSegments.month.length === 1) {
      return 6;
    }

    return display.length;
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();

      const input = e.currentTarget;
      const cursorPos = input.selectionStart ?? 0;
      const segment = getSegmentFromCursor(cursorPos);
      const nextSegments = removeDigitFromSegment(segments, segment);

      const unchanged =
        nextSegments.day === segments.day &&
        nextSegments.month === segments.month &&
        nextSegments.year === segments.year;

      if (unchanged) {
        return;
      }

      let nextCursor = cursorPos;
      if (segment === 'day') {
        nextCursor = Math.min(cursorPos, nextSegments.day.length);
      } else if (segment === 'month') {
        nextCursor = Math.max(3, 3 + nextSegments.month.length);
      } else {
        nextCursor = Math.max(6, 6 + nextSegments.year.length);
      }

      updateSegments(nextSegments, nextCursor);
      return;
    }

    if (e.key.length === 1 && /\d/.test(e.key)) {
      e.preventDefault();
      const cursorPos = e.currentTarget.selectionStart ?? 0;
      const nextSegments = addDigitToSegments(segments, e.key, cursorPos);
      const unchanged =
        nextSegments.day === segments.day &&
        nextSegments.month === segments.month &&
        nextSegments.year === segments.year;
      if (unchanged) return;
      updateSegments(nextSegments, getNextCursor(segments, nextSegments));
      return;
    }

    if (e.key.length === 1 && /\D/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleChange = () => {
    // Digit entry and deletion are handled in onKeyDown for masked placeholder display.
  };

  const handlePaste = (e) => {
    e.preventDefault();
    if (disabled) return;

    const pasted = sanitizePastedDate(e.clipboardData.getData('text'));
    if (!pasted) return;

    const nextSegments = {
      day: pasted.day.slice(0, 2),
      month: pasted.month.slice(0, 2),
      year: pasted.year.slice(0, 4),
    };

    updateSegments(nextSegments, segmentsToDisplay(nextSegments).length);
  };

  const handleNativeDateChange = (e) => {
    const dateVal = e.target.value;
    if (!dateVal) {
      updateSegments({ day: '', month: '', year: '' }, 0);
      return;
    }

    const nextSegments = isoToSegments(dateVal);
    updateSegments(nextSegments, segmentsToDisplay(nextSegments).length);
  };

  const displayValue = segmentsToDisplay(segments);
  const nativeValue = segmentsToIso(segments);

  return (
    <div className="relative w-full">
      <input
        type="text"
        ref={setRef}
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
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
      <div className="absolute right-0 top-0 h-full w-11 z-10">
        <span className="absolute inset-0 flex items-center justify-center text-text-secondary text-base pointer-events-none">📅</span>
        <input
          type="date"
          ref={dateInputRef}
          disabled={disabled}
          value={nativeValue}
          onChange={handleNativeDateChange}
          min={formatDateToYYYYMMDD(resolvedMin)}
          max={formatDateToYYYYMMDD(resolvedMax)}
          className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
          tabIndex={-1}
        />
      </div>
    </div>
  );
});

CustomDatePicker.displayName = 'CustomDatePicker';

export default CustomDatePicker;
