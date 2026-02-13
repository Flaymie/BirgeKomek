import React from 'react';
import { useAuth } from '../../context/AuthContext';
import UserDashboard from './UserDashboard';
import GuestHomepage from './GuestHomepage';
import AppLoader from '../shared/AppLoader';

const HomePage = () => {
  const { currentUser, loading } = useAuth();

  if (loading) return <AppLoader />;

  return currentUser ? <UserDashboard /> : <GuestHomepage />;
};

export default HomePage; 