import React, { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import toast from 'react-hot-toast';

const PushNotificationManager = () => {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscription, setSubscription] = useState(null);
    const [registration, setRegistration] = useState(null);

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready.then(reg => {
                setRegistration(reg);
                reg.pushManager.getSubscription().then(sub => {
                    if (sub) {
                        setIsSubscribed(true);
                        setSubscription(sub);
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
            if (!registration) return;

            // VAPID Public Key (Generated just now)
            const publicVapidKey = 'BA5CEaD6DYK2pdQUiWJ_XTraje5ECyomQylU1DeUl-G74llOvrHmY46yyvM3acto0ZKEatRPzfwQSUX810fvHnU';

            console.log('Push: Requesting subscription...');
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });

            console.log('Push Subscription Success:', JSON.stringify(sub));
            setSubscription(sub);
            setIsSubscribed(true);

            toast.success('Уведомления включены! (Токен в консоли)');
        } catch (error) {
            console.error('Failed to subscribe:', error);
            // Show detailed error to user for debugging
            toast.error(`Ошибка Push: ${error.message || 'Неизвестная ошибка'}`);
        }
    };

    const unsubscribeUser = async () => {
        try {
            if (subscription) {
                await subscription.unsubscribe();
                setSubscription(null);
                setIsSubscribed(false);
                toast.success('Уведомления отключены');
            }
        } catch (error) {
            console.error('Error unsubscribing', error);
        }
    };

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return null;
    }

    return (
        <button
            onClick={isSubscribed ? unsubscribeUser : subscribeUser}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${isSubscribed
                ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
        >
            {isSubscribed ? <Bell size={18} /> : <BellOff size={18} />}
            <span className="text-sm font-medium">
                {isSubscribed ? 'Push вкл.' : 'Включить Push'}
            </span>
        </button>
    );
};

export default PushNotificationManager;
