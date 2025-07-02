import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usersService } from '../../services/api';
import { toast } from 'react-toastify';
import { ChromePicker } from 'react-color';
import classNames from 'classnames';

// Компонент-обертка для колор-пикера
const ColorPickerInput = ({ label, color, onChange, showPicker, setShowPicker }) => (
  <div className="relative">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div 
      className="w-full h-10 rounded-md border border-gray-300 cursor-pointer"
      style={{ backgroundColor: color }}
      onClick={() => setShowPicker(!showPicker)}
    />
    {showPicker && (
      <div className="absolute z-10 mt-2" onMouseLeave={() => setShowPicker(false)}>
        <ChromePicker color={color} onChange={onChange} />
      </div>
    )}
  </div>
);


const ProfileCustomizationPage = () => {
  const { currentUser, _updateCurrentUserState } = useAuth();
  const [settings, setSettings] = useState({
    colors: {
      nicknameGradient: { from: '#a855f7', to: '#ec4899' }
    }
  });
  const [loading, setLoading] = useState(false);
  
  // Состояния для отображения колор-пикеров
  const [showPicker1, setShowPicker1] = useState(false);
  const [showPicker2, setShowPicker2] = useState(false);

  useEffect(() => {
    if (currentUser?.profileCustomization) {
      const customColors = currentUser.profileCustomization.colors;
      const defaultColors = { from: '#a855f7', to: '#ec4899' };
      
      setSettings(prev => ({
        ...prev,
        colors: {
          ...prev.colors,
          nicknameGradient: {
            from: customColors?.nicknameGradient?.from || defaultColors.from,
            to: customColors?.nicknameGradient?.to || defaultColors.to
          }
        }
      }));
    }
  }, [currentUser]);

  const handleColorChange = (colorName, color) => {
    setSettings(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        nicknameGradient: {
          ...prev.colors.nicknameGradient,
          [colorName]: color.hex
        }
      }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await usersService.updateProfileCustomization({ colors: settings.colors });
      _updateCurrentUserState(res.data); // Обновляем юзера в AuthContext
      toast.success('Настройки успешно сохранены!');
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error);
      toast.error('Не удалось сохранить настройки.');
    } finally {
      setLoading(false);
      setShowPicker1(false);
      setShowPicker2(false);
    }
  };
  
  const nicknameStyle = {
    backgroundImage: `linear-gradient(135deg, ${settings.colors.nicknameGradient.from}, ${settings.colors.nicknameGradient.to})`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  };

  return (
    <div className="container-custom py-12 animate-fadeIn">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Кастомизация профиля</h1>
        <p className="text-gray-600 mb-8">Настройте внешний вид своего профиля, чтобы он стал по-настоящему уникальным.</p>
        
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 mb-6">Цвет никнейма</h2>
          
          <div className="mb-6 p-6 rounded-lg bg-gray-900">
            <p className="text-center text-2xl font-bold" style={nicknameStyle}>
              {currentUser?.username || "Ваш никнейм"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <ColorPickerInput 
              label="Начальный цвет градиента"
              color={settings.colors.nicknameGradient.from}
              onChange={(color) => handleColorChange('from', color)}
              showPicker={showPicker1}
              setShowPicker={setShowPicker1}
            />
            <ColorPickerInput 
              label="Конечный цвет градиента"
              color={settings.colors.nicknameGradient.to}
              onChange={(color) => handleColorChange('to', color)}
              showPicker={showPicker2}
              setShowPicker={setShowPicker2}
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={loading}
              className={classNames("btn btn-primary", { "opacity-50 cursor-not-allowed": loading })}
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCustomizationPage; 