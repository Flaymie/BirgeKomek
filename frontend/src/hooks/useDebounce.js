import { useState, useEffect } from 'react';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Устанавливаем таймер, который обновит значение после задержки
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Очищаем таймер при каждом изменении значения или при размонтировании
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce; 