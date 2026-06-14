import React from 'react';

const Button = ({ children, onClick, type = 'button', variant = 'primary', className = '', isLoading = false, disabled = false }) => {
  const baseStyle = 'px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 flex justify-center items-center gap-2 relative overflow-hidden';

  const variants = {
    primary: 'bg-primary text-[var(--btn-primary-text)] hover:brightness-95',
    secondary: 'bg-transparent border border-primary text-primary hover:bg-primary/10',
    success: 'bg-success text-text-primary hover:brightness-110',
    danger: 'bg-danger text-text-primary hover:brightness-110',
    outline: 'bg-transparent border border-primary text-primary hover:bg-primary/10',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`${baseStyle} ${variants[variant] || variants.primary} ${className} ${isLoading || disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : children}
    </button>
  );
};

export default Button;
