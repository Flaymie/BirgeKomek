import React, { useState, useEffect, useRef } from 'react';
import { kazakhstanCities } from '../../data/kazakhstanCities';

const CityAutocomplete = ({ value, onChange, placeholder }) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

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
    const text = e.target.value;
    setInputValue(text);
    onChange(e); // Передаем оригинальное событие наверх

    if (text.length > 0) {
      const filteredSuggestions = kazakhstanCities.filter(city =>
        city.toLowerCase().startsWith(text.toLowerCase())
      );
      setSuggestions(filteredSuggestions);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
    // Имитируем событие, чтобы передать значение в родительский компонент
    onChange({ target: { name: 'location', value: suggestion } });
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        name="location" // Важно, чтобы имя совпадало с тем, что в ProfilePage
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => inputValue && setShowSuggestions(true)}
        placeholder={placeholder}
        className="mt-1 form-input w-full"
        autoComplete="off" // Отключаем нативный автокомплит
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-auto shadow-lg">
          {suggestions.map((city, index) => (
            <li
              key={index}
              onClick={() => handleSuggestionClick(city)}
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              {city}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CityAutocomplete; 