import { serverURL } from './api';

export const formatAvatarUrl = (data) => {
  let avatarPath = '';

  if (!data) return null;

  if (typeof data === 'string') {
    avatarPath = data;
  } else if (typeof data === 'object' && data.avatar) {
    avatarPath = data.avatar;
  } else {
    return null;
  }
  
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }
  
  if (avatarPath.startsWith('data:image')) {
    return avatarPath;
  }

  if (avatarPath.startsWith('uploads/') || avatarPath.startsWith('/uploads/')) {
    const cleanAvatarPath = avatarPath.startsWith('/') ? avatarPath.substring(1) : avatarPath;
    return `${serverURL}/${cleanAvatarPath}`;
  }

  return null;
}; 