import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 2) {
        end = 4;
      } else if (currentPage >= totalPages - 1) {
        start = totalPages - 3;
      }

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      pages.push(totalPages);
    }
    return pages;
  };

  const handlePageChange = (page) => {
    onPageChange(page);
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const overflowEl = document.querySelector('.overflow-y-auto');
      if (overflowEl) {
        overflowEl.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-4 py-4 border-t border-border/40 bg-surface-secondary/40 rounded-b-xl">
      <div className="text-xs text-text-muted font-medium">
        Showing page <span className="font-bold text-text-primary">{currentPage}</span> of{' '}
        <span className="font-bold text-text-primary">{totalPages}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-border bg-surface-secondary text-text-secondary hover:text-text-primary hover:border-gray-500 disabled:opacity-40 disabled:hover:text-text-secondary disabled:hover:border-border transition-all cursor-pointer disabled:cursor-not-allowed"
          title="Previous Page"
        >
          <ChevronLeft size={16} />
        </button>
 
        {getPageNumbers().map((page, idx) => {
          if (page === '...') {
            return (
              <span key={`ell-${idx}`} className="px-2.5 py-1.5 text-xs text-text-muted select-none">
                ...
              </span>
            );
          }
 
          const isActive = page === currentPage;
          return (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`min-w-[36px] h-9 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer
                ${isActive
                  ? 'bg-primary border-primary text-[var(--btn-primary-text)] shadow-md shadow-primary/10 font-bold'
                  : 'bg-surface-secondary border-border text-text-secondary hover:text-text-primary hover:border-gray-500'
                }`}
            >
              {page}
            </button>
          );
        })}
 
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-border bg-surface-secondary text-text-secondary hover:text-text-primary hover:border-gray-500 disabled:opacity-40 disabled:hover:text-text-secondary disabled:hover:border-border transition-all cursor-pointer disabled:cursor-not-allowed"
          title="Next Page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
