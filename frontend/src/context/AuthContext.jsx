// register action
const register = async (userData) => {
  dispatch({ type: 'SET_LOADING', payload: true });
  
  try {
    console.log('AuthContext: Начинаем регистрацию, данные:', userData);
    
    // Проверяем, есть ли данные аватара в userData
    if (userData.avatar) {
      console.log('AuthContext: В данных присутствует аватар:', userData.avatar.substring(0, 100) + '...');
    } else {
      console.log('AuthContext: Аватар не предоставлен в данных регистрации');
    }
    
    const response = await authService.register(userData);
    console.log('AuthContext: Ответ сервера о регистрации:', response);
    
    if (response && response.data) {
      console.log('AuthContext: Регистрация успешна, данные ответа:', response.data);
      
      dispatch({
        type: 'REGISTER_SUCCESS',
        payload: { success: true, data: response.data }
      });
      
      return { success: true, data: response.data };
    } else {
      console.error('AuthContext: Неожиданный формат ответа:', response);
      throw new Error('Неожиданный формат ответа от сервера');
    }
  } catch (error) {
    console.error('AuthContext: Ошибка при регистрации:', error);
    
    // Расширенное логирование информации об ошибке
    if (error.response) {
      console.error('AuthContext: Данные ошибки:', error.response.data);
      console.error('AuthContext: Статус ошибки:', error.response.status);
      console.error('AuthContext: Заголовки ответа:', error.response.headers);
      
      // Полезно для отладки - сериализуем полностью ответ об ошибке
      try {
        console.error('AuthContext: Полный объект ответа:', JSON.stringify(error.response));
      } catch (e) {
        console.error('AuthContext: Не удалось сериализовать объект ответа');
      }
    }
    
    dispatch({
      type: 'REGISTER_FAIL',
      payload: { error: error.response?.data?.msg || 'Ошибка регистрации' }
    });
    
    return { 
      success: false, 
      error: error.response?.data?.msg || error.message || 'Ошибка регистрации' 
    };
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false });
  }
}; 