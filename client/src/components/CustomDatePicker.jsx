import React, { useState, useEffect } from 'react';

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
    if (value) {
      // If value is YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        const parts = value.slice(0, 10).split('-');
        setTextValue(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        setTextValue(value);
      }
    } else {
      setTextValue('');
    }
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
      formatted += '-' + clean.slice(4, 8);
    }
    
    setTextValue(formatted);
    
    // We send YYYY-MM-DD format to onChange if it's a complete DD-MM-YYYY string,
    // so that standard controllers/APIs get a valid ISO date, or we send the raw/partial string.
    if (formatted.length === 10) {
      const parts = formatted.split('-');
      onChange(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
      onChange(formatted);
    }
  };

  const handleDateChange = (e) => {
    const dateVal = e.target.value; // YYYY-MM-DD
    if (dateVal) {
      const parts = dateVal.split('-');
      const formatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
      setTextValue(formatted);
      onChange(dateVal);
    } else {
      setTextValue('');
      onChange('');
    }
  };

  // Convert the current DD-MM-YYYY value to YYYY-MM-DD for the native picker
  const getNativeDateValue = () => {
    if (/^\d{2}-\d{2}-\d{4}$/.test(textValue)) {
      const parts = textValue.split('-');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    // If it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(textValue)) {
      return textValue;
    }
    return '';
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
          value={getNativeDateValue()}
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
