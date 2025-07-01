import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import useDebounce from '../../hooks/useDebounce';
import { ClipLoader } from 'react-spinners'; // Красивый спиннер

const CityAutocomplete = ({ value, onCitySelect, name, placeholder }) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  const wrapperRef = useRef(null);

  // Получаем API ключ с нашего бэкенда
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/config/dadata-key', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setApiKey(res.data.apiKey);
      } catch (err) {
        console.error("Failed to fetch DaData API key", err);
        setError('Не удалось загрузить ключ для поиска городов.');
      }
    };
    fetchApiKey();
  }, []);

  const debouncedSearchTerm = useDebounce(inputValue, 500); // 500ms задержка

  const fetchSuggestions = useCallback(async (searchTerm) => {
    if (!searchTerm || !apiKey) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
        {
          query: searchTerm,
          count: 5,
          language: 'ru',
          locations: [{ "country": "Казахстан" }], // Ищем только по Казахстану
          from_bound: { "value": "city" },
          to_bound: { "value": "city" }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Token ${apiKey}`
          }
        }
      );
      
      const rawSuggestions = response.data.suggestions
        .map(s => ({
          city: s.data.city || s.data.settlement,
          region: s.data.region_with_type,
        }))
        .filter(s => s.city);

      // Убираем дубликаты, оставляя уникальные пары город+регион
      const uniqueSuggestions = rawSuggestions.reduce((acc, current) => {
        if (!acc.some(item => item.city === current.city && item.region === current.region)) {
          acc.push(current);
        }
        return acc;
      }, []);
      
      setSuggestions(uniqueSuggestions);
      setShowSuggestions(true);

    } catch (err) {
      console.error("Error fetching city suggestions:", err);
      setError('Ошибка при поиске города.');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    if (debouncedSearchTerm) {
      fetchSuggestions(debouncedSearchTerm);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedSearchTerm, fetchSuggestions]);


  // Закрытие списка при клике вне
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSuggestionClick = (suggestion) => {
    let finalValue = suggestion.city;
    // Если регион это не просто 'г. Город', а что-то осмысленное, добавляем его
    if (suggestion.region && !suggestion.region.toLowerCase().includes(suggestion.city.toLowerCase())) {
        finalValue = `${suggestion.city}, ${suggestion.region}`;
    }

    setInputValue(finalValue);
    setSuggestions([]);
    setShowSuggestions(false);
    onCitySelect({ target: { name: name, value: finalValue } });
  };
  
  // Устанавливаем начальное значение из пропсов
  useEffect(() => {
      setInputValue(value || '');
  }, [value]);


  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          name={name}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => inputValue && suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder || "Начните вводить город..."}
          className="form-input w-full pr-10"
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <ClipLoader size={20} color={"#4A90E2"} />
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-20 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-auto shadow-lg">
          {suggestions.map((s, index) => (
            <li
              key={index}
              onClick={() => handleSuggestionClick(s)}
              className="p-3 hover:bg-blue-50 cursor-pointer transition-colors duration-150"
            >
              <p className="font-medium text-gray-800">{s.city}</p>
              <p className="text-sm text-gray-500">{s.region}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CityAutocomplete; 