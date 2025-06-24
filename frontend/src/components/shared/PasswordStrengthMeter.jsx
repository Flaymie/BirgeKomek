import React from 'react';

const PasswordStrengthMeter = ({ score, password }) => {
  let adjustedScore = score;
  
  // Искусственно занижаем оценку, если пароль слишком простой, но длинный
  if (password) {
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSymbols = /[^a-zA-Z0-9]/.test(password);

    // Если пароль состоит ТОЛЬКО из букв, максимальная оценка - 3 ("Хороший")
    // даже если zxcvbn дает 4.
    if (score === 4 && hasLetters && !hasNumbers && !hasSymbols) {
      adjustedScore = 3;
    }
  }


  const strength = {
    0: { text: 'Очень слабый', color: 'bg-red-500' },
    1: { text: 'Слабый', color: 'bg-orange-500' },
    2: { text: 'Нормальный', color: 'bg-yellow-500' },
    3: { text: 'Хороший', color: 'bg-blue-500' },
    4: { text: 'Отличный', color: 'bg-green-500' },
  };

  const currentStrength = strength[adjustedScore] || strength[0];
  const widthPercentage = adjustedScore * 25;

  return (
    <div className="mt-2">
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${currentStrength.color}`} 
          style={{ width: `${widthPercentage}%` }}
        ></div>
      </div>
      <p className="text-sm mt-1" style={{ color: currentStrength.color.replace('bg-', '').replace('-500', '') }}>
        Надежность: {currentStrength.text}
      </p>
    </div>
  );
};

export default PasswordStrengthMeter; 