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
      nicknameGradient: { from: '#a855f7', to: '#ec4899' },
      profileRam: { from: '#a855f7', to: '#ec4899' },
    }
  });
  const [loading, setLoading] = useState(false);
  
  // Состояния для отображения колор-пикеров
  const [showPickerNick1, setShowPickerNick1] = useState(false);
  const [showPickerNick2, setShowPickerNick2] = useState(false);
  const [showPickerRam1, setShowPickerRam1] = useState(false);
  const [showPickerRam2, setShowPickerRam2] = useState(false);

  useEffect(() => {
    if (currentUser?.profileCustomization) {
      const customColors = currentUser.profileCustomization.colors;
      const defaultNickColors = { from: '#a855f7', to: '#ec4899' };
      const defaultRamColors = { from: '#a855f7', to: '#ec4899' };
      
      setSettings(prev => ({
        ...prev,
        colors: {
          nicknameGradient: {
            from: customColors?.nicknameGradient?.from || defaultNickColors.from,
            to: customColors?.nicknameGradient?.to || defaultNickColors.to
          },
          profileRam: {
            from: customColors?.profileRam?.from || defaultRamColors.from,
            to: customColors?.profileRam?.to || defaultRamColors.to
          }
        }
      }));
    }
  }, [currentUser]);

  const handleColorChange = (type, colorName, color) => {
    setSettings(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [type]: {
          ...prev.colors[type],
          [colorName]: color.hex
        }
      }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await usersService.updateProfileCustomization({ colors: settings.colors });
      _updateCurrentUserState(res.data);
      toast.success('Настройки успешно сохранены!');
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error);
      toast.error('Не удалось сохранить настройки.');
    } finally {
      setLoading(false);
      setShowPickerNick1(false);
      setShowPickerNick2(false);
      setShowPickerRam1(false);
      setShowPickerRam2(false);
    }
  };
  
  const nicknameStyle = {
    backgroundImage: `linear-gradient(135deg, ${settings.colors.nicknameGradient.from}, ${settings.colors.nicknameGradient.to})`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  };

  const ramStyle = {
    border: '2px solid transparent',
    backgroundImage: `linear-gradient(white, white), linear-gradient(135deg, ${settings.colors.profileRam.from}, ${settings.colors.profileRam.to})`,
    backgroundOrigin: 'border-box',
    backgroundClip: 'padding-box, border-box',
  };

  return (
    <div className="container-custom py-12 animate-fadeIn">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Кастомизация профиля</h1>
        <p className="text-gray-600 mb-8">Настройте внешний вид своего профиля, чтобы он стал по-настоящему уникальным.</p>
        
        <div className="bg-white p-8 rounded-lg shadow-md mb-8">
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
              onChange={(color) => handleColorChange('nicknameGradient', 'from', color)}
              showPicker={showPickerNick1}
              setShowPicker={setShowPickerNick1}
            />
            <ColorPickerInput 
              label="Конечный цвет градиента"
              color={settings.colors.nicknameGradient.to}
              onChange={(color) => handleColorChange('nicknameGradient', 'to', color)}
              showPicker={showPickerNick2}
              setShowPicker={setShowPickerNick2}
            />
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 mb-6">Цвет рамки профиля</h2>
          
          <div className="mb-6 p-6 rounded-lg" style={ramStyle}>
            <p className="text-center text-lg font-bold text-gray-700">
              Так будет выглядеть рамка вашего профиля
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <ColorPickerInput 
              label="Начальный цвет градиента рамки"
              color={settings.colors.profileRam.from}
              onChange={(color) => handleColorChange('profileRam', 'from', color)}
              showPicker={showPickerRam1}
              setShowPicker={setShowPickerRam1}
            />
            <ColorPickerInput 
              label="Конечный цвет градиента рамки"
              color={settings.colors.profileRam.to}
              onChange={(color) => handleColorChange('profileRam', 'to', color)}
              showPicker={showPickerRam2}
              setShowPicker={setShowPickerRam2}
            />
          </div>
        </div>
        
        <div className="flex justify-end mt-8">
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
  );
};

export default ProfileCustomizationPage; 