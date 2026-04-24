import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import Dashboard from './pages/Dashboard';
import CropDiseasesPage from './pages/CropDiseasesPage';
import IrrigationPage from './pages/IrrigationPage';
import HarvestPage from './pages/HarvestPage';
import PestsPage from './pages/PestsPage';
import SoilPage from './pages/SoilPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import SearchResultsPage from './pages/SearchResultsPage';
import WeatherPage from './pages/WeatherPage';
import FieldMapPage from './pages/FieldMapPage';
import FileUploadsPage from './pages/FileUploadsPage';
import ExportPage from './pages/ExportPage';
import AdminPage from './pages/AdminPage';
import FeedbackPage from './pages/FeedbackPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import ContactPage from './pages/ContactPage';
import OnboardingPage from './pages/OnboardingPage';

function Footer() {
  return (
    <footer className="app-footer" role="contentinfo">
      <div className="footer-content">
        <div className="footer-links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/contact">Contact & Support</Link>
          <a href="/api/docs" target="_blank" rel="noopener noreferrer">API Docs</a>
        </div>
        <p className="footer-copyright">AI Agriculture Assistant v2.0</p>
      </div>
    </footer>
  );
}

function AppContent() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className="app-container">
              <Header />
              <main className="main-content" id="main-content">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/crop-diseases" element={<CropDiseasesPage />} />
                  <Route path="/irrigation" element={<IrrigationPage />} />
                  <Route path="/harvest" element={<HarvestPage />} />
                  <Route path="/pests" element={<PestsPage />} />
                  <Route path="/soil" element={<SoilPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/search" element={<SearchResultsPage />} />
                  <Route path="/weather" element={<WeatherPage />} />
                  <Route path="/fields" element={<FieldMapPage />} />
                  <Route path="/uploads" element={<FileUploadsPage />} />
                  <Route path="/export" element={<ExportPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/feedback" element={<FeedbackPage />} />
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/terms" element={<TermsOfServicePage />} />
                  <Route path="/contact" element={<ContactPage />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
