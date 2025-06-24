import React from 'react';

const PasswordStrengthMeter = ({ score }) => {
  const strengthLevels = [
    { label: 'Очень слабый', color: 'bg-red-500' },
    { label: 'Слабый', color: 'bg-orange-500' },
    { label: 'Средний', color: 'bg-yellow-500' },
    { label: 'Хороший', color: 'bg-green-500' },
    { label: 'Отличный', color: 'bg-emerald-500' },
  ];

  const level = strengthLevels[score] || strengthLevels[0];

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-gray-600">Надежность пароля:</span>
        <span className={`text-xs font-bold ${level.color.replace('bg-', 'text-')}`}>{level.label}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div 
            className={`h-1.5 rounded-full ${level.color} transition-all duration-300`}
            style={{ width: `${(score + 1) * 20}%`}}
        ></div>
      </div>
    </div>
  );
};

export default PasswordStrengthMeter; 