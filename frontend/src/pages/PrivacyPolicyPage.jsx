import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="page-header"><div><h1 className="page-title">🔒 Privacy Policy</h1></div></div>
      <div className="card"><div className="card-body static-content">
        <h2>Privacy Policy for AI Agriculture Assistant</h2>
        <p><strong>Last Updated:</strong> January 2025</p>
        <h3>1. Information We Collect</h3>
        <p>We collect information you provide directly, including your name, email address, farm details, crop data, soil analysis data, and field locations. This data is used exclusively to provide AI-powered agricultural recommendations.</p>
        <h3>2. How We Use Your Information</h3>
        <p>Your data is used to: provide personalized crop disease detection and treatment recommendations; optimize irrigation schedules based on your field conditions; predict harvest yields and optimal timing; identify pests and provide management advice; analyze soil health and fertility.</p>
        <h3>3. Data Storage and Security</h3>
        <p>All data is stored in encrypted databases. We use industry-standard security measures including HTTPS encryption, JWT-based authentication, and bcrypt password hashing. Your farm data is never shared with third parties without your explicit consent.</p>
        <h3>4. AI Data Processing</h3>
        <p>When you submit data for AI analysis, it is processed through our AI models to generate recommendations. The AI outputs are stored alongside your records for future reference. We do not use your individual farm data to train AI models.</p>
        <h3>5. Data Retention</h3>
        <p>Your data is retained as long as your account is active. You may request deletion of your account and all associated data at any time by contacting our support team.</p>
        <h3>6. Your Rights</h3>
        <p>You have the right to: access your personal data; correct inaccurate data; export your data in standard formats (CSV/JSON); request deletion of your data; withdraw consent for data processing.</p>
        <h3>7. Cookies and Tracking</h3>
        <p>We use essential cookies for authentication and session management. We do not use advertising trackers or share browsing data with third parties.</p>
        <h3>8. Contact</h3>
        <p>For privacy inquiries, contact us at privacy@agriculture-ai.example.com.</p>
      </div></div>
    </div>
  );
}
