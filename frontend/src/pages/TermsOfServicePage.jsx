import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function TermsOfServicePage() {
  const navigate = useNavigate();
  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="page-header"><div><h1 className="page-title">📜 Terms of Service</h1></div></div>
      <div className="card"><div className="card-body static-content">
        <h2>Terms of Service for AI Agriculture Assistant</h2>
        <p><strong>Effective Date:</strong> January 2025</p>
        <h3>1. Acceptance of Terms</h3>
        <p>By accessing and using the AI Agriculture Assistant platform, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
        <h3>2. Service Description</h3>
        <p>AI Agriculture Assistant provides AI-powered agricultural management tools including crop disease detection, irrigation optimization, harvest prediction, pest identification, and soil analysis. These recommendations are advisory in nature and should be used alongside professional agricultural expertise.</p>
        <h3>3. User Accounts</h3>
        <p>You are responsible for maintaining the confidentiality of your account credentials. You must notify us immediately of any unauthorized use of your account. You must provide accurate and complete registration information.</p>
        <h3>4. AI Recommendations Disclaimer</h3>
        <p>AI-generated recommendations are based on the data you provide and general agricultural knowledge. They should not replace professional agricultural advice. We do not guarantee specific crop yields, pest elimination, or disease outcomes based on our recommendations.</p>
        <h3>5. Data Ownership</h3>
        <p>You retain ownership of all farm data, soil analyses, crop records, and other information you input into the system. We only use this data to provide our services to you.</p>
        <h3>6. Acceptable Use</h3>
        <p>You agree not to: upload malicious content or software; attempt to access other users' data; use the service for illegal purposes; share your credentials with unauthorized parties.</p>
        <h3>7. Service Availability</h3>
        <p>We strive for high availability but do not guarantee uninterrupted service. Scheduled maintenance will be communicated in advance when possible.</p>
        <h3>8. Limitation of Liability</h3>
        <p>To the maximum extent permitted by law, AI Agriculture Assistant shall not be liable for any crop losses, yield reductions, or agricultural damages resulting from the use of AI recommendations provided through our platform.</p>
        <h3>9. Changes to Terms</h3>
        <p>We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of modified terms.</p>
      </div></div>
    </div>
  );
}
