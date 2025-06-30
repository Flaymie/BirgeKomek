import React from 'react';
import './RoleBadge.css';

const CrownIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5M19 18H5V20H19V18Z" />
  </svg>
);

const ShieldIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12c5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
  </svg>
);

const RoleBadge = ({ user }) => {
  if (!user?.roles) {
    return null;
  }

  const isAdmin = user.roles.admin;
  const isModerator = user.roles.moderator;

  if (!isAdmin && !isModerator) {
    return null;
  }

  const badgeConfig = {
    admin: {
      Icon: CrownIcon,
      title: 'Администратор',
      iconClassName: 'w-4 h-4 text-yellow-500',
    },
    moderator: {
      Icon: ShieldIcon,
      title: 'Модератор',
      iconClassName: 'w-4 h-4 text-blue-500',
    },
  };

  const role = isAdmin ? 'admin' : 'moderator';
  const { Icon, title, iconClassName } = badgeConfig[role];

  return (
    <div className="relative group inline-block ml-1.5 align-middle">
      <Icon className={iconClassName} />
      <div 
        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 
                   opacity-0 group-hover:opacity-100 
                   bg-gray-800 text-white text-xs rounded-md px-2 py-1
                   transition-opacity duration-300 pointer-events-none z-20
                   whitespace-nowrap shadow-lg"
      >
        {title}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
      </div>
    </div>
  );
};

export default RoleBadge; 