import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { FiGrid, FiUsers, FiExternalLink, FiFileText } from 'react-icons/fi';

const AdminLayout = () => {
  const linkClasses = "flex items-center px-4 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors duration-200";
  const activeLinkClasses = "bg-indigo-100 text-indigo-600 font-semibold";

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white p-4 border-r border-gray-200">
        <div className="flex items-center gap-3 mb-8 px-2">
           <img src="/img/logo.png" alt="Бірге Көмек" className="w-9 h-9" />
           <span className="text-xl font-bold text-gray-800">Панель</span>
        </div>
        
        <nav className="flex flex-col gap-2">
          <NavLink 
            to="/admin" 
            end
            className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`}
          >
            <FiGrid className="w-5 h-5 mr-3" />
            Дашборд
          </NavLink>
          <NavLink 
            to="/admin/users" 
            className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`}
          >
            <FiUsers className="w-5 h-5 mr-3" />
            Пользователи
          </NavLink>
          <NavLink 
            to="/admin/requests" 
            className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`}
          >
            <FiFileText className="w-5 h-5 mr-3" />
            Заявки
          </NavLink>
          <NavLink 
            to="/" 
            className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`}
          >
            <FiExternalLink className="w-5 h-5 mr-3" />
            На сайт
          </NavLink>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
            <div className="px-8 py-4 h-[69px]">
               {/* Title removed */}
            </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout; 