import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, api } from '../contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleDemoLogin = async () => {
    try {
      setLoading(true); setError('');
      const res = await api.get('/auth/demo-credentials');
      setEmail(res.data.email); setPassword(res.data.password);
    } catch {
      setEmail('demo@agriculture.ai'); setPassword('demo123456');
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try { await login(email, password); navigate('/'); }
    catch (err) { setError(err.response?.data?.error || 'Login failed. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo" aria-hidden="true">🌾</div>
          <h1 className="login-title">AI Agriculture Assistant</h1>
          <p className="login-subtitle">Smart farming powered by artificial intelligence</p>
        </div>
        <button className="btn btn-primary demo-btn" onClick={handleDemoLogin} disabled={loading}>🚀 Auto-Fill Demo Credentials</button>
        <div className="login-divider"><span>then click Login</span></div>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label className="form-label" htmlFor="login-email">Email</label><input id="login-email" type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required /></div>
          <div className="form-group"><label className="form-label" htmlFor="login-password">Password</label><input id="login-password" type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required /></div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
        </form>
        <div className="mt-2 text-center"><Link to="/forgot-password" className="text-link">Forgot Password?</Link></div>
      </div>
    </div>
  );
}
