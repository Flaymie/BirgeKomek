import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import RequireAuth from './components/auth/RequireAuth';
import HomePage from './components/pages/HomePage';
import AboutPage from './components/pages/AboutPage';
import RegisterPage from './components/pages/RegisterPage';
import LoginPage from './components/pages/LoginPage';
import ForgotPasswordPage from './components/pages/ForgotPasswordPage';
import ResetPasswordPage from './components/pages/ResetPasswordPage';
import RequestsPage from './components/pages/RequestsPage';
import ProfilePage from './components/pages/ProfilePage';
import CreateRequestPage from './components/pages/CreateRequestPage';
import RequestDetailPage from './components/pages/RequestDetailPage';
import EditRequestPage from './components/pages/EditRequestPage';
import NotificationsPage from './components/pages/NotificationsPage';
import MyRequestsPage from './components/pages/MyRequestsPage';
import ChatPage from './components/pages/ChatPage';
import ChatsPage from './components/pages/ChatsPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { useAuth } from './context/AuthContext';
import BannedUserModal from './components/modals/BannedUserModal';

const App = () => {
  const { isBanned, banReason, logout } = useAuth();

  return (
    <>
      <ToastContainer position="top-right" autoClose={5000} />
      
      <BannedUserModal 
        isOpen={isBanned}
        reason={banReason}
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
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          
          {/* Защищенные маршруты */}
          <Route element={<RequireAuth />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:id" element={<ProfilePage />} />
            <Route path="/create-request" element={<CreateRequestPage />} />
            <Route path="/request/:id" element={<RequestDetailPage />} />
            <Route path="/request/:id/edit" element={<EditRequestPage />} />
            <Route path="/requests/:id/chat" element={<ChatPage />} />
            <Route path="/chats" element={<ChatsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/my-requests" element={<MyRequestsPage />} />
          </Route>
        </Routes>
      </Layout>
    </>
  );
};

export default App; 