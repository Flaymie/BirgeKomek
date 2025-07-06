import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Импортируем наши JSON-файлы с переводами
import homepageRU from './locales/ru/homepage.json';
import homepageEN from './locales/en/homepage.json';

const resources = {
  en: {
    homepage: homepageEN,
  },
  ru: {
    homepage: homepageRU,
  },
};

i18n
  // Детектор языка браузера
  .use(LanguageDetector)
  // Передаем инстанс i18n в react-i18next
  .use(initReactI18next)
  .init({
    resources,
    // Язык по умолчанию, если не определился
    fallbackLng: 'ru',
    // Неймспейс по умолчанию
    defaultNS: 'homepage',
    // Для дебага
    debug: process.env.NODE_ENV === 'development',

    interpolation: {
      // React уже защищает от XSS
      escapeValue: false,
    },
    
    // Опции для детектора языка
    detection: {
      // Порядок, в котором будет определяться язык
      order: ['localStorage', 'navigator'],
      // Ключ в localStorage
      lookupLocalStorage: 'i18nextLng',
      // Кешируем язык в localStorage
      caches: ['localStorage'],
    },
  });

export default i18n; 