import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../contexts/AuthContext';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError(''); setMessage('');
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message);
    } catch (err) { setError(err.response?.data?.error || 'Failed to send reset email.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo" aria-hidden="true">🔑</div>
          <h1 className="login-title">Forgot Password</h1>
          <p className="login-subtitle">Enter your email to receive a password reset link</p>
        </div>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label className="form-label" htmlFor="reset-email">Email</label><input id="reset-email" type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
        </form>
        <div className="mt-2 text-center"><Link to="/login" className="text-link">Back to Login</Link></div>
      </div>
    </div>
  );
}
