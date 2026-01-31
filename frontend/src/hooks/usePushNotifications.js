import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { toast } from 'react-hot-toast';

function urlBase64ToUint8Array(base64String) {
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
}

const usePushNotifications = () => {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check initial status
        if ('serviceWorker' in navigator && 'PushManager' in window && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then(registration => {
                registration.pushManager.getSubscription().then(subscription => {
                    setIsSubscribed(!!subscription);
                });
            });
        }
    }, []);

    const subscribeToPush = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            toast.error('Ваш браузер не поддерживает Push-уведомления');
            return;
        }

        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;

            // 1. Get Public Key
            const { data: { publicKey } } = await api.get('/notifications/vapid-public-key');
            const convertedVapidKey = urlBase64ToUint8Array(publicKey);

            // 2. Subscribe
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });

            // 3. Send to Backend
            await api.post('/notifications/subscribe', { subscription });

            setIsSubscribed(true);
            toast.success('Уведомления включены!');
        } catch (error) {
            console.error('Push subscription error:', error);
            if (Notification.permission === 'denied') {
                toast.error('Вы заблокировали уведомления. Разрешите их в настройках браузера.');
            } else {
                toast.error('Не удалось подписаться на уведомления');
            }
        } finally {
            setLoading(false);
        }
    };

    return { isSubscribed, subscribeToPush, loading };
};

export default usePushNotifications;
