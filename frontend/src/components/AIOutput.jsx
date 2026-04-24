import React from 'react';

export default function AIOutput({ data, title = 'AI Analysis' }) {
  if (!data) return null;

  const content = data.analysis || data.recommendation || data.prediction || data.identification || '';

  const formatContent = (text) => {
    if (!text) return '';
    const lines = text.split('\n');
    let result = [];
    let inList = false;

    lines.forEach((line) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        if (inList) { result.push('</ul>'); inList = false; }
        result.push(`<h3>${line.replace(/\*\*/g, '')}</h3>`);
      } else if (/^\d+\.\s*\*\*/.test(line)) {
        if (inList) { result.push('</ul>'); inList = false; }
        const cleanLine = line.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '');
        result.push(`<h3>${cleanLine}</h3>`);
      } else if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
        if (!inList) { result.push('<ul>'); inList = true; }
        const cleanLine = line.replace(/^[\s\-•]+/, '').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        result.push(`<li>${cleanLine}</li>`);
      } else if (line.trim()) {
        if (inList) { result.push('</ul>'); inList = false; }
        const cleanLine = line
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/\*([^*]+)\*/g, '<em>$1</em>');
        result.push(`<p>${cleanLine}</p>`);
      }
    });

    if (inList) result.push('</ul>');
    return result.join('');
  };

  return (
    <div className="ai-output" role="region" aria-label="AI Analysis Results">
      <div className="ai-output-header">
        <span className="ai-output-icon" aria-hidden="true">🤖</span>
        <span className="ai-output-title">{title}</span>
        {data.model && <span className="ai-output-model">{data.model}</span>}
      </div>
      <div className="ai-output-content" dangerouslySetInnerHTML={{ __html: formatContent(content) }} />
      {data.timestamp && (
        <div className="ai-output-timestamp">
          Generated: {new Date(data.timestamp).toLocaleString()}
        </div>
      )}
    </div>
  );
}
