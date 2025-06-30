import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
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
import RequestDetailPage from './components/pages/RequestDetailPage';
import EditRequestPage from './components/pages/EditRequestPage';
import NotificationsPage from './components/pages/NotificationsPage';
import MyRequestsPage from './components/pages/MyRequestsPage';
import ChatPage from './components/pages/ChatPage';
import ChatsPage from './components/pages/ChatsPage';
import TelegramCallbackPage from './components/pages/TelegramCallbackPage';
import PrivacyPolicyPage from './components/pages/PrivacyPolicyPage';
import TermsPage from './components/pages/TermsPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { useAuth, AuthProvider } from './context/AuthContext';
import { setAuthContext } from './services/api';
import BannedUserModal from './components/modals/BannedUserModal';
import RateLimitModal from './components/modals/RateLimitModal';
import AllReviewsPage from './components/pages/AllReviewsPage';

const AppContent = () => {
  const { 
    currentUser, 
    isBannedModalOpen, 
    banDetails, 
    closeBanModal,
    logout
  } = useAuth();
  const location = useLocation();
  const [isRateLimitModalOpen, setIsRateLimitModalOpen] = useState(false);

  useEffect(() => {
    const handleRateLimit = () => {
      setIsRateLimitModalOpen(true);
    };

    window.addEventListener('show-rate-limit-modal', handleRateLimit);

    return () => {
      window.removeEventListener('show-rate-limit-modal', handleRateLimit);
    };
  }, []);

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
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

      <div className={`main-content ${banDetails.isBanned || isRateLimitModalOpen ? 'blurred' : ''}`}>
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
            <Route path="/request/:id" element={<RequestDetailPage />} />
            
            {/* Защищенные маршруты */}
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/profile/me" element={<ProtectedRoute><ProfileMeRedirector /></ProtectedRoute>} />
            <Route path="/profile/:identifier" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/request/:id/edit" element={<ProtectedRoute><EditRequestPage /></ProtectedRoute>} />
            <Route path="/requests/:id/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <Route path="/chats" element={<ProtectedRoute><ChatsPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/my-requests" element={<ProtectedRoute><MyRequestsPage /></ProtectedRoute>} />
            <Route path="/reviews/:userId" element={<ProtectedRoute><AllReviewsPage /></ProtectedRoute>} />
            
          </Routes>
        </Layout>
      </div>
    </>
  );
};

const AppWrapper = () => {
  const authContext = useAuth();
  
  useEffect(() => {
    setAuthContext(authContext);
  }, [authContext]);

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default AppWrapper;
