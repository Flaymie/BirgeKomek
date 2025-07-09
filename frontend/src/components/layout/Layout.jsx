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
    <div className="flex flex-col h-full bg-gray-50">
      <Header />
      <main key={location.pathname} className="flex-1 flex flex-col pt-8">
        <ReadOnlyBanner />
        {children}
      </main>
      <CommandPalette />
      {!shouldHideFooter && <Footer />}
    </div>
  );
};

export default Layout; 