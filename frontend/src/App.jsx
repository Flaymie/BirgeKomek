import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Компоненты
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Register from './components/auth/Register';
import Login from './components/auth/Login';

// Страницы
import HomePage from './components/pages/HomePage';
import AboutPage from './components/pages/AboutPage';
import ProfilePage from './components/pages/ProfilePage';
import ChatPage from './components/pages/ChatPage';
import NotificationsPage from './components/pages/NotificationsPage';
import RequestFeedPage from './components/pages/RequestFeedPage';
import RequestDetailPage from './components/pages/RequestDetailPage';
import CreateRequestPage from './components/pages/CreateRequestPage';

// Утилита для защищенных роутов
const PrivateRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return <div>Загрузка...</div>; // Или спиннер
  }
  return currentUser ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="flex flex-col min-h-screen bg-gray-50">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
              <ToastContainer position="bottom-right" autoClose={4000} hideProgressBar={false} />
              <Routes>
                {/* Публичные роуты */}
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/requests" element={<RequestFeedPage />} />
                <Route path="/request/:id" element={<RequestDetailPage />} />
                
                {/* Приватные роуты */}
                <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                <Route path="/chat/:id" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
                <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
                <Route path="/create-request" element={<PrivateRoute><CreateRequestPage/></PrivateRoute>} />
                
                {/* TODO: Добавить страницу 404 */}
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App; 