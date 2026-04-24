import React from 'react';

export default function SeverityBadge({ severity }) {
  const classes = {
    mild: 'badge-success',
    moderate: 'badge-warning',
    severe: 'badge-danger',
    unknown: 'badge-neutral'
  };
  return <span className={`badge ${classes[severity?.toLowerCase()] || 'badge-neutral'}`}>{severity || 'Unknown'}</span>;
}
