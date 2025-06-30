import React from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import './UsernameWithBadge.css';

// Иконки скопированы для простоты, в идеале их можно вынести в общий файл
const CrownIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 5C12.5523 5 13 4.55228 13 4C13 3.44772 12.5523 3 12 3C11.4477 3 11 3.44772 11 4C11 4.55228 11.4477 5 12 5ZM7.5 6.5C7.77614 6.5 8 6.27614 8 6C8 5.72386 7.77614 5.5 7.5 5.5C7.22386 5.5 7 5.72386 7 6C7 6.27614 7.22386 6.5 7.5 6.5ZM16.5 6.5C16.7761 6.5 17 6.27614 17 6C17 5.72386 16.7761 5.5 16.5 5.5C16.2239 5.5 16 5.72386 16 6C16 6.27614 16.2239 6.5 16.5 6.5ZM19 18H5L4 10L9 12L12 7L15 12L20 10L19 18Z" />
  </svg>
);

const ShieldIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12c5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
  </svg>
);

const UsernameWithBadge = ({ user, className }) => {
  if (!user) return <span className={classNames('username-badge-container', className)}>Неизвестный</span>;

  const isAdmin = user.roles?.admin;
  const isModerator = user.roles?.moderator;
  
  const RoleIcon = isAdmin ? CrownIcon : isModerator ? ShieldIcon : null;
  const title = isAdmin 
    ? "Официальный аккаунт Администратора" 
    : isModerator 
    ? "Официальный аккаунт Модератора" 
    : undefined;

  const iconClass = isAdmin 
    ? 'role-badge-icon-admin' 
    : isModerator 
    ? 'role-badge-icon-moderator'
    : '';
    
  // Некоторые объекты пользователя могут иметь `author` вместо `user`
  const username = user.username || user.name || 'Пользователь';
  const profileLink = `/profile/${username}`;

  return (
    <span className={classNames('username-badge-container', className)}>
      <Link to={profileLink} className="username-link">
        {username}
      </Link>
      {RoleIcon && (
        <RoleIcon 
          className={classNames('role-badge-icon', iconClass)}
          title={title}
        />
      )}
    </span>
  );
};

export default UsernameWithBadge; 