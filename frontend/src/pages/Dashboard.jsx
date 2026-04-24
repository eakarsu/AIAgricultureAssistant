import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const [stats, setStats] = useState({ diseases: 0, irrigation: 0, harvest: 0, pests: 0, soil: 0 });
  const { api } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [diseases, irrigation, harvest, pests, soil] = await Promise.all([
          api.get('/crop-diseases'), api.get('/irrigation'), api.get('/harvest'), api.get('/pests'), api.get('/soil')
        ]);
        setStats({
          diseases: diseases.data.records?.length || 0, irrigation: irrigation.data.records?.length || 0,
          harvest: harvest.data.records?.length || 0, pests: pests.data.records?.length || 0, soil: soil.data.records?.length || 0
        });
      } catch (err) { console.error('Failed to fetch stats:', err); }
    };
    fetchStats();
  }, [api]);

  const sections = [
    {
      title: 'AI Features',
      cards: [
        { id: 'crop-diseases', icon: '🔬', title: 'AI Crop Disease Detector', description: 'Identify plant diseases from symptoms and get AI-powered treatment recommendations', path: '/crop-diseases', stats: stats.diseases, cardClass: 'disease-card' },
        { id: 'irrigation', icon: '💧', title: 'AI Irrigation Optimizer', description: 'Optimize water usage with smart irrigation scheduling based on soil and weather', path: '/irrigation', stats: stats.irrigation, cardClass: 'irrigation-card' },
        { id: 'harvest', icon: '📊', title: 'AI Harvest Predictor', description: 'Forecast crop yields and optimal harvest times with AI analysis', path: '/harvest', stats: stats.harvest, cardClass: 'harvest-card' },
        { id: 'pests', icon: '🐛', title: 'AI Pest Identifier', description: 'Identify pests affecting your crops and get integrated pest management advice', path: '/pests', stats: stats.pests, cardClass: 'pest-card' },
        { id: 'soil', icon: '🌱', title: 'AI Soil Analyzer', description: 'Analyze soil health and get recommendations for optimal crop growth', path: '/soil', stats: stats.soil, cardClass: 'soil-card' },
      ]
    },
    {
      title: 'Farm Management',
      cards: [
        { id: 'weather', icon: '🌤️', title: 'Weather Data', description: 'View weather conditions and forecasts for your farm locations', path: '/weather', cardClass: 'weather-card' },
        { id: 'fields', icon: '🗺️', title: 'Field Map', description: 'View and manage your field locations with GPS coordinates', path: '/fields', cardClass: 'field-card' },
        { id: 'uploads', icon: '📁', title: 'File Uploads', description: 'Upload and manage crop photos, reports, and field documents', path: '/uploads', cardClass: 'upload-card' },
        { id: 'export', icon: '📥', title: 'Data Export', description: 'Export your farm data in CSV or JSON format for analysis', path: '/export', cardClass: 'export-card' },
      ]
    },
    {
      title: 'Communication',
      cards: [
        { id: 'notifications', icon: '🔔', title: 'Notifications', description: 'View alerts, reminders, and updates about your farm operations', path: '/notifications', cardClass: 'notification-card' },
        { id: 'feedback', icon: '💬', title: 'Feedback', description: 'Submit feedback, feature requests, and bug reports', path: '/feedback', cardClass: 'feedback-card' },
        { id: 'contact', icon: '📞', title: 'Contact & Support', description: 'Get help, find answers to FAQs, and reach our support team', path: '/contact', cardClass: 'contact-card' },
      ]
    },
    {
      title: 'Account & System',
      cards: [
        { id: 'profile', icon: '👤', title: 'User Profile', description: 'Manage your account details, farm information, and preferences', path: '/profile', cardClass: 'profile-card' },
        { id: 'settings', icon: '⚙️', title: 'Settings', description: 'Configure theme, language, notifications, and display preferences', path: '/settings', cardClass: 'settings-card' },
      ]
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">Welcome to your AI-powered agriculture management system</p>
        </div>
      </div>

      {sections.map((section) => (
        <section key={section.title} className="dashboard-section" aria-label={section.title}>
          <h2 className="section-title">{section.title}</h2>
          <div className="feature-cards-grid">
            {section.cards.map((feature) => (
              <div key={feature.id} className={`feature-card ${feature.cardClass}`} onClick={() => navigate(feature.path)} tabIndex={0} role="link" aria-label={`Navigate to ${feature.title}`} onKeyDown={(e) => e.key === 'Enter' && navigate(feature.path)}>
                <div className="feature-card-icon" aria-hidden="true">{feature.icon}</div>
                <h3 className="feature-card-title">{feature.title}</h3>
                <p className="feature-card-description">{feature.description}</p>
                {feature.stats !== undefined && (
                  <div className="feature-card-stats">
                    <div className="feature-card-stats-item">
                      <div className="feature-card-stats-value">{feature.stats}</div>
                      <div className="feature-card-stats-label">Records</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
