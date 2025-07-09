import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ProfileMeRedirector from './components/auth/ProfileMeRedirector';
import HomePage from './components/pages/HomePage';
import AboutPage from './components/pages/AboutPage';
import RegisterPage from './components/pages/RegisterPage';
import LoginPage from './components/pages/LoginPage';
import ForgotPasswordPage from './components/pages/ForgotPasswordPage';
import RequestsPage from './components/pages/RequestsPage';
import ProfilePage from './components/pages/ProfilePage';
import RequestDetailsPage from './components/pages/RequestDetailsPage';
import EditRequestPage from './components/pages/EditRequestPage';
import NotificationsPage from './components/pages/NotificationsPage';
import MyRequestsPage from './components/pages/MyRequestsPage';
import ChatPage from './components/pages/ChatPage';
import ChatsPage from './components/pages/ChatsPage';
import TelegramCallbackPage from './components/pages/TelegramCallbackPage';
import PrivacyPolicyPage from './components/pages/PrivacyPolicyPage';
import TermsPage from './components/pages/TermsPage';
import NotFoundPage from './components/pages/NotFoundPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Toaster } from 'react-hot-toast';

import { useAuth, AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { CommandPaletteProvider } from './context/CommandPaletteContext';
import { setAuthContext } from './services/api';
import BannedUserModal from './components/modals/BannedUserModal';
import RateLimitModal from './components/modals/RateLimitModal';
import RequireTelegramModal from './components/modals/RequireTelegramModal';
import LinkTelegramModal from './components/modals/LinkTelegramModal';
import AllReviewsPage from './components/pages/AllReviewsPage';
import NotificationDetailPage from './components/pages/NotificationDetailPage';
import ReportsPage from './components/pages/ReportsPage';
import ReportDetailsPage from './components/pages/ReportDetailsPage';
import CookieConsent from './components/shared/CookieConsent';
import AnalyticsPage from './components/pages/AnalyticsPage'; // Импортируем новую страницу
import './App.css';

// Этот компонент отвечает за инициализацию перехватчика API
// и рендер основного контента. Он должен быть внутри AuthProvider.
const AppInitializer = () => {
  const authContext = useAuth();
  
  // Передаем контекст в api.js, чтобы перехватчик мог его использовать
  useEffect(() => {
    if (authContext) {
      setAuthContext(authContext);
    }
  }, [authContext]);
  
  return <AppContent />;
};

const AppContent = () => {
  const { 
    isBannedModalOpen, 
    banDetails, 
    closeBanModal,
    logout,
    isRequireTgModalOpen,
    handleLinkTelegram,
    isLinkTelegramModalOpen,
    telegramLinkUrl,
    isTelegramLoading,
    closeLinkTelegramModal,
  } = useAuth();
  const [isRateLimitModalOpen, setIsRateLimitModalOpen] = useState(false);

  useEffect(() => {
    const handleRateLimit = () => setIsRateLimitModalOpen(true);
    window.addEventListener('show-rate-limit-modal', handleRateLimit);
    return () => window.removeEventListener('show-rate-limit-modal', handleRateLimit);
  }, []);

  return (
    <>
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      
      <BannedUserModal 
        isOpen={isBannedModalOpen}
        onClose={() => {
          closeBanModal();
          logout();
        }}
        banDetails={banDetails}
      />
      
      <RateLimitModal 
        isOpen={isRateLimitModalOpen}
        onClose={() => setIsRateLimitModalOpen(false)}
      />

      <RequireTelegramModal 
        isOpen={isRequireTgModalOpen}
        onLinkTelegram={handleLinkTelegram}
      />

      <LinkTelegramModal 
        isOpen={isLinkTelegramModalOpen}
        onClose={closeLinkTelegramModal}
        linkUrl={telegramLinkUrl}
        isLoading={isTelegramLoading}
      />

      <div className={`main-content h-screen flex flex-col ${(banDetails && banDetails.isBanned) || isRateLimitModalOpen || isRequireTgModalOpen || isLinkTelegramModalOpen ? 'blurred' : ''}`}>
      <Layout>
        <Routes>
            {/* Публичные маршруты */}
          <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/auth/telegram/callback" element={<TelegramCallbackPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/request/:id" element={<RequestDetailsPage />} />
            
            {/* Защищенные маршруты */}
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/profile/me" element={<ProtectedRoute><ProfileMeRedirector /></ProtectedRoute>} />
            <Route path="/profile/:identifier" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/request/:id/edit" element={<ProtectedRoute><EditRequestPage /></ProtectedRoute>} />
            <Route path="/requests/:id/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <Route path="/chats" element={<ProtectedRoute><ChatsPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/notification/:id" element={<NotificationDetailPage />} />
            <Route path="/my-requests" element={<ProtectedRoute><MyRequestsPage /></ProtectedRoute>} />
            <Route path="/reviews/:userId" element={<ProtectedRoute><AllReviewsPage /></ProtectedRoute>} />

            {/* Маршруты для модераторов/админов */}
            <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'moderator']}><ReportsPage /></ProtectedRoute>} />
            <Route path="/reports/:id" element={<ProtectedRoute allowedRoles={['admin', 'moderator']}><ReportDetailsPage /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AnalyticsPage /></ProtectedRoute>} />


            {/* Маршрут для страницы не найдено */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <CookieConsent />
      </Layout>
      </div>
    </>
  );
};

// Главный компонент приложения с правильной структурой
function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <CommandPaletteProvider>
                <Toaster
                  position="top-center"
                  reverseOrder={false}
                />
                <AppInitializer />
            </CommandPaletteProvider>
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
