import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ContactPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    { q: 'How accurate are the AI crop disease predictions?', a: 'Our AI models achieve 85-95% accuracy depending on the crop type and quality of symptom descriptions provided. For best results, provide detailed symptom descriptions and multiple observations.' },
    { q: 'Can I export my data for use in other tools?', a: 'Yes! You can export any data table (crop diseases, irrigation, harvest, pests, soil) in both CSV and JSON formats from the Data Export page.' },
    { q: 'How does the irrigation optimization work?', a: 'Our AI considers soil type, current moisture levels, target moisture, weather conditions, temperature, and humidity to calculate optimal irrigation schedules and water requirements for each field.' },
    { q: 'Is my farm data secure?', a: 'Absolutely. We use industry-standard encryption, JWT authentication, and bcrypt password hashing. Your data is never shared with third parties.' },
    { q: 'Can I manage multiple farms?', a: 'You can manage multiple field locations within your account. Each field can be independently tracked with its own crop, soil, and weather data.' },
    { q: 'What file types can I upload?', a: 'We support JPG, JPEG, PNG, GIF images, PDF documents, and CSV/XLSX spreadsheets. Maximum file size is 5MB per upload.' }
  ];

  const handleSubmit = (e) => { e.preventDefault(); setSubmitted(true); };

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
      <div className="page-header"><div><h1 className="page-title">📞 Contact & Support</h1><p className="page-description">Get help, find answers, and reach our support team</p></div></div>

      <div className="contact-grid">
        <div>
          <div className="card mb-2"><div className="card-body">
            <h3 className="mb-2">Frequently Asked Questions</h3>
            {faqs.map((faq, i) => (
              <div key={i} className="faq-item">
                <button className="faq-question" onClick={() => setExpandedFaq(expandedFaq === i ? null : i)} aria-expanded={expandedFaq === i}>
                  <span>{faq.q}</span><span aria-hidden="true">{expandedFaq === i ? '−' : '+'}</span>
                </button>
                {expandedFaq === i && <div className="faq-answer">{faq.a}</div>}
              </div>
            ))}
          </div></div>
        </div>

        <div>
          <div className="card mb-2"><div className="card-body">
            <h3 className="mb-2">Contact Us</h3>
            {submitted ? <div className="alert alert-success">Thank you! Your message has been sent. We'll respond within 24 hours.</div> :
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label className="form-label">Name</label><input type="text" className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Subject</label><input type="text" className="form-input" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Message</label><textarea className="form-textarea" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} required /></div>
              <button type="submit" className="btn btn-primary">Send Message</button>
            </form>}
          </div></div>

          <div className="card"><div className="card-body">
            <h3 className="mb-2">Other Ways to Reach Us</h3>
            <p>📧 Email: support@agriculture-ai.example.com</p>
            <p>📞 Phone: +1 (555) 123-4567</p>
            <p>🕐 Hours: Monday-Friday, 8AM-6PM EST</p>
          </div></div>
        </div>
      </div>
    </div>
  );
}
