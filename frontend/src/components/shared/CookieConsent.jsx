import React, { useState, useEffect } from 'react';
import CookieSettingsModal from '../modals/CookieSettingsModal'; // Импортируем модалку
import './CookieConsent.css';

const COOKIE_CONSENT_KEY = 'cookie_consent';

const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false); // Состояние для модалки

    useEffect(() => {
        const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
        if (!consent) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAcceptAll = () => {
        const consent = {
            necessary: true,
            analytics: true,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
        setIsVisible(false);
    };

    const handleSaveSettings = (settings) => {
        const consent = {
            ...settings,
            necessary: true, // Всегда включены
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
        setIsVisible(false);
    };

    const handleCustomize = () => {
        setIsModalOpen(true);
    };

    if (!isVisible) {
        return null;
    }

    return (
        <>
            <div className="cookie-consent-banner">
                <div className="cookie-consent-text">
                    <p>Мы используем файлы cookie, чтобы сделать ваш опыт использования сайта лучше. Нажимая «Принять», вы соглашаетесь на использование всех наших файлов cookie. Ну или почти всех. <a href="/privacy" onClick={(e) => { e.preventDefault(); setIsModalOpen(true); }}>Подробнее и настроить</a></p>
                </div>
                <div className="cookie-consent-actions">
                    <button onClick={handleCustomize} className="btn-customize">Настроить</button>
                    <button onClick={handleAcceptAll} className="btn-accept">Принять все</button>
                </div>
            </div>

            <CookieSettingsModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveSettings}
            />
        </>
    );
};

export default CookieConsent; 