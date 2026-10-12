import React from 'react';
export default function FarmFieldAvailability({ fields, fieldsLoading, fieldsError, loadFields, optional = false }) {
  if (fieldsLoading) return <p role="status">Loading your accessible farm fields…</p>;
  if (fieldsError) return <p role="alert">{fieldsError} <button type="button" className="btn btn-outline" onClick={() => void loadFields()}>Retry fields</button></p>;
  if (!fields.length) return <p role="status">No accessible farm field is available. {optional ? 'Optional field context stays blank; add an authorized field or review a context-free planning example.' : 'Add an authorized farm field before generating this source-based analysis.'} Demo AI will never invent a field ID.</p>;
  return null;
}
