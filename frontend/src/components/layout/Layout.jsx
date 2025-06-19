import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const Layout = ({ children }) => {
  const location = useLocation();
  
  // Эффект для анимации при смене страницы
  useEffect(() => {
    // Прокрутка наверх при переходе на новую страницу
    window.scrollTo(0, 0);
  }, [location.pathname]);
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow animate-fadeIn pt-24">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout; 