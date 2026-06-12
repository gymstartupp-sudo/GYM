import React, { useState, useEffect } from 'react';

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

  // Synchronize internal text value with external value prop
  useEffect(() => {
    setTextValue(formatDateToDDMMYYYY(value));
  }, [value]);

  const handleTextChange = (e) => {
    let val = e.target.value;
    const clean = val.replace(/\D/g, '');
    let formatted = '';
    
    if (clean.length > 0) {
      formatted += clean.slice(0, 2);
    }
    if (clean.length > 2) {
      formatted += '-' + clean.slice(2, 4);
    }
    if (clean.length > 4) {
      formatted += '-' + clean.slice(4, 8); // Enforce max 4 digits for year
    }
    
    setTextValue(formatted);
    
    if (onChange) {
      // If it's a complete DD-MM-YYYY, pass standard ISO string YYYY-MM-DD
      if (formatted.length === 10) {
        const parts = formatted.split('-');
        const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        onChange({
          target: {
            name: rest.name || '',
            value: isoDate
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
    const dateVal = e.target.value; // YYYY-MM-DD from calendar
    if (dateVal) {
      const parts = dateVal.split('-');
      // Restrict year to max 4 digits
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

  return (
    <div className="relative w-full">
      <input
        type="text"
        ref={ref}
        value={textValue}
        onChange={handleTextChange}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={10}
        className={`${className} pr-10`}
        {...rest}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer flex items-center justify-center w-6 h-6">
        <span className="text-gray-400 hover:text-white select-none text-base">📅</span>
        <input
          type="date"
          disabled={disabled}
          value={formatDateToYYYYMMDD(textValue)}
          onChange={handleDateChange}
          max="9999-12-31"
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          style={{ minWidth: '100%', minHeight: '100%', fontSize: '16px' }}
        />
      </div>
    </div>
  );
});

CustomDatePicker.displayName = 'CustomDatePicker';

export default CustomDatePicker;
