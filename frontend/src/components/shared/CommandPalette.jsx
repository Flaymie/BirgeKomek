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
  FileText,
  MessageSquare,
  Briefcase,
  Info,
  Shield,
  Book,
  LifeBuoy
} from 'lucide-react';
import { FiCommand } from 'react-icons/fi';

const CommandPalette = () => {
  const { isOpen, closePalette } = useCommandPalette();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const commands = [
    {
      name: 'Главная',
      action: () => navigate('/'),
      icon: <Home className="h-5 w-5" />,
      category: 'Навигация',
    },
    {
      name: 'Все заявки',
      action: () => navigate('/requests'),
      icon: <Briefcase className="h-5 w-5" />,
      category: 'Навигация',
    },
    {
      name: 'Мой профиль',
      action: () => user && navigate(`/users/${user._id}`),
      icon: <User className="h-5 w-5" />,
      category: 'Аккаунт',
      requiresAuth: true,
    },
    {
        name: 'Мои заявки',
        action: () => navigate('/my-requests'),
        icon: <FileText className="h-5 w-5" />,
        category: 'Аккаунт',
        requiresAuth: true,
    },
    {
      name: 'Чаты',
      action: () => navigate('/chats'),
      icon: <MessageSquare className="h-5 w-5" />,
      category: 'Аккаунт',
      requiresAuth: true,
    },
    {
      name: 'О нас',
      action: () => navigate('/about'),
      icon: <Info className="h-5 w-5" />,
      category: 'Информация',
    },
    {
      name: 'Условия использования',
      action: () => navigate('/terms'),
      icon: <Book className="h-5 w-5" />,
      category: 'Информация',
    },
    {
      name: 'Политика конфиденциальности',
      action: () => navigate('/privacy'),
      icon: <Shield className="h-5 w-5" />,
      category: 'Информация',
    },
    {
        name: 'Помощь',
        action: () => navigate('/help'),
        icon: <LifeBuoy className="h-5 w-5" />,
        category: 'Информация',
    },
    {
      name: 'Выйти',
      action: () => {
        logout();
        navigate('/login');
      },
      icon: <LogOut className="h-5 w-5" />,
      category: 'Аккаунт',
      requiresAuth: true,
    },
  ];

  const filteredCommands =
    query === ''
      ? commands
      : commands.filter((command) => {
          return command.name.toLowerCase().includes(query.toLowerCase());
        });
        
  const availableCommands = filteredCommands.filter(cmd => !cmd.requiresAuth || (cmd.requiresAuth && user));

  const handleSelect = (command) => {
    command.action();
    closePalette();
  };
  
  // Reset query when palette is opened/closed
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
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm transition-opacity" />
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
            <Dialog.Panel className="mx-auto max-w-xl transform divide-y divide-gray-700 overflow-hidden rounded-xl bg-gray-800 shadow-2xl ring-1 ring-black ring-opacity-5 transition-all">
              <Combobox onChange={handleSelect}>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-500"
                    aria-hidden="true"
                  />
                  <Combobox.Input
                    className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-100 placeholder-gray-500 focus:ring-0 sm:text-sm"
                    placeholder="Что ищем, командир?"
                    onChange={(event) => setQuery(event.target.value)}
                    autoComplete="off"
                  />
                </div>

                {availableCommands.length > 0 && (
                  <Combobox.Options static className="max-h-80 scroll-py-2 divide-y divide-gray-700 overflow-y-auto">
                    {Object.entries(
                      availableCommands.reduce((acc, command) => {
                        if (!acc[command.category]) {
                          acc[command.category] = [];
                        }
                        acc[command.category].push(command);
                        return acc;
                      }, {})
                    ).map(([category, commands]) => (
                      <li key={category} className="p-2">
                        <h2 className="text-xs font-semibold text-gray-400 px-3 mb-1">{category}</h2>
                        <ul className="text-sm text-gray-300">
                          {commands.map((command) => (
                            <Combobox.Option
                              key={command.name}
                              value={command}
                              className={({ active }) =>
                                `flex cursor-pointer select-none items-center rounded-md px-3 py-2 ${
                                  active ? 'bg-indigo-600 text-white' : ''
                                }`
                              }
                            >
                              {({ active }) => (
                                <>
                                  <div className={`mr-3 ${active ? 'text-white' : 'text-gray-500'}`}>{command.icon}</div>
                                  <span>{command.name}</span>
                                </>
                              )}
                            </Combobox.Option>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </Combobox.Options>
                )}

                {query !== '' && availableCommands.length === 0 && (
                  <div className="px-6 py-14 text-center sm:px-14">
                    <FiCommand className="mx-auto h-8 w-8 text-gray-500" />
                    <p className="mt-4 text-base text-gray-200">Ничего не найдено по вашему запросу.</p>
                    <p className="text-sm text-gray-500">Попробуйте другие ключевые слова.</p>
                  </div>
                )}
              </Combobox>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default CommandPalette; 