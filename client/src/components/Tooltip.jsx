import React from 'react';

const Tooltip = ({ children, content }) => {
  if (!content) return children;

  return (
    <div className="relative group/tooltip inline-flex items-center">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-elevated border border-border rounded-lg shadow-xl text-xs whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50">
        <p className="font-semibold text-text-primary">{content}</p>
      </div>
    </div>
  );
};

export default Tooltip;
