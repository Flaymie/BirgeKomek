import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { useAuth } from '../../context/AuthContext';
import CommandPalette from '../shared/CommandPalette';
import { useCommandPalette } from '../../context/CommandPaletteContext';

const Layout = () => {
    const location = useLocation();
    const { user, loading } = useAuth();
    const { openPalette } = useCommandPalette();

    const noHeaderFooterRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

    const showHeaderFooter = !noHeaderFooterRoutes.some(route => location.pathname.startsWith(route));

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

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-gray-50"></div>;
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            {showHeaderFooter && <Header user={user} />}
            <main className="flex-grow">
                <Outlet />
            </main>
            <CommandPalette />
            {showHeaderFooter && <Footer />}
        </div>
    );
};

export default Layout; 