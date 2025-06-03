import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './components/pages/HomePage';
import LoginPage from './components/pages/LoginPage';
import RegisterPage from './components/pages/RegisterPage';
import ForgotPasswordPage from './components/pages/ForgotPasswordPage';
import AboutPage from './components/pages/AboutPage';
import PrivacyPolicyPage from './components/pages/PrivacyPolicyPage';
import TermsPage from './components/pages/TermsPage';
import './App.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          {/* Остальные маршруты добавим позже */}
          <Route path="*" element={<div className="container-custom py-10 text-center"><h1 className="text-2xl">Страница не найдена 😢</h1></div>} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
