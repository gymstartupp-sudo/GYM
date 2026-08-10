import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CustomDropdown = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select option',
  className = '',
  buttonClassName = '',
  disabled = false,
  menuClassName = '',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const normalizedOptions = options.map((opt) =>
    typeof opt === 'object' && opt !== null ? opt : { label: String(opt), value: opt }
  );

  const selectedOpt = normalizedOptions.find((o) => String(o.value) === String(value));

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`w-full bg-surface-card border border-border hover:border-primary text-text-primary rounded-xl py-2 px-4 flex items-center justify-between gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium transition-all duration-150 shadow-sm hover:shadow-md hover:bg-surface-hover ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${buttonClassName}`}
      >
        <span className="truncate">{selectedOpt ? selectedOpt.label : placeholder}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform duration-200 text-text-secondary ${
            open ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {open && !disabled && (
        <div className={`absolute top-full mt-1 left-0 min-w-full w-max max-w-[280px] z-50 bg-surface-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 max-h-60 overflow-y-auto py-1 ${menuClassName}`}>
          {normalizedOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-xs text-left font-semibold transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-black font-bold shadow-sm'
                    : 'text-text-primary hover:bg-primary hover:text-black font-bold'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={14} className="shrink-0 font-extrabold text-black" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
