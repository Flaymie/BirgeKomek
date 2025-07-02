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
    const halfPagesToShow = Math.floor(maxPagesToShow / 2);

    let startPage = Math.max(1, currentPage - halfPagesToShow);
    let endPage = Math.min(totalPages, currentPage + halfPagesToShow);

    if (currentPage - halfPagesToShow < 1) {
        endPage = Math.min(totalPages, maxPagesToShow);
    }

    if (currentPage + halfPagesToShow > totalPages) {
        startPage = Math.max(1, totalPages - maxPagesToShow + 1);
    }
    
    // Всегда показываем первую страницу
    if (startPage > 1) {
        pageNumbers.push(1);
        if (startPage > 2) {
            pageNumbers.push('...');
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }
    
    // Всегда показываем последнюю страницу
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