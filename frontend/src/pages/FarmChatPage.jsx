import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function FarmChatPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get('/ai/farm-chat/history?limit=10')
      .then(res => setHistory(res.data.records || []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [api]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await api.post('/ai/farm-chat', { message: userMessage });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.answer,
        key_points: res.data.key_points || [],
        follow_up_questions: res.data.follow_up_questions || [],
        confidence: res.data.confidence,
        sources: res.data.sources_to_verify || []
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'error', content: err.response?.data?.error || 'Failed to get response. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const useFollowUp = (question) => {
    setInput(question);
  };

  const suggestedQuestions = [
    'When should I plant corn based on my field data?',
    'What\'s the best irrigation schedule for clay soil?',
    'How can I improve my soil health score?',
    'What are signs of nitrogen deficiency in wheat?',
    'How do I prevent aphid infestations organically?'
  ];

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="page-header">
        <div>
          <h1 className="page-title">Farm AI Chat</h1>
          <p className="page-description">Ask your AI agricultural advisor anything about your farm</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        {/* Chat Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Suggested Questions */}
          {messages.length === 0 && (
            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <h3 style={{ marginBottom: 12 }}>Suggested Questions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {suggestedQuestions.map((q, i) => (
                  <button key={i} className="btn btn-ghost" style={{ textAlign: 'left', justifyContent: 'flex-start', padding: '10px 14px' }}
                    onClick={() => setInput(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 200 }}>
            {messages.map((msg, i) => (
              <div key={i}>
                {msg.role === 'user' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ background: '#10b981', color: '#fff', padding: '12px 16px', borderRadius: '18px 18px 4px 18px', maxWidth: '75%' }}>
                      {msg.content}
                    </div>
                  </div>
                )}
                {msg.role === 'assistant' && (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 36, height: 36, background: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.2rem' }}>🤖</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '4px 18px 18px 18px' }}>
                        <p style={{ marginBottom: msg.key_points?.length > 0 ? 12 : 0 }}>{msg.content}</p>
                        {msg.key_points?.length > 0 && (
                          <div style={{ marginTop: 12 }}>
                            <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>KEY POINTS</strong>
                            <ul style={{ marginTop: 6 }}>
                              {msg.key_points.map((kp, j) => <li key={j}>{kp}</li>)}
                            </ul>
                          </div>
                        )}
                        {msg.confidence && (
                          <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Confidence: {msg.confidence}%</div>
                        )}
                        {msg.sources?.length > 0 && (
                          <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Verify with: {msg.sources.join(', ')}
                          </div>
                        )}
                      </div>
                      {msg.follow_up_questions?.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                          {msg.follow_up_questions.map((fq, j) => (
                            <button key={j} className="btn btn-sm btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => useFollowUp(fq)}>
                              {fq}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {msg.role === 'error' && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, color: '#ef4444' }}>
                    {msg.content}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 36, height: 36, background: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🤖</div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '4px 18px 18px 18px' }}>
                  <div className="loading-spinner" style={{ width: 20, height: 20 }}></div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask your farm AI advisor anything..."
              className="form-input"
              style={{ flex: 1 }}
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>
        </div>

        {/* History Sidebar */}
        <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: 12 }}>Recent Questions</h3>
          {historyLoading ? (
            <div className="loading"><div className="loading-spinner"></div></div>
          ) : history.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No chat history yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.map((h) => (
                <div key={h.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4, color: '#10b981' }}>
                    {h.message.length > 60 ? h.message.slice(0, 60) + '...' : h.message}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {h.response ? (h.response.length > 80 ? h.response.slice(0, 80) + '...' : h.response) : ''}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {new Date(h.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
