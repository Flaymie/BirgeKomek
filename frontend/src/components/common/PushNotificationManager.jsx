import React, { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'react-hot-toast'; // or react-toastify, likely hot-toast based on imports
import { api } from '../../services/api';

const PushNotificationManager = () => {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscription, setSubscription] = useState(null);
    const [registration, setRegistration] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready.then(reg => {
                setRegistration(reg);
                reg.pushManager.getSubscription().then(sub => {
                    if (sub) {
                        setIsSubscribed(true);
                        setSubscription(sub);
                        // Опционально: можно отправить подписку на бэкенд снова, чтобы убедиться что она там есть
                        // syncSubscription(sub);
                    }
                });
            });
        }
    }, []);

    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const subscribeUser = async () => {
        try {
            if (!registration) {
                toast.error('Service Worker не готов');
                return;
            }
            setLoading(true);

            // 1. Получаем публичный ключ с сервера
            const { data } = await api.get('/notifications/vapid-public-key');
            const publicVapidKey = data.publicKey;

            if (!publicVapidKey) {
                throw new Error('Не удалось получить VAPID ключ');
            }

            console.log('Push: Requesting subscription...');
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });

            // 2. Отправляем подписку на бэкенд
            await api.post('/notifications/subscribe', { subscription: sub });

            console.log('Push Subscription Success:', JSON.stringify(sub));
            setSubscription(sub);
            setIsSubscribed(true);

            toast.success('Уведомления включены!');
        } catch (error) {
            console.error('Failed to subscribe:', error);
            if (Notification.permission === 'denied') {
                toast.error('Доступ к уведомлениям запрещен в настройках браузера');
            } else {
                toast.error(`Ошибка: ${error.message || 'Не удалось подписаться'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const unsubscribeUser = async () => {
        try {
            setLoading(true);
            if (subscription) {
                await subscription.unsubscribe();
                // Тут можно добавить и удаление с бэкенда при желании
                setSubscription(null);
                setIsSubscribed(false);
                toast.success('Уведомления отключены');
            }
        } catch (error) {
            console.error('Error unsubscribing', error);
            toast.error('Ошибка при отписке');
        } finally {
            setLoading(false);
        }
    };

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return null; // Скрываем если не поддерживается
    }

    return (
        <button
            onClick={isSubscribed ? unsubscribeUser : subscribeUser}
            disabled={loading}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${isSubscribed
                ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isSubscribed ? 'Push-уведомления включены' : 'Включить Push-уведомления'}
        >
            {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
                isSubscribed ? <Bell size={18} /> : <BellOff size={18} />
            )}
            <span className="text-sm font-medium hidden sm:inline">
                {isSubscribed ? 'Push вкл.' : 'Включить Push'}
            </span>
        </button>
    );
};

export default PushNotificationManager;
