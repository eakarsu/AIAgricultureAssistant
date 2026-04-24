import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: '🌾', title: 'Welcome to AI Agriculture Assistant',
      content: 'Your intelligent farming companion powered by artificial intelligence. Let us help you optimize your farm operations, detect crop diseases early, and maximize your yields.'
    },
    {
      icon: '🏡', title: 'Set Up Your Farm',
      content: 'Start by adding your field locations in the Field Map. Include details like crop types, soil types, and GPS coordinates for each field. This helps our AI provide location-specific recommendations.'
    },
    {
      icon: '🤖', title: 'Explore AI Features',
      content: 'Our 5 AI-powered features analyze your data and provide actionable insights: Crop Disease Detection identifies plant diseases from symptoms. Irrigation Optimizer calculates water needs. Harvest Predictor forecasts yields. Pest Identifier detects infestations. Soil Analyzer assesses fertility.'
    },
    {
      icon: '🚀', title: 'Get Started!',
      content: 'You\'re all set! Head to the dashboard to explore your farm data, run AI analyses, and manage your agricultural operations. Don\'t forget to check notifications for important alerts and weather updates.'
    }
  ];

  return (
    <div>
      <div className="onboarding-container">
        <div className="onboarding-card">
          <div className="onboarding-progress">
            {steps.map((_, i) => (<div key={i} className={`progress-dot ${i <= step ? 'active' : ''}`}></div>))}
          </div>
          <div className="onboarding-icon" aria-hidden="true">{steps[step].icon}</div>
          <h2 className="onboarding-title">{steps[step].title}</h2>
          <p className="onboarding-content">{steps[step].content}</p>
          <div className="onboarding-actions">
            {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>Back</button>}
            {step < steps.length - 1 ?
              <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Next</button> :
              <button className="btn btn-primary" onClick={() => navigate('/')}>Go to Dashboard</button>
            }
          </div>
          <button className="btn btn-ghost btn-sm mt-2" onClick={() => navigate('/')}>Skip Tour</button>
        </div>
      </div>
    </div>
  );
}
