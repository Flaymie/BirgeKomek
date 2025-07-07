import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ReadOnlyBanner from './ReadOnlyBanner';

const Layout = ({ children }) => {
  const location = useLocation();
  const hideFooterOn = ['/chat', '/requests/', '/admin'];

  // Проверяем, начинается ли путь с одного из шаблонов для скрытия
  const shouldHideFooter = hideFooterOn.some(path => location.pathname.startsWith(path));
  const shouldHideHeader = location.pathname.startsWith('/admin');

  // Эффект для анимации при смене страницы
  useEffect(() => {
    if (!location.pathname.includes('/chat')) {
    window.scrollTo(0, 0);
    }
  }, [location.pathname]);
  
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {!shouldHideHeader && <Header />}
      <main key={location.pathname} className={`flex-1 flex flex-col ${location.pathname.startsWith('/admin') ? '' : 'pt-8'}`}>
        {!location.pathname.startsWith('/admin') && <ReadOnlyBanner />}
        {children}
      </main>
      {!shouldHideFooter && <Footer />}
    </div>
  );
};

export default Layout; 