import React, { useState, useEffect } from 'react';
import './CookieConsent.css';

const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie_consent');
        if (!consent) {
            // Небольшая задержка, чтобы не было слишком навязчиво при первой загрузке
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        // Пока просто сохраняем факт согласия. Потом можно будет усложнить.
        localStorage.setItem('cookie_consent', 'all');
        setIsVisible(false);
    };

    const handleCustomize = () => {
        // TODO: Открыть модальное окно с настройками
        console.log("Открываем настройки куки...");
        // Для примера пока просто скроем баннер
        setIsVisible(false);
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className="cookie-consent-banner">
            <div className="cookie-consent-text">
                <p>Мы используем файлы cookie, чтобы сделать ваш опыт использования сайта лучше. Нажимая «Принять», вы соглашаетесь на использование всех наших файлов cookie. Ну или почти всех. <a href="/privacy">Подробнее</a></p>
            </div>
            <div className="cookie-consent-actions">
                <button onClick={handleCustomize} className="btn-customize">Настроить</button>
                <button onClick={handleAccept} className="btn-accept">Принять</button>
            </div>
        </div>
    );
};

export default CookieConsent; 