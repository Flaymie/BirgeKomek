import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  // Пока грузятся данные о пользователе, показываем крутилку
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Если юзера нет - на логин
  if (!currentUser) {
      return <Navigate to="/login" replace />;
  }

  // Если есть, но он не админ - показываем отказ
  if (!currentUser.roles?.admin) {
    return (
        <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              minHeight: '80vh',
              textAlign: 'center',
              p: 2
            }}
        >
            <Typography variant="h1" style={{ color: '#f44336' }}>
              403
            </Typography>
            <Typography variant="h6" style={{ color: 'text.secondary', marginBottom: '20px' }}>
              Доступ запрещен. Только администраторы могут войти в этот раздел.
            </Typography>
            <Button variant="contained" component={RouterLink} to="/">
              На главную
            </Button>
        </Box>
    );
  }

  // Если все проверки пройдены - пускаем
  return children;
};

export default AdminRoute; 