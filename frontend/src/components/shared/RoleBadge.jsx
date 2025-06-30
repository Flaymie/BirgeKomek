import React from 'react';
import { CrownIcon, ShieldIcon } from './RoleIcons';
import classNames from 'classnames';

const RoleBadge = ({ user, className }) => {
  if (!user?.roles) return null;

  const isAdmin = user.roles.admin;
  const isModerator = user.roles.moderator;

  if (!isAdmin && !isModerator) return null;

  const badge = isAdmin 
    ? {
        Icon: CrownIcon,
        title: 'Официальный аккаунт Администратора',
        iconClass: 'role-icon-admin'
      }
    : {
        Icon: ShieldIcon,
        title: 'Официальный аккаунт Модератора',
        iconClass: 'role-icon-moderator'
      };
      
  return (
    <span title={badge.title} className={classNames("role-badge-wrapper", className)}>
      <badge.Icon className={classNames('role-icon', badge.iconClass)} />
    </span>
  );
};

export default RoleBadge; 