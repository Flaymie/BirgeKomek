import React, { useState } from 'react';
import { Menu } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';
import { FiMoreVertical, FiEdit, FiTrash2, FiSlash, FiSend, FiCheckCircle, FiEye } from 'react-icons/fi';

const UserActionsMenu = ({ user, currentUser, handleOpenChangeRoleModal, handleOpenBanModal, handleUnban, handleOpenNotificationModal, handleOpenDeleteModal }) => {
  const navigate = useNavigate();
  const [menuDirection, setMenuDirection] = useState('down');

  const handleMenuToggle = (event) => {
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const estimatedMenuHeight = 250; // Высота меню, можно подобрать точнее

    // Если внизу места меньше, чем высота меню, И сверху места больше - открываем вверх
    if (windowHeight - buttonRect.bottom < estimatedMenuHeight && buttonRect.top > estimatedMenuHeight) {
      setMenuDirection('up');
    } else {
      setMenuDirection('down');
    }
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button
          onClick={handleMenuToggle}
          className="inline-flex justify-center w-full px-2 py-2 text-sm font-medium text-gray-700 bg-white rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75"
        >
          <FiMoreVertical className="w-5 h-5" aria-hidden="true" />
        </Menu.Button>
      </div>
      <Menu.Items
        className={`absolute right-0 w-56 bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20 ${
          menuDirection === 'up' ? 'bottom-full origin-bottom-right' : 'mt-2 origin-top-right'
        }`}
      >
        <div className="px-1 py-1 ">
            <Menu.Item>
                {({ active }) => (
                <button
                    onClick={() => navigate(`/admin/user/${user._id}`)}
                    className={`${
                    active ? 'bg-indigo-500 text-white' : 'text-gray-900'
                    } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                >
                    <FiEye className="w-5 h-5 mr-2" aria-hidden="true" />
                    Просмотреть профиль
                </button>
                )}
            </Menu.Item>
            <Menu.Item>
                {({ active }) => (
                <button
                    onClick={() => handleOpenChangeRoleModal(user)}
                    className={`${
                    active ? 'bg-indigo-500 text-white' : 'text-gray-900'
                    } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                >
                    <FiEdit className="w-5 h-5 mr-2" aria-hidden="true" />
                    Изменить роль
                </button>
                )}
            </Menu.Item>
            <Menu.Item>
                {({ active }) => (
                <button
                    onClick={() => handleOpenNotificationModal(user)}
                    className={`${
                    active ? 'bg-indigo-500 text-white' : 'text-gray-900'
                    } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                >
                    <FiSend className="w-5 h-5 mr-2" aria-hidden="true" />
                    Уведомление
                </button>
                )}
            </Menu.Item>
        </div>
        <div className="px-1 py-1">
          {user._id !== currentUser?._id && !user.roles.admin && (
            <>
              <Menu.Item>
                {({ active }) =>
                  user.banDetails?.isBanned ? (
                    <button
                      onClick={() => handleUnban(user)}
                      className={`${
                        active ? 'bg-green-500 text-white' : 'text-green-600'
                      } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                    >
                      <FiCheckCircle className="w-5 h-5 mr-2" aria-hidden="true" />
                      Разбанить
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenBanModal(user)}
                      className={`${
                        active ? 'bg-red-500 text-white' : 'text-red-600'
                      } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                    >
                      <FiSlash className="w-5 h-5 mr-2" aria-hidden="true" />
                      Забанить
                    </button>
                  )
                }
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => handleOpenDeleteModal(user)}
                    className={`${
                      active ? 'bg-red-500 text-white' : 'text-red-600'
                    } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                  >
                    <FiTrash2 className="w-5 h-5 mr-2" aria-hidden="true" />
                    Удалить
                  </button>
                )}
              </Menu.Item>
            </>
          )}
        </div>
      </Menu.Items>
    </Menu>
  );
};

export default UserActionsMenu; 