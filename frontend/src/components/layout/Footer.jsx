import React from 'react';
import { Link } from 'react-router-dom';
import { FaTelegramPlane, FaInstagram, FaVk } from 'react-icons/fa';

const Footer = () => {
  const currYear = new Date().getFullYear();

  const socialLinks = [
    { icon: <FaInstagram />, href: "https://instagram.com", name: "Instagram" },
    { icon: <FaVk />, href: "https://vk.com", name: "VK" },
    { icon: <FaTelegramPlane />, href: "https://t.me/birgekomek", name: "Telegram" },
  ];

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="container-custom py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
                 <img src="/img/logo.png" alt="Бірге Көмек" className="w-9 h-9" />
                 <p className="text-sm text-gray-600">
                    © {currYear} Бірге Көмек. Все права защищены.
                </p>
            </div>
          
            <div className="flex items-center gap-6 text-sm text-gray-600">
                <Link to="/about" className="hover:text-primary-600 transition-colors">О нас</Link>
                <Link to="/terms" className="hover:text-primary-600 transition-colors">Условия</Link>
                <Link to="/privacy" className="hover:text-primary-600 transition-colors">Приватность</Link>
            </div>

            <div className="flex items-center gap-5">
              {socialLinks.map(link => (
                <a 
                    key={link.name}
                    href={link.href} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-gray-500 hover:text-primary-600 transition-colors"
                    aria-label={link.name}
                >
                  {React.cloneElement(link.icon, { size: 22 })}
                </a>
              ))}
            </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 