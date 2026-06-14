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

const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
};

// Sanitizes and formats raw digit strings to valid DD-MM-YYYY bounds
const sanitizeDDMMYYYY = (originalVal) => {
  // Clean all non-digits
  let clean = originalVal.replace(/\D/g, '').slice(0, 8);
  
  // Validate and adjust day digits (DD)
  if (clean.length > 0) {
    const firstDayDigit = Number(clean[0]);
    if (firstDayDigit > 3) {
      // Auto-prepend 0 (e.g. typing 5 becomes 05)
      clean = '0' + clean;
    }
  }
  
  if (clean.length >= 2) {
    const dayVal = Number(clean.slice(0, 2));
    if (dayVal > 31) {
      // Clamp day to max 31
      clean = '31' + clean.slice(2);
    }
  }
  
  // Validate and adjust month digits (MM)
  if (clean.length > 2) {
    const firstMonthDigit = Number(clean[2]);
    if (firstMonthDigit > 1) {
      // Auto-prepend 0 (e.g. typing 8 becomes 08)
      clean = clean.slice(0, 2) + '0' + clean.slice(2);
    }
  }
  
  if (clean.length >= 4) {
    const monthVal = Number(clean.slice(2, 4));
    if (monthVal > 12) {
      // Clamp month to max 12
      clean = clean.slice(0, 2) + '12' + clean.slice(4);
    }
  }

  // Format to DD-MM-YYYY layout
  let temp = '';
  if (clean.length > 0) {
    temp += clean.slice(0, 2);
  }
  if (clean.length > 2) {
    temp += '-' + clean.slice(2, 4);
  } else if (clean.length === 2) {
    temp += '-';
  }
  if (clean.length > 4) {
    temp += '-' + clean.slice(4, 8);
  } else if (clean.length === 4) {
    temp += '-';
  }
  
  return temp;
};

const CustomDatePicker = React.forwardRef(({
  value,
  onChange,
  onBlur,
  disabled,
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
        const parts = formatted.split('-');
        onChange({
          target: {
            name: rest.name || '',
            value: `${parts[2]}-${parts[1]}-${parts[0]}`
          }
        });
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
        const parts = sanitized.split('-');
        onChange({
          target: {
            name: rest.name || '',
            value: `${parts[2]}-${parts[1]}-${parts[0]}`
          }
        });
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

  const handleInputClick = (e) => {
    // Only open the native picker on desktop clicking the input text to preserve mobile virtual keyboard behavior
    if (!isMobileDevice() && dateInputRef.current) {
      try {
        dateInputRef.current.showPicker();
      } catch (err) {
        console.warn("Native showPicker not supported or failed:", err);
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
        onClick={handleInputClick}
        onPaste={handlePaste}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={10}
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
          max="9999-12-31"
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full [color-scheme:dark]"
          style={{ minWidth: '100%', minHeight: '100%', fontSize: '16px', colorScheme: 'dark' }}
        />
      </div>
    </div>
  );
});

CustomDatePicker.displayName = 'CustomDatePicker';

export default CustomDatePicker;
