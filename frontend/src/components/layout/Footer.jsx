import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white py-8 mt-auto">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Колонка с описанием */}
          <div>
            <h3 className="text-xl font-bold mb-4">Бірге Көмек</h3>
            <p className="text-gray-400 mb-4">
              Платформа для взаимопомощи школьников в Казахстане. Делимся знаниями, помогаем друг другу в учебе.
            </p>
            <div className="flex space-x-4">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <span className="sr-only">Instagram</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a href="https://vk.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <span className="sr-only">VK</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21.547 7h-3.29a.743.743 0 0 0-.655.392s-1.312 2.416-1.734 3.23C14.734 12.75 14 12.751 14 11.383V7.743A1.12 1.12 0 0 0 12.921 6H9.654C8.812 6 8.4 6.485 8.4 6.927c0 .723 1.234.89 1.234 2.31v3.201c0 .808-.313.809-.313.809-.594 0-2.054-2.13-2.929-4.563a.89.89 0 0 0-.843-.684H2.154A.91.91 0 0 0 1.2 8.852c0 .72.85 4.305 3.624 7.66C7.173 19.306 9.646 20 12.345 20c.64 0 .843-.215.843-.601v-1.942c0-.433.28-.657.706-.657.4 0 1.08.195 2.642 1.655.913.9 1.519 1.274 1.722 1.274.344 0 .646-.225.646-.62v-3.669c0-.422.2-.62.09-.799-.348-.515-2.003-2.338-2.008-2.344-.272-.344-.198-.508 0-.83.198-.306 1.332-1.78 1.694-2.234.775-.972 1.156-1.616.535-1.616-.117 0-.252-.001-.387-.027a1.763 1.763 0 0 0-.7-.159h-3.088a.77.77 0 0 0-.79.594c-.28.602-2.13 2.504-2.13 2.504-.288.336-.4.306-.4-.09V8.929c0-.407-.117-.599-.468-.599h-2.921A.64.64 0 0 0 5.6 8.778c0 .358.246.548.246.548s1.314 3.022 2.755 4.748c1.3 1.603 2.854 1.646 3.877 1.646h1.19c.358 0 .539-.153.539-.48v-1.918c0-.321.155-.671.571-.915.252-.145.756-.472 1.07-.689 1.023-.712 1.733-1.29 1.733-1.29.215-.155.333-.453.333-.717V7.743a.75.75 0 0 0-.746-.743z" />
                </svg>
              </a>
              <a href="https://t.me/birgekomek" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <span className="sr-only">Telegram</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Ссылки */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Быстрые ссылки</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-white">Главная</Link>
              </li>
              <li>
                <Link to="/requests" className="text-gray-400 hover:text-white">Запросы</Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-400 hover:text-white">О нас</Link>
              </li>
              <li>
                <Link to="/register" className="text-gray-400 hover:text-white">Регистрация</Link>
              </li>
            </ul>
          </div>

          {/* Контакты */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Контакты</h3>
            <p className="text-gray-400 mb-2">Алматы, Казахстан</p>
            <p className="text-gray-400 mb-2">info@birgekomek.kz</p>
            <p className="text-gray-400 mb-2">+7 (777) 123-45-67</p>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col md:flex-row justify-between">
          <p className="text-sm text-gray-400">© {currYear} Бірге Көмек. Все права защищены.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link to="/privacy" className="text-sm text-gray-400 hover:text-white">Политика конфиденциальности</Link>
            <Link to="/terms" className="text-sm text-gray-400 hover:text-white">Условия использования</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 