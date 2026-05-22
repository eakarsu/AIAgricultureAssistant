import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Header() {
  const { user, logout, api } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api.get('/notifications?limit=1')
      .then(res => setUnreadCount(res.data.unreadCount || 0))
      .catch(() => {});
  }, [api]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setShowMobileMenu(false);
    }
  };

  return (
    <header className="header" role="banner">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className="header-content">
        <div className="header-logo" onClick={() => navigate('/')} role="button" tabIndex={0} aria-label="Go to dashboard" onKeyDown={(e) => e.key === 'Enter' && navigate('/')}>
          <span className="header-logo-icon" aria-hidden="true">🌾</span>
          <h1>AI Agriculture Assistant</h1>
        </div>

        <button className="hamburger-btn" onClick={() => setShowMobileMenu(!showMobileMenu)} aria-label="Toggle navigation menu" aria-expanded={showMobileMenu}>
          <span></span><span></span><span></span>
        </button>

        <nav className={`header-nav ${showMobileMenu ? 'mobile-open' : ''}`} role="navigation" aria-label="Main navigation">
          <form className="header-search" onSubmit={handleSearch} role="search">
            <input
              type="search"
              className="header-search-input"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search records"
            />
          </form>

          <button className="btn btn-icon header-icon-btn" onClick={() => { navigate('/custom-views'); setShowMobileMenu(false); }} aria-label="Farm Views" title="Farm Views">
            🌱 Farm Views
          </button>

          <button className="btn btn-icon header-icon-btn" onClick={() => { navigate('/ai/irrigation-realtime'); setShowMobileMenu(false); }} aria-label="Realtime Irrigation" title="Realtime Irrigation">
            💧 Irrigation AI
          </button>

          <button className="btn btn-icon header-icon-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          <button className="btn btn-icon header-icon-btn notification-bell" onClick={() => { navigate('/notifications'); setShowMobileMenu(false); }} aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}>
            🔔
            {unreadCount > 0 && <span className="notification-badge" aria-hidden="true">{unreadCount}</span>}
          </button>

          <div className="header-user-dropdown">
            <button className="header-user" onClick={() => setShowUserMenu(!showUserMenu)} aria-expanded={showUserMenu} aria-haspopup="true">
              <span aria-hidden="true">👤</span>
              <span>{user?.name || user?.email}</span>
              <span aria-hidden="true" style={{ fontSize: '0.7rem' }}>▼</span>
            </button>
            {showUserMenu && (
              <div className="dropdown-menu" role="menu">
                <button className="dropdown-item" role="menuitem" onClick={() => { navigate('/profile'); setShowUserMenu(false); setShowMobileMenu(false); }}>👤 Profile</button>
                <button className="dropdown-item" role="menuitem" onClick={() => { navigate('/settings'); setShowUserMenu(false); setShowMobileMenu(false); }}>⚙️ Settings</button>
                {user?.role === 'admin' && <button className="dropdown-item" role="menuitem" onClick={() => { navigate('/admin'); setShowUserMenu(false); setShowMobileMenu(false); }}>🛡️ Admin</button>}
                <hr className="dropdown-divider" />
                <button className="dropdown-item" role="menuitem" onClick={() => { logout(); setShowUserMenu(false); }}>🚪 Logout</button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
