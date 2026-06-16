import React, { useState, useEffect, useRef } from 'react';

// Robust helper to format any date-like value to DD-MM-YYYY string
const formatDateToDDMMYYYY = (val) => {
  if (!val) return '';
  
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const y = val.getFullYear();
    const yearStr = String(y).slice(0, 4);
    return `${d}-${m}-${yearStr}`;
  }
  
  const str = String(val).trim();
  
  // If it starts with YYYY-MM-DD (e.g. ISO string or simple date)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.slice(0, 10).split('-');
    const yearStr = parts[0].slice(0, 4);
    return `${parts[2]}-${parts[1]}-${yearStr}`;
  }
  
  // If it is DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}/.test(str)) {
    const parts = str.slice(0, 10).split('-');
    const yearStr = parts[2].slice(0, 4);
    return `${parts[0]}-${parts[1]}-${yearStr}`;
  }
  
  // Try parsing with native Date parser
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const y = parsed.getFullYear();
    const yearStr = String(y).slice(0, 4);
    return `${d}-${m}-${yearStr}`;
  }
  
  return str;
};

// Convert value to YYYY-MM-DD format for native date input picker
const formatDateToYYYYMMDD = (val) => {
  if (!val) return '';
  
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const y = val.getFullYear();
    const yearStr = String(y).slice(0, 4);
    return `${yearStr}-${m}-${d}`;
  }
  
  const str = String(val).trim();
  
  // If it matches DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}/.test(str)) {
    const parts = str.slice(0, 10).split('-');
    const yearStr = parts[2].slice(0, 4);
    return `${yearStr}-${parts[1]}-${parts[0]}`;
  }
  
  // If it matches YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.slice(0, 10).split('-');
    const yearStr = parts[0].slice(0, 4);
    return `${yearStr}-${parts[1]}-${parts[2]}`;
  }
  
  // Try parsing with native Date parser
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const y = parsed.getFullYear();
    const yearStr = String(y).slice(0, 4);
    return `${yearStr}-${m}-${d}`;
  }
  
  return '';
};

