import React from 'react';

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <nav className="pagination" role="navigation" aria-label="Pagination">
      <button className="btn btn-sm btn-ghost" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">&laquo; Prev</button>
      {start > 1 && <><button className="btn btn-sm btn-ghost" onClick={() => onPageChange(1)}>1</button><span className="pagination-ellipsis">...</span></>}
      {pages.map(p => (
        <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onPageChange(p)} aria-current={p === page ? 'page' : undefined}>{p}</button>
      ))}
      {end < totalPages && <><span className="pagination-ellipsis">...</span><button className="btn btn-sm btn-ghost" onClick={() => onPageChange(totalPages)}>{totalPages}</button></>}
      <button className="btn btn-sm btn-ghost" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">Next &raquo;</button>
    </nav>
  );
}
