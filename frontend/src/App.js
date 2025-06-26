import React from 'react';
import { Routes, Route } from 'react-router-dom';
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
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { useAuth } from './context/AuthContext';
import BannedUserModal from './components/modals/BannedUserModal';

const App = () => {
  const { banDetails, logout } = useAuth();

  return (
    <>
      <ToastContainer position="top-right" autoClose={5000} />
      
      <BannedUserModal 
        isOpen={banDetails.isBanned}
        details={banDetails}
        onConfirm={logout}
      />
      
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
          
          {/* Защищенные маршруты */}
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/profile/me" element={<ProtectedRoute><ProfileMeRedirector /></ProtectedRoute>} />
          <Route path="/profile/:identifier" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/request/:id" element={<ProtectedRoute><RequestDetailPage /></ProtectedRoute>} />
          <Route path="/request/:id/edit" element={<ProtectedRoute><EditRequestPage /></ProtectedRoute>} />
          <Route path="/requests/:id/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/chats" element={<ProtectedRoute><ChatsPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/my-requests" element={<ProtectedRoute><MyRequestsPage /></ProtectedRoute>} />
        </Routes>
      </Layout>
    </>
  );
};

export default App;
