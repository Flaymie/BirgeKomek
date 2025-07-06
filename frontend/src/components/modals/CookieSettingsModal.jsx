import React, { useState } from 'react';
import './CookieSettingsModal.css';

// Простой компонент-переключатель (тумблер)
const ToggleSwitch = ({ id, label, checked, onChange, disabled = false }) => (
    <div className={`toggle-switch ${disabled ? 'disabled' : ''}`}>
        <input 
            type="checkbox" 
            className="toggle-switch-checkbox" 
            name={id} 
            id={id}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
        />
        <label className="toggle-switch-label" htmlFor={id}>
            <span className="toggle-switch-inner" />
            <span className="toggle-switch-switch" />
        </label>
        <span className="toggle-switch-text">{label}</span>
    </div>
);


const CookieSettingsModal = ({ isOpen, onClose, onSave }) => {
    // Пока только один тип куки, который можно настраивать
    const [settings, setSettings] = useState({
        analytics: false,
    });

    const handleToggle = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = () => {
        onSave(settings);
        onClose();
    };
    
    const handleAcceptAll = () => {
        const allSettings = { analytics: true }; // В будущем тут будут все типы
        onSave(allSettings);
        onClose();
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-overlay">
            <div className="cookie-settings-modal">
                <div className="modal-header">
                    <h2>Настройки файлов cookie</h2>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                <div className="modal-body">
                    <p className="modal-intro">
                        Вы можете выбрать, какие типы файлов cookie разрешить. Подробности можно найти в нашей <a href="/privacy" target="_blank" rel="noopener noreferrer">Политике конфиденциальности</a>.
                    </p>
                    
                    <div className="cookie-category">
                        <ToggleSwitch 
                            id="necessary"
                            label="Строго необходимые"
                            checked={true}
                            disabled={true}
                        />
                        <p className="category-description">
                            Эти файлы cookie необходимы для работы сайта и не могут быть отключены. Они используются для аутентификации и обеспечения безопасности.
                        </p>
                    </div>

                    <div className="cookie-category">
                        <ToggleSwitch 
                            id="analytics"
                            label="Аналитические cookie"
                            checked={settings.analytics}
                            onChange={() => handleToggle('analytics')}
                        />
                        <p className="category-description">
                            Эти файлы cookie позволяют нам собирать анонимную статистику о посещениях, чтобы мы могли улучшать наш сервис.
                        </p>
                    </div>

                </div>
                <div className="modal-footer">
                    <button onClick={handleSave} className="btn-save">Сохранить настройки</button>
                    <button onClick={handleAcceptAll} className="btn-accept-all">Принять все</button>
                </div>
            </div>
        </div>
    );
};

export default CookieSettingsModal; 