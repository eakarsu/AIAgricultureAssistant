import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProfilePage() {
  const { api, updateUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/auth/profile').then(res => {
      setProfile(res.data.profile);
      setFormData(res.data.profile);
    }).catch(console.error).finally(() => setLoading(false));
  }, [api]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const res = await api.put('/auth/profile', formData);
      setProfile(res.data.profile);
      updateUser(res.data.profile);
      setEditing(false);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  if (loading && !profile) return <div className="loading"><div className="loading-spinner"></div></div>;

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="page-header">
        <div><h1 className="page-title">👤 User Profile</h1><p className="page-description">Manage your account details and farm information</p></div>
        <button className="btn btn-primary" onClick={() => editing ? handleSave() : setEditing(true)}>{editing ? 'Save Changes' : 'Edit Profile'}</button>
      </div>
      {message && <div className="alert alert-success">{message}</div>}
      <div className="profile-grid">
        <div className="card"><div className="card-body">
          <div className="profile-avatar" aria-hidden="true">👤</div>
          <h2 className="text-center">{profile?.name || 'User'}</h2>
          <p className="text-center" style={{ color: 'var(--text-secondary)' }}>{profile?.email}</p>
          <p className="text-center"><span className="badge badge-info">{profile?.role || 'user'}</span></p>
        </div></div>
        <div className="card"><div className="card-body">
          <h3 className="mb-2">Personal Information</h3>
          <div className="form-group"><label className="form-label">Name</label>{editing ? <input type="text" className="form-input" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} /> : <p className="detail-item-value">{profile?.name || '-'}</p>}</div>
          <div className="form-group"><label className="form-label">Phone</label>{editing ? <input type="text" className="form-input" value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} /> : <p className="detail-item-value">{profile?.phone || '-'}</p>}</div>
          <div className="form-group"><label className="form-label">Location</label>{editing ? <input type="text" className="form-input" value={formData.location || ''} onChange={(e) => setFormData({...formData, location: e.target.value})} /> : <p className="detail-item-value">{profile?.location || '-'}</p>}</div>
          <div className="form-group"><label className="form-label">Bio</label>{editing ? <textarea className="form-textarea" value={formData.bio || ''} onChange={(e) => setFormData({...formData, bio: e.target.value})} /> : <p className="detail-item-value">{profile?.bio || '-'}</p>}</div>
        </div></div>
        <div className="card"><div className="card-body">
          <h3 className="mb-2">Farm Information</h3>
          <div className="form-group"><label className="form-label">Farm Name</label>{editing ? <input type="text" className="form-input" value={formData.farm_name || ''} onChange={(e) => setFormData({...formData, farm_name: e.target.value})} /> : <p className="detail-item-value">{profile?.farm_name || '-'}</p>}</div>
          <div className="form-group"><label className="form-label">Farm Size (acres)</label>{editing ? <input type="number" className="form-input" value={formData.farm_size || ''} onChange={(e) => setFormData({...formData, farm_size: e.target.value})} /> : <p className="detail-item-value">{profile?.farm_size ? `${profile.farm_size} acres` : '-'}</p>}</div>
          <div className="form-group"><label className="form-label">Member Since</label><p className="detail-item-value">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}</p></div>
        </div></div>
      </div>
    </div>
  );
}
