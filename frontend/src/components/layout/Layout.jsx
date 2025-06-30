import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ReadOnlyBanner from './ReadOnlyBanner';

const Layout = ({ children }) => {
  const location = useLocation();
  const hideFooterOn = ['/chat', '/requests/']; // Добавим '/requests/' для страницы чата

  // Проверяем, начинается ли путь с одного из шаблонов для скрытия
  const shouldHideFooter = hideFooterOn.some(path => location.pathname.includes(path));

  // Эффект для анимации при смене страницы
  useEffect(() => {
    // Не скроллить наверх для страницы чата, так как у нее своя логика скролла
    if (!location.pathname.includes('/chat')) {
    window.scrollTo(0, 0);
    }
  }, [location.pathname]);
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <ReadOnlyBanner />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      {!shouldHideFooter && <Footer />}
    </div>
  );
};

export default Layout; 