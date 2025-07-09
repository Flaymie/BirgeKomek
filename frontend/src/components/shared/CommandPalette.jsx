import React, { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Combobox, Transition } from '@headlessui/react';
import { useCommandPalette } from '../../context/CommandPaletteContext';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  Search,
  User,
  LogOut,
  LogIn,
  UserPlus,
  FileText,
  MessageSquare,
  Briefcase,
  Info,
  Shield,
  Book,
  LifeBuoy
} from 'lucide-react';

const CommandPalette = () => {
  const { isOpen, closePalette } = useCommandPalette();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const commands = [
    {
      name: 'Главная',
      description: 'Перейти на главную страницу',
      action: () => navigate('/'),
      icon: <Home className="h-5 w-5" />,
    },
    {
      name: 'Все заявки',
      description: 'Посмотреть все активные заявки',
      action: () => navigate('/requests'),
      icon: <Briefcase className="h-5 w-5" />,
    },
    {
      name: 'Войти',
      description: 'Авторизоваться в системе',
      action: () => navigate('/login'),
      icon: <LogIn className="h-5 w-5" />,
      requiresGuest: true,
    },
    {
      name: 'Регистрация',
      description: 'Создать новый аккаунт',
      action: () => navigate('/register'),
      icon: <UserPlus className="h-5 w-5" />,
      requiresGuest: true,
    },
    {
      name: 'Мой профиль',
      description: 'Перейти в личный кабинет',
      action: () => user && navigate(`/users/${user._id}`),
      icon: <User className="h-5 w-5" />,
      requiresAuth: true,
    },
    {
      name: 'Мои заявки',
      description: 'Просмотреть созданные вами заявки',
      action: () => navigate('/my-requests'),
      icon: <FileText className="h-5 w-5" />,
      requiresAuth: true,
    },
    {
      name: 'Чаты',
      description: 'Открыть список ваших диалогов',
      action: () => navigate('/chats'),
      icon: <MessageSquare className="h-5 w-5" />,
      requiresAuth: true,
    },
    {
      name: 'О нас',
      description: 'Узнать больше о проекте',
      action: () => navigate('/about'),
      icon: <Info className="h-5 w-5" />,
    },
    {
      name: 'Условия использования',
      description: 'Прочитать правила сервиса',
      action: () => navigate('/terms'),
      icon: <Book className="h-5 w-5" />,
    },
    {
      name: 'Политика конфиденциальности',
      description: 'Как мы обрабатываем ваши данные',
      action: () => navigate('/privacy'),
      icon: <Shield className="h-5 w-5" />,
    },
    {
      name: 'Помощь',
      description: 'Найти ответы на частые вопросы',
      action: () => navigate('/help'),
      icon: <LifeBuoy className="h-5 w-5" />,
    },
    {
      name: 'Выйти',
      description: 'Завершить текущий сеанс',
      action: () => {
        logout();
        navigate('/login');
      },
      icon: <LogOut className="h-5 w-5" />,
      requiresAuth: true,
    },
  ];

  const filteredCommands =
    query === ''
      ? commands
      : commands.filter((command) => {
          return command.name.toLowerCase().includes(query.toLowerCase()) || command.description.toLowerCase().includes(query.toLowerCase());
        });
        
  const availableCommands = filteredCommands.filter(cmd => {
    if (cmd.requiresAuth && !user) {
      return false; // Скрыть, если нужна авторизация, а ее нет
    }
    if (cmd.requiresGuest && user) {
      return false; // Скрыть, если команда только для гостей, а юзер залогинен
    }
    return true; // Показать во всех остальных случаях
  });

  const handleSelect = (command) => {
    if (command) {
      command.action();
      closePalette();
    }
  };
  
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setQuery(''), 200);
    }
  }, [isOpen]);

  return (
    <Transition.Root show={isOpen} as={Fragment} afterLeave={() => setQuery('')}>
      <Dialog onClose={closePalette} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-xl transform overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 transition-all">
              <Combobox onChange={handleSelect}>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                  <Combobox.Input
                    className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-800 placeholder-gray-400 focus:ring-0 sm:text-sm"
                    placeholder="Что ищем, командир?"
                    onChange={(event) => setQuery(event.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="border-t border-gray-100">
                {availableCommands.length > 0 ? (
                  <Combobox.Options static className="max-h-80 scroll-py-2 overflow-y-auto p-2">
                      {availableCommands.map((command) => (
                        <Combobox.Option
                          key={command.name}
                          value={command}
                          className={({ active }) =>
                            `flex cursor-pointer select-none items-center rounded-md px-3 py-3 ${
                              active ? 'bg-indigo-600 text-white' : ''
                            }`
                          }
                        >
                          {({ active }) => (
                            <>
                              <div className={`mr-4 rounded-lg p-2 ${active ? 'bg-white bg-opacity-10 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                                {command.icon}
                              </div>
                              <div>
                                <p className={`text-sm font-medium ${active ? 'text-white' : 'text-gray-900'}`}>{command.name}</p>
                                <p className={`text-sm ${active ? 'text-indigo-200' : 'text-gray-500'}`}>{command.description}</p>
                              </div>
                            </>
                          )}
                        </Combobox.Option>
                      ))}
                  </Combobox.Options>
                ) : (
                  <div className="px-6 py-14 text-center sm:px-14">
                    <Search className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-4 text-base text-gray-800">Ничего не найдено.</p>
                    <p className="text-sm text-gray-500">Попробуйте другие ключевые слова.</p>
                  </div>
                )}
                </div>
              </Combobox>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default CommandPalette; 