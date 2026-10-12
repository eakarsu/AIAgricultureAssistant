import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useNativeAIRequest from '../components/useNativeAIRequest';
import FormattedAIReport from '../components/FormattedAIReport';
import AIWorkspaceModal from '../components/AIWorkspaceModal';
import '../components/AIWorkspace.css';
import './FarmOperationsReview.css';

const examples = [
  { name: 'Water planning', prompt: 'Fictional planning example: a small farm wants a weekly irrigation review for maize and beans. Optional context: no actual sensor readings, soil test, weather feed, or field record has been supplied; recent rainfall is unknown, the draft planning window is 7 days, and available supplemental water may be zero. Explain which source measurements are needed and propose a cautious inspection checklist rather than a watering prescription. State uncertainty and require a qualified human before chemical, safety, or high-impact decisions. Use a concise executive summary, safeguards, and next steps.' },
  { name: 'Harvest readiness', prompt: 'Fictional planning example: a farm is preparing a harvest-readiness meeting for two crop areas. Optional context: maturity observations, equipment condition, worker availability, and weather are unverified; the proposed review window is 14 days and no harvesting approval has been issued. Provide a planning checklist and questions to ask the authorized farm manager. Do not claim a yield forecast, inspection, safe operating condition, or completed action. State uncertainty and require a qualified human for safety and high-impact decisions. Return a concise summary, missing evidence, and proposed next steps.' },
  { name: 'Sustainability review', prompt: 'Fictional planning example: a farm wants to discuss a sustainability recordkeeping plan. Optional context: no actual fuel, fertilizer, soil, water, or emissions measurements are supplied; the proposed recordkeeping period is one month, an empty emissions estimate must remain unknown, and zero spending is a planning constraint. Suggest which records to gather and how a human should review assumptions. Do not assert carbon credits, certification, regulatory compliance, or approved treatment. State uncertainty and require qualified review for safety, chemical, and high-impact decisions. Use a concise summary, evidence checklist, and next steps.' },
];
function Receipt({ receipt }) {
  return <dl className="farm-review-receipt"><div><dt>Saved receipt</dt><dd>{receipt.id}</dd></div><div><dt>Model</dt><dd>{receipt.model}</dd></div><div><dt>Provider request</dt><dd>{receipt.provider_request_id}</dd></div><div><dt>Created</dt><dd>{new Date(receipt.created_at).toLocaleString()}</dd></div></dl>;
}
export default function FarmOperationsReview() {
  const { api } = useAuth();
  const [prompt, setPrompt] = useState(''), [result, setResult] = useState(null), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [history, setHistory] = useState([]), [historyLoading, setHistoryLoading] = useState(true), [historyError, setHistoryError] = useState(''), [selected, setSelected] = useState(null);
  const historyRequest = useRef(null), submitLock = useRef(false), mounted = useRef(true), input = useRef(null);
  const request = useNativeAIRequest();
  const loadHistory = useCallback(async () => {
    historyRequest.current?.abort(); const controller = new AbortController(); historyRequest.current = controller;
    setHistoryLoading(true); setHistoryError('');
    try {
      const answer = await api.get('/runtime-ai/recommendation/history', { signal: controller.signal });
      if (!Array.isArray(answer.data.history)) throw new Error('Saved recommendations returned an unexpected response');
      if (!controller.signal.aborted && historyRequest.current === controller) setHistory(answer.data.history);
    } catch (failure) { if (!controller.signal.aborted && historyRequest.current === controller) setHistoryError(failure.response?.data?.error || failure.message || 'Recommendations could not be loaded'); }
    finally { if (historyRequest.current === controller) { historyRequest.current = null; setHistoryLoading(false); } }
  }, [api]);
  useEffect(() => { mounted.current = true; void loadHistory(); return () => { mounted.current = false; historyRequest.current?.abort(); }; }, [loadHistory]);
  const generate = async event => {
    event.preventDefault(); if (submitLock.current || !prompt.trim()) return;
    submitLock.current = true; setError(''); setNotice(''); setResult(null);
    try {
      const answer = await request.run(signal => api.post('/runtime-ai/recommendation', { prompt: prompt.trim() }, { signal }));
      if (mounted.current) { setResult(answer.data); void loadHistory(); }
    } catch (failure) { if (mounted.current && failure.name !== 'AbortError') setError(failure.response?.data?.error || failure.message || 'The recommendation failed'); }
    finally { submitLock.current = false; }
  };
  const cancel = () => { request.cancel(); setNotice('Request cancelled. No late response will be added to this screen.'); };
  const editInputs = () => { setPrompt(selected.prompt); setSelected(null); setNotice('Original prompt loaded for a separate review. The saved provider receipt is retained.'); setTimeout(() => input.current?.focus(), 0); };
  return <section className="ai-workspace farm-review" aria-labelledby="farm-review-title"><header className="ai-workspace-heading"><span className="ai-eyebrow">Native operations review · OpenRouter</span><h1 id="farm-review-title">Farm operations review</h1><p>Review non-sensitive planning questions with your configured model.</p></header>
    <p className="ai-notice">This review advises on the prompt you supply. It does not issue treatment, operate equipment, change farm records, certify compliance, or approve an action.</p>
    <form className="ai-workspace-panel" onSubmit={generate} aria-label="Farm operations recommendation"><div className="ai-preset-bar"><div><strong>Demo AI · Fill the entire request</strong><p>Each example includes optional planning context. The examples are fictional; review them before generating.</p></div><div className="ai-actions">{examples.map(example => <button type="button" key={example.name} className="btn btn-secondary" disabled={request.busy} onClick={() => { setPrompt(example.prompt); setNotice('Every editable request field is filled, including optional context. Generate runs only when you choose it.'); }}>Demo AI · {example.name}</button>)}</div></div>
      <div className="ai-form-field"><label htmlFor="farm-review-prompt">Review prompt</label><textarea id="farm-review-prompt" name="prompt" rows={10} required maxLength={4000} ref={input} value={prompt} disabled={request.busy} onChange={event => setPrompt(event.target.value)} /></div>
      <footer className="ai-workspace-footer"><div className="ai-actions"><button type="submit" className="btn btn-primary" disabled={request.busy || !prompt.trim()}>{request.busy ? 'Generating…' : 'Generate with OpenRouter'}</button><button type="button" className="btn btn-secondary" disabled={!request.busy} onClick={cancel}>Cancel generation</button></div></footer>
      {notice && <p className="ai-notice" role="status">{notice}</p>}<FormattedAIReport loading={request.busy} error={error} />
    </form>
    {result && <><FormattedAIReport response={result.content} model={result.receipt.model} title="Farm operations recommendation" /><Receipt receipt={result.receipt} /></>}
    <section className="ai-history" aria-labelledby="farm-review-history"><div className="farm-review-history-head"><h2 id="farm-review-history">Your saved recommendations</h2><button type="button" className="btn btn-secondary" onClick={() => void loadHistory()} disabled={historyLoading}>Refresh</button></div><p>Open an owned report centrally, or load its inputs for a separate recommendation. Provider receipts are retained.</p>
      {historyLoading ? <p role="status">Loading your recommendations…</p> : historyError ? <div className="ai-error" role="alert">{historyError} <button type="button" className="btn btn-secondary" onClick={() => void loadHistory()}>Retry</button></div> : !history.length ? <p>No saved recommendations yet.</p> : <ul className="farm-review-history-list">{history.map(item => <li key={item.id}><button type="button" className="btn btn-secondary" onClick={() => setSelected(item)}>Open recommendation #{item.id}</button><span>{new Date(item.created_at).toLocaleString()} · {item.model}</span></li>)}</ul>}
    </section>
    {selected && <AIWorkspaceModal title="Saved farm operations recommendation" onClose={() => setSelected(null)} footer={<><button type="button" className="btn btn-primary" disabled={request.busy} onClick={editInputs}>Edit inputs</button><button type="button" className="btn btn-danger" disabled title="The native workflow retains original provider receipts">Delete · retained receipt</button><button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>Cancel</button></>}><Receipt receipt={selected} /><FormattedAIReport response={selected.content} model={selected.model} title="Farm operations recommendation" /><p className="ai-notice">Edit inputs prepares a separate request. The native workflow has no receipt-delete endpoint; the original provider receipt is retained.</p></AIWorkspaceModal>}
  </section>;
}
