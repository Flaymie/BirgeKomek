import React, { createContext, useState, useContext } from 'react';

const ModalContext = createContext();

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    onSuccess: () => {},
  });

  const openModal = (options = {}) => {
    setModalState({
      isOpen: true,
      onSuccess: options.onSuccess || (() => {}),
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      onSuccess: () => {},
    });
  };

  const value = {
    isOpen: modalState.isOpen,
    onSuccess: modalState.onSuccess,
    openModal,
    closeModal,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
}; 