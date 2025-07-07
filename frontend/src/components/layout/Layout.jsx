import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ReadOnlyBanner from './ReadOnlyBanner';

const Layout = ({ children }) => {
  const location = useLocation();
  const hideFooterOn = ['/chat', '/requests/'];

  // Проверяем, начинается ли путь с одного из шаблонов для скрытия
  const shouldHideFooter = hideFooterOn.some(path => location.pathname.includes(path));

  // Эффект для анимации при смене страницы
  useEffect(() => {
    if (!location.pathname.includes('/chat')) {
    window.scrollTo(0, 0);
    }
  }, [location.pathname]);
  
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Header />
      <main key={location.pathname} className="flex-1 flex flex-col pt-8">
        <ReadOnlyBanner />
        {children}
      </main>
      {!shouldHideFooter && <Footer />}
    </div>
  );
};

export default Layout; 