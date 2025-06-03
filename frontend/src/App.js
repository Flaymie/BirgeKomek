import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './components/pages/HomePage';
import LoginPage from './components/pages/LoginPage';
import RegisterPage from './components/pages/RegisterPage';
import ForgotPasswordPage from './components/pages/ForgotPasswordPage';
import AboutPage from './components/pages/AboutPage';
import PrivacyPolicyPage from './components/pages/PrivacyPolicyPage';
import TermsPage from './components/pages/TermsPage';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './App.css';

// Компонент для обновления анимаций при изменении маршрута
const AnimationRefresh = () => {
  const location = useLocation();
  
  useEffect(() => {
    // Обновляем анимации при каждом изменении маршрута
    AOS.refresh();
  }, [location]);
  
  return null;
};

function App() {
  useEffect(() => {
    // Инициализация AOS с глобальными настройками
    AOS.init({
      duration: 800,
      once: false,
      mirror: true,
      offset: 50,
      easing: 'ease-in-out',
      delay: 0,
    });
  }, []);

  return (
    <Router>
      <AnimationRefresh />
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
