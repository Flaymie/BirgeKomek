import React, { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, LanguageIcon } from '@heroicons/react/24/solid';

const languages = [
  { code: 'ru', name: 'Русский' },
  { code: 'en', name: 'English' },
];

const LanguageSwitcher = ({ isGuest = false }) => {
  const { i18n } = useTranslation();
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const buttonClass = isGuest
    ? "inline-flex justify-center rounded-md border border-gray-300/20 bg-black/20 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-black/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
    : "w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900";

  if (!isGuest) {
    // Версия для дропдауна в профиле
    return (
      <div className="py-1">
        <div className="px-4 py-2 text-xs text-gray-500">Язык</div>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`w-full text-left px-4 py-2 text-sm ${
              currentLanguage.code === lang.code
                ? 'bg-indigo-50 text-indigo-600 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {lang.name}
          </button>
        ))}
      </div>
    );
  }
  
  // Версия для гостевой страницы
  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className={buttonClass}>
          <LanguageIcon className="mr-2 -ml-1 h-5 w-5" aria-hidden="true" />
          {currentLanguage.name}
          <ChevronDownIcon className="ml-2 -mr-1 h-5 w-5" aria-hidden="true" />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {languages.map((lang) => (
              <Menu.Item key={lang.code}>
                {({ active }) => (
                  <button
                    onClick={() => changeLanguage(lang.code)}
                    className={`${
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                    } group flex w-full items-center rounded-md px-4 py-2 text-sm`}
                  >
                    {lang.name}
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default LanguageSwitcher; 