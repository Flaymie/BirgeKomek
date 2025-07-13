import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ReadOnlyBanner from './ReadOnlyBanner';
import CommandPalette from '../shared/CommandPalette';
import { useCommandPalette } from '../../context/CommandPaletteContext';

const Layout = ({ children }) => {
  const location = useLocation();
  const { openPalette } = useCommandPalette();
  const hideFooterOn = ['/chat', '/requests/'];

  const shouldHideFooter = hideFooterOn.some(path => location.pathname.includes(path));

  useEffect(() => {
    if (!location.pathname.includes('/chat')) {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        openPalette();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openPalette]);
  
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Декоративные элементы фона */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full opacity-50 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full opacity-50 blur-3xl"></div>
      </div>
      
      <Header />
      
      <main 
        key={location.pathname} 
        className="flex-1 pt-8 relative z-10"
      >
        <ReadOnlyBanner />
        {children}
      </main>
      
      <CommandPalette />
      
      {!shouldHideFooter && <Footer />}
    </div>
  );
};

export default Layout;