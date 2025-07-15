import React from 'react';
import { Link } from 'react-router-dom';
import { FaTelegramPlane, FaInstagram, FaVk } from 'react-icons/fa';
import packageJson from '../../../package.json';

const Footer = () => {
  const currYear = new Date().getFullYear();
  const projectVersion = packageJson.version;

  const socialLinks = [
    { icon: <FaInstagram />, href: "https://instagram.com", name: "Instagram" },
    { icon: <FaVk />, href: "https://vk.com", name: "VK" },
    { icon: <FaTelegramPlane />, href: "https://t.me/birgekomek", name: "Telegram" },
  ];

  return (
    <footer className="bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
      <div className="container-custom py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-4">
                 <img src="/img/logo.png" alt="Бірге Көмек" className="w-9 h-9" />
                 <div className="text-sm text-gray-600">
                    <p className="font-medium">© {currYear} Бірге Көмек. Все права защищены.</p>
                    <p className="text-xs text-gray-500 mt-1 bg-gray-200 px-2 py-1 rounded-full inline-block">
                      Версия: v{projectVersion}
                    </p>
                 </div>
            </div>
          
            <div className="flex items-center gap-8 text-sm text-gray-600">
                <Link to="/about" className="hover:text-indigo-600 transition-all duration-300 hover:scale-105 font-medium relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-indigo-600 after:transition-all after:duration-300 hover:after:w-full">
                  О нас
                </Link>
                <Link to="/terms" className="hover:text-indigo-600 transition-all duration-300 hover:scale-105 font-medium relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-indigo-600 after:transition-all after:duration-300 hover:after:w-full">
                  Условия
                </Link>
                <Link to="/privacy" className="hover:text-indigo-600 transition-all duration-300 hover:scale-105 font-medium relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-indigo-600 after:transition-all after:duration-300 hover:after:w-full">
                  Приватность
                </Link>
            </div>

            <div className="flex items-center gap-6">
              {socialLinks.map(link => (
                <a 
                    key={link.name}
                    href={link.href} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-gray-500 hover:text-indigo-600 transition-all duration-300 hover:scale-110 p-2 rounded-full hover:bg-white hover:shadow-lg"
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