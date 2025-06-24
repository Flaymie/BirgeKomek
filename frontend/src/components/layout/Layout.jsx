import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const Layout = ({ children }) => {
  const location = useLocation();
  
  // Эффект для анимации при смене страницы
  useEffect(() => {
    // Не скроллить наверх для страницы чата, так как у нее своя логика скролла
    if (!location.pathname.includes('/chat')) {
    window.scrollTo(0, 0);
    }
  }, [location.pathname]);
  
  // Не показывать футер на странице чата
  const showFooter = !location.pathname.includes('/chat');
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow animate-fadeIn pt-24">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
};

export default Layout; 