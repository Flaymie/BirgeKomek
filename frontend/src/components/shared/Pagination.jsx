import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) {
    return null;
  }

  const handlePageClick = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) {
      return;
    }
    onPageChange(page);
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;

    let startPage, endPage;

    if (totalPages <= maxPagesToShow) {
      // Если страниц меньше или равно 5, показываем все
      startPage = 1;
      endPage = totalPages;
    } else {
      // Если страниц больше 5, используем сложную логику
      const maxPagesBeforeCurrent = Math.floor(maxPagesToShow / 2);
      const maxPagesAfterCurrent = Math.ceil(maxPagesToShow / 2) - 1;

      if (currentPage <= maxPagesBeforeCurrent) {
        // Если мы в начале
        startPage = 1;
        endPage = maxPagesToShow;
      } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
        // Если мы в конце
        startPage = totalPages - maxPagesToShow + 1;
        endPage = totalPages;
      } else {
        // Если мы в середине
        startPage = currentPage - maxPagesBeforeCurrent;
        endPage = currentPage + maxPagesAfterCurrent;
      }
    }
    
    // Всегда показываем первую страницу и многоточие, если нужно
    if (startPage > 1) {
        pageNumbers.push(1);
        if (startPage > 2) {
            pageNumbers.push('...');
        }
    }

    // Рендерим сам диапазон страниц
    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }
    
    // Всегда показываем последнюю страницу и многоточие, если нужно
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pageNumbers.push('...');
        }
        pageNumbers.push(totalPages);
    }

    return pageNumbers.map((page, index) => (
      <button
        key={index}
        onClick={() => typeof page === 'number' && handlePageClick(page)}
        disabled={page === '...'}
        className={`relative inline-flex items-center px-4 py-2 text-sm font-medium transition-colors rounded-md ${
          currentPage === page
            ? 'z-10 bg-primary-600 text-white shadow-md'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        } ${page === '...' ? 'cursor-default' : ''}`}
      >
        {page}
      </button>
    ));
  };

  return (
    <nav className="flex justify-center items-center gap-2" aria-label="Pagination">
        <button
            onClick={() => handlePageClick(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
            <FiChevronLeft className="h-5 w-5" />
        </button>

        {renderPageNumbers()}

        <button
            onClick={() => handlePageClick(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
            <FiChevronRight className="h-5 w-5" />
        </button>
    </nav>
  );
};

export default Pagination; 