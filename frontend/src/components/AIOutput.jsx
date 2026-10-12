import React from 'react';
import FormattedAIReport from './FormattedAIReport';
export default function AIOutput({ data, title = 'AI Analysis' }) {
  if (!data) return null;
  const content = data.analysis || data.recommendation || data.prediction || data.identification || data;
  return <div className="ai-output" role="region" aria-label="AI Analysis Results"><FormattedAIReport response={content} model={data.model} title={title} />{data.timestamp && <div className="ai-output-timestamp">Generated: {new Date(data.timestamp).toLocaleString()}</div>}</div>;
}