const toLocalDateOnly = (value) => {
  if (!value) return null;

  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const parseDDMMYYYY = (value) => {
  if (!value || !/^\d{2}-\d{2}-\d{4}$/.test(value)) return null;

  const [dayStr, monthStr, yearStr] = value.split('-');
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);

  if (yearStr.length !== 4 || day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

const isWithinBounds = (date, minDate, maxDate) => {
  const min = toLocalDateOnly(minDate);
  const max = toLocalDateOnly(maxDate);

  if (min && date < min) return false;
  if (max && date > max) return false;
  return true;
};

const getYearRangeMessage = (minDate, maxDate) => {
  const min = toLocalDateOnly(minDate);
  const max = toLocalDateOnly(maxDate);

  if (min && max) {
    return `Year should be between ${min.getFullYear()} - ${max.getFullYear()}`;
  }

  if (min) {
    return `Year should be ${min.getFullYear()} or later`;
  }

  if (max) {
    return `Year should be ${max.getFullYear()} or earlier`;
  }

  return 'Selected date is outside the allowed range';
};

// Sanitizes and formats raw digit strings to valid DD-MM-YYYY bounds
const sanitizeDDMMYYYY = (originalVal) => {
  const digits = String(originalVal).replace(/\D/g, '').slice(0, 8);
  const accepted = [];

  for (const digit of digits) {
    const slotIndex = accepted.length;

    if (slotIndex === 0) {
      if (/[0-3]/.test(digit)) accepted.push(digit);
      continue;
    }

    if (slotIndex === 2) {
      if (/[0-1]/.test(digit)) accepted.push(digit);
      continue;
    }

    accepted.push(digit);

    if (accepted.length >= 8) break;
  }

  let day = accepted.slice(0, 2).join('');
  let month = accepted.slice(2, 4).join('');
  const year = accepted.slice(4, 8).join('');

  if (day.length === 2 && Number(day) > 31) {
    day = '31';
  }

  if (month.length === 2 && Number(month) > 12) {
    month = '12';
  }

  let temp = '';
  if (day.length > 0) {
    temp += day;
  }
  if (day.length === 2 || month.length > 0 || year.length > 0) {
    temp += '-';
  }
  if (month.length > 0) {
    temp += month;
  }
  if (month.length === 2 || year.length > 0) {
    temp += '-';
  }
  if (year.length > 0) {
    temp += year;
  }

  return temp.slice(0, 10);
};

const CustomDatePicker = React.forwardRef(({
  value,
  onChange,
  onBlur,
  disabled,
  minDate,
  maxDate,
  min,
  max,
  onValidationError,
  placeholder = "DD-MM-YYYY",
  className = "",
  error,
  ...rest
}, ref) => {
  const [textValue, setTextValue] = useState('');
  const dateInputRef = useRef(null);

  // Synchronize internal text value with external value prop
  useEffect(() => {
    setTextValue(formatDateToDDMMYYYY(value));
  }, [value]);

  const handleTextChange = (e) => {
    const inputEl = e.target;
    const originalPos = inputEl.selectionStart;
    const originalVal = inputEl.value;
    
    // Check if change is a deletion/backspace
    const isDelete = e.nativeEvent.inputType?.includes('delete') || 
                     (originalVal.length < textValue.length);

    let formatted = '';
    if (!isDelete) {
      formatted = sanitizeDDMMYYYY(originalVal);
    } else {
      // Allow natural backspacing: remove non-digits (except dashes)
      formatted = originalVal.replace(/[^0-9-]/g, '').slice(0, 10);
    }

    // Determine target cursor position
    let newSelectionStart = originalPos;

    if (!isDelete) {
      // If a character was automatically formatted with a hyphen, push the cursor past the hyphen
      if (textValue.length === 1 && formatted.length === 3) {
        newSelectionStart = 3;
      } else if (textValue.length === 4 && formatted.length === 6) {
        newSelectionStart = 6;
      }
      
      // If a non-digit character was typed (and rejected), keep the cursor stationary
      const lastChar = originalVal[originalPos - 1];
      if (lastChar && /\D/.test(lastChar) && lastChar !== '-') {
        newSelectionStart = Math.max(0, originalPos - 1);
      }
    }

    setTextValue(formatted);

    // Prevent cursor jumping to the end of input
    requestAnimationFrame(() => {
      if (inputEl) {
        inputEl.setSelectionRange(newSelectionStart, newSelectionStart);
      }
    });

    if (onChange) {
      if (formatted.length === 10) {
        const parsedDate = parseDDMMYYYY(formatted);
        if (parsedDate && isWithinBounds(parsedDate, minDate || min, maxDate || max)) {
          if (onValidationError) onValidationError('', formatted);
          const parts = formatted.split('-');
          onChange({
            target: {
              name: rest.name || '',
              value: `${parts[2]}-${parts[1]}-${parts[0]}`
            }
          });
        } else {
          if (onValidationError) {
            if (!parsedDate) {
              onValidationError('Enter a valid date in DD-MM-YYYY format', formatted);
            } else if (!isWithinBounds(parsedDate, minDate || min, maxDate || max)) {
              onValidationError(getYearRangeMessage(minDate || min, maxDate || max), formatted);
            }
          }
          onChange({
            target: {
              name: rest.name || '',
              value: ''
            }
          });
        }
      } else {
        onChange({
          target: {
            name: rest.name || '',
            value: formatted
          }
        });
      }
    }
  };

  const handleDateChange = (e) => {
    const dateVal = e.target.value; // YYYY-MM-DD from native calendar
    if (dateVal) {
      const parts = dateVal.split('-');
      const year = parts[0].slice(0, 4);
      const month = parts[1];
      const day = parts[2];
      
      const formatted = `${day}-${month}-${year}`;
      const parsedDate = parseDDMMYYYY(formatted);

      if (parsedDate && !isWithinBounds(parsedDate, minDate || min, maxDate || max)) {
        if (onValidationError) onValidationError(getYearRangeMessage(minDate || min, maxDate || max), formatted);
        return;
      }

      if (onValidationError) onValidationError('', formatted);
      setTextValue(formatted);
      
      if (onChange) {
        onChange({
          target: {
            name: rest.name || '',
            value: `${year}-${month}-${day}`
          }
        });
      }
    } else {
      if (onValidationError) onValidationError('');
      setTextValue('');
      if (onChange) {
        onChange({
          target: {
            name: rest.name || '',
            value: ''
          }
        });
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').trim();

    // 1. Match DD-MM-YYYY / DD/MM/YYYY / DD.MM.YYYY
    const dmyMatch = pastedText.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmyMatch) {
      const [_, day, month, year] = dmyMatch;
      const formatted = `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
      updateValue(formatted);
      return;
    }

    // 2. Match pure digits: DDMMYYYY
    const pureDigitsMatch = pastedText.match(/^(\d{2})(\d{2})(\d{4})$/);
    if (pureDigitsMatch) {
      const [_, day, month, year] = pureDigitsMatch;
      const formatted = `${day}-${month}-${year}`;
      updateValue(formatted);
      return;
    }

    // 3. Match YYYY-MM-DD / YYYY/MM/DD (ISO Format)
    const ymdMatch = pastedText.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (ymdMatch) {
      const [_, year, month, day] = ymdMatch;
      const formatted = `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
      updateValue(formatted);
      return;
    }

    // Fallback: extract first 8 digits and format
    const digits = pastedText.replace(/\D/g, '');
    if (digits.length >= 8) {
      const day = digits.slice(0, 2);
      const month = digits.slice(2, 4);
      const year = digits.slice(4, 8);
      const formatted = `${day}-${month}-${year}`;
      updateValue(formatted);
    }
  };

  const updateValue = (formattedVal) => {
    const sanitized = sanitizeDDMMYYYY(formattedVal);
    setTextValue(sanitized);
    if (onChange) {
      if (sanitized.length === 10) {
        const parsedDate = parseDDMMYYYY(sanitized);
        if (parsedDate && isWithinBounds(parsedDate, minDate || min, maxDate || max)) {
          if (onValidationError) onValidationError('', sanitized);
          const parts = sanitized.split('-');
          onChange({
            target: {
              name: rest.name || '',
              value: `${parts[2]}-${parts[1]}-${parts[0]}`
            }
          });
        } else {
          if (onValidationError) {
            if (!parsedDate) {
              onValidationError('Enter a valid date in DD-MM-YYYY format', sanitized);
            } else if (!isWithinBounds(parsedDate, minDate || min, maxDate || max)) {
              onValidationError(getYearRangeMessage(minDate || min, maxDate || max), sanitized);
            }
          }
          onChange({
            target: {
              name: rest.name || '',
              value: ''
            }
          });
        }
      } else {
        onChange({
          target: {
            name: rest.name || '',
            value: sanitized
          }
        });
      }
    }
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        ref={ref}
        value={textValue}
        onChange={handleTextChange}
        onBlur={onBlur}
        onPaste={handlePaste}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={10}
        inputMode="numeric"
        pattern="[0-9\-]*"
        autoComplete="off"
        className={`${className} pr-12`}
        {...rest}
      />
      <div className="absolute right-0 top-0 h-full w-11 flex items-center justify-center cursor-pointer select-none">
        <span className="text-text-secondary hover:text-text-primary text-base">📅</span>
        <input
          type="date"
          ref={dateInputRef}
          disabled={disabled}
          value={formatDateToYYYYMMDD(textValue)}
          onChange={handleDateChange}
          min={formatDateToYYYYMMDD(minDate || min)}
          max={formatDateToYYYYMMDD(maxDate || max)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full [color-scheme:dark]"
          style={{ minWidth: '100%', minHeight: '100%', fontSize: '16px', colorScheme: 'dark' }}
        />
      </div>
    </div>
  );
});

CustomDatePicker.displayName = 'CustomDatePicker';

export default CustomDatePicker;
