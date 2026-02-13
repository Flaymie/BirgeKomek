import { useEffect } from 'react';

const useLockBodyScroll = (isOpen = true) => {
    useEffect(() => {
        if (!isOpen) return;

        // Запоминаем текущий стиль, чтобы потом вернуть как было (обычно 'auto' или пустая строка)
        const originalStyle = window.getComputedStyle(document.body).overflow;

        // Блокируем скролл
        document.body.style.overflow = 'hidden';

        // Возвращаем скролл при размонтировании или закрытии
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, [isOpen]);
};

export default useLockBodyScroll;
