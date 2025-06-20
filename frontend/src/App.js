import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './components/pages/HomePage';
import LoginPage from './components/pages/LoginPage';
import RegisterPage from './components/pages/RegisterPage';
import ForgotPasswordPage from './components/pages/ForgotPasswordPage';
import AboutPage from './components/pages/AboutPage';
import PrivacyPolicyPage from './components/pages/PrivacyPolicyPage';
import TermsPage from './components/pages/TermsPage';
import NotFoundPage from './components/pages/NotFoundPage';
import RequestsPage from './components/pages/RequestsPage';
import RequestDetailPage from './components/pages/RequestDetailPage';
import ProfilePage from './components/pages/ProfilePage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MyRequestsPage from './components/pages/MyRequestsPage';
import EditRequestPage from './components/pages/EditRequestPage';
import ChatsPage from './components/pages/ChatsPage';
import NotificationsPage from './components/pages/NotificationsPage';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './App.css';
import ChatPage from './components/pages/ChatPage';
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
    <>
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
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/my-requests" element={<MyRequestsPage />} />
          <Route path="/chats" element={<ChatsPage />} />
          <Route path="/request/:id" element={<RequestDetailPage />} />
          <Route path="/requests/:id/chat" element={<ChatPage />} />
          <Route path="/request/:id/edit" element={<EditRequestPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/profile/:id" element={<ProfilePage />} />
          {/* Остальные маршруты добавим позже */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </>
  );
}

export default App;
