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
import CropRotationPage from './pages/CropRotationPage';
import YieldPredictionPage from './pages/YieldPredictionPage';
import PestForecastPage from './pages/PestForecastPage';
import SubsidiesPage from './pages/SubsidiesPage';
import FarmChatPage from './pages/FarmChatPage';
import CarbonFootprintPage from './pages/CarbonFootprintPage';
import WeeklyReportPage from './pages/WeeklyReportPage';
import AIResultsPage from './pages/AIResultsPage';
import WeatherRiskAlertPage from './pages/WeatherRiskAlertPage';
import SoilAmendmentPage from './pages/SoilAmendmentPage';
import DiseaseIdTextPage from './pages/DiseaseIdTextPage';
import MarketPricePredictionPage from './pages/MarketPricePredictionPage';
import SustainabilityScorePage from './pages/SustainabilityScorePage';
import IrrigationOptimizeTextPage from './pages/IrrigationOptimizeTextPage';
import IotSensorSummaryPage from './pages/IotSensorSummaryPage';

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
                  {/* AI Advisor Routes */}
                  <Route path="/ai/crop-rotation" element={<CropRotationPage />} />
                  <Route path="/ai/yield-prediction" element={<YieldPredictionPage />} />
                  <Route path="/ai/pest-forecast" element={<PestForecastPage />} />
                  <Route path="/ai/subsidies" element={<SubsidiesPage />} />
                  <Route path="/ai/farm-chat" element={<FarmChatPage />} />
                  <Route path="/ai/carbon-footprint" element={<CarbonFootprintPage />} />
                  <Route path="/ai/weekly-report" element={<WeeklyReportPage />} />
                  <Route path="/ai/results" element={<AIResultsPage />} />
                  <Route path="/ai/weather-risk-alert" element={<WeatherRiskAlertPage />} />
                  <Route path="/ai/soil-amendment" element={<SoilAmendmentPage />} />
                  <Route path="/ai/disease-id-text" element={<DiseaseIdTextPage />} />
                  <Route path="/ai/market-price-prediction" element={<MarketPricePredictionPage />} />
                  <Route path="/ai/sustainability-score" element={<SustainabilityScorePage />} />
                  <Route path="/ai/irrigation-optimize-text" element={<IrrigationOptimizeTextPage />} />
                  <Route path="/ai/iot-sensor-summary" element={<IotSensorSummaryPage />} />
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
