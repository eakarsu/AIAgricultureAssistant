import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function NotificationsPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications?limit=50');
      setNotifications(res.data.records || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAsRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    fetchNotifications();
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    fetchNotifications();
  };

  const deleteNotification = async (id) => {
    await api.delete(`/notifications/${id}`);
    fetchNotifications();
  };

  const typeIcons = { info: '📋', warning: '⚠️', error: '🚨', success: '✅' };
  const typeClasses = { info: 'badge-info', warning: 'badge-warning', error: 'badge-danger', success: 'badge-success' };

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="page-header">
        <div><h1 className="page-title">🔔 Notifications</h1><p className="page-description">Stay updated on your farm operations</p></div>
        <button className="btn btn-outline" onClick={markAllRead}>Mark All as Read</button>
      </div>
      <div className="card">
        {loading ? <div className="loading"><div className="loading-spinner"></div></div> :
        notifications.length === 0 ? <div className="empty-state"><div className="empty-state-icon">🔔</div><h3 className="empty-state-title">No notifications</h3><p className="empty-state-description">You're all caught up!</p></div> :
        <div className="notifications-list">
          {notifications.map(n => (
            <div key={n.id} className={`notification-item ${n.is_read ? '' : 'unread'}`} onClick={() => !n.is_read && markAsRead(n.id)} tabIndex={0} role="button">
              <div className="notification-icon" aria-hidden="true">{typeIcons[n.type] || '📋'}</div>
              <div className="notification-content">
                <div className="notification-header">
                  <strong>{n.title}</strong>
                  <span className={`badge ${typeClasses[n.type] || 'badge-info'}`}>{n.category || n.type}</span>
                </div>
                <p className="notification-message">{n.message}</p>
                <span className="notification-time">{new Date(n.created_at).toLocaleString()}</span>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }} aria-label="Delete notification">&times;</button>
            </div>
          ))}
        </div>}
      </div>
    </div>
  );
}
