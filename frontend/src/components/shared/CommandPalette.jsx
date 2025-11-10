import React, { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Combobox, Transition } from '@headlessui/react';
import { useCommandPalette } from '../../context/CommandPaletteContext';
import { useAuth } from '../../context/AuthContext';
import { Search } from 'lucide-react';

const CommandPalette = () => {
  const { isOpen, closePalette } = useCommandPalette();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const allCommands = React.useMemo(() => [
    // Основные команды
    { name: 'Главная', description: 'Перейти на главную страницу', action: () => navigate('/') },
    { name: 'Все заявки', description: 'Посмотреть все активные заявки', action: () => navigate('/requests') },
    
    // Команды только для авторизованных
    { name: 'Мой профиль', description: 'Перейти в личный кабинет', action: () => currentUser && navigate(`/users/${currentUser._id}`), requiresAuth: true },
    { name: 'Мои заявки', description: 'Просмотреть созданные вами заявки', action: () => navigate('/my-requests'), requiresAuth: true },
    { name: 'Чаты', description: 'Открыть список ваших диалогов', action: () => navigate('/chats'), requiresAuth: true },
    { name: 'Выйти', description: 'Завершить текущий сеанс', action: () => { logout(); navigate('/login'); }, requiresAuth: true },
    
    // Команды только для гостей
    { name: 'Войти', description: 'Авторизоваться в системе', action: () => navigate('/login'), requiresGuest: true },
    { name: 'Регистрация', description: 'Создать новый аккаунт', action: () => navigate('/register'), requiresGuest: true },
    
    // Команды для персонала
    { name: 'Жалобы', description: 'Перейти к списку жалоб', action: () => navigate('/reports'), requiresRole: ['admin', 'moderator'] },
    { name: 'Аналитика', description: 'Просмотреть статистику платформы', action: () => navigate('/analytics'), requiresRole: ['admin'] },
    
    // Информационные страницы
    { name: 'О нас', description: 'Узнать больше о проекте', action: () => navigate('/about') },
    { name: 'Условия использования', description: 'Прочитать правила сервиса', action: () => navigate('/terms') },
    { name: 'Политика конфиденциальности', description: 'Как мы обрабатываем ваши данные', action: () => navigate('/privacy') },
  ], [navigate, currentUser, logout]);

  const getAvailableCommands = React.useCallback(() => {
    const baseCommands = allCommands.filter(c => !c.requiresAuth && !c.requiresGuest && !c.requiresRole);
    const guestCommands = allCommands.filter(c => c.requiresGuest);
    const authCommands = allCommands.filter(c => c.requiresAuth);
    const staffCommands = allCommands.filter(c => c.requiresRole);

    if (currentUser) {
        const userRoles = currentUser.roles || {};
        const availableStaffCommands = staffCommands.filter(c => 
            c.requiresRole.some(role => userRoles[role])
        );
        return [...baseCommands, ...authCommands, ...availableStaffCommands];
    } else {
        const publicCommands = ['Главная', 'Условия использования', 'Политика конфиденциальности'];
        const minimalGuestCommands = baseCommands.filter(c => publicCommands.includes(c.name));
        return [...minimalGuestCommands, ...guestCommands];
    }
  }, [currentUser, allCommands]);
  
  const [availableCommands, setAvailableCommands] = useState(getAvailableCommands());

  useEffect(() => {
    setAvailableCommands(getAvailableCommands());
  }, [getAvailableCommands]);

  const filteredCommands = query === ''
    ? availableCommands
    : availableCommands.filter(command => 
        command.name.toLowerCase().includes(query.toLowerCase()) || 
        command.description.toLowerCase().includes(query.toLowerCase())
      );

  const handleSelect = (command) => {
    if (command) {
      command.action();
      closePalette();
    }
  };
  
  useEffect(() => {
    if (isOpen) {
        setQuery('');
    }
  }, [isOpen]);

  return (
    <Transition.Root show={isOpen} as={Fragment} afterLeave={() => setQuery('')}>
      <Dialog onClose={closePalette} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-16">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-lg transform overflow-hidden rounded-xl bg-white bg-opacity-95 backdrop-blur-lg shadow-2xl ring-1 ring-white ring-opacity-20 transition-all">
              <Combobox onChange={handleSelect}>
                <div className="relative border-b border-gray-200 border-opacity-30">
                  <Search
                    className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-gray-500"
                    aria-hidden="true"
                  />
                  <Combobox.Input
                    className="h-12 w-full border-0 bg-transparent pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:ring-0 text-sm font-medium"
                    placeholder="Поиск команд..."
                    onChange={(event) => setQuery(event.target.value)}
                    autoComplete="off"
                  />
                </div>
                
                {filteredCommands.length > 0 ? (
                  <Combobox.Options static className="max-h-80 overflow-y-auto py-2">
                    {filteredCommands.map((command) => (
                      <Combobox.Option
                        key={command.name}
                        value={command}
                        className={({ active }) =>
                          `flex cursor-pointer select-none items-center px-4 py-3 text-sm transition-colors rounded-md mx-2 ${
                            active ? 'bg-indigo-100 bg-opacity-60 text-indigo-900' : 'text-gray-800 hover:bg-gray-100 hover:bg-opacity-50'
                          }`
                        }
                      >
                        {({ active }) => (
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${active ? 'text-indigo-900' : 'text-gray-900'}`}>
                              {command.name}
                            </p>
                            <p className={`truncate text-xs mt-0.5 ${active ? 'text-indigo-700' : 'text-gray-500'}`}>
                              {command.description}
                            </p>
                          </div>
                        )}
                      </Combobox.Option>
                    ))}
                  </Combobox.Options>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <Search className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-3 text-sm font-medium text-gray-700">Ничего не найдено</p>
                    <p className="text-xs text-gray-500 mt-1">Попробуйте другие ключевые слова</p>
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