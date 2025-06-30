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
      title: 'Официальный аккаунт Администратора',
      className: 'role-icon role-icon-admin',
    },
    moderator: {
      Icon: ShieldIcon,
      title: 'Официальный аккаунт Модератора',
      className: 'role-icon role-icon-moderator',
    },
  };

  const role = isAdmin ? 'admin' : 'moderator';
  const { Icon, title, className } = badgeConfig[role];

  return (
    <span title={title} className="role-badge-wrapper">
      <Icon className={className} />
    </span>
  );
};

export default RoleBadge; 