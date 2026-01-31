/* eslint-disable no-restricted-globals */
// Dev Service Worker for Push Notifications - v2 (Fix JSON handling)

self.addEventListener('push', function (event) {
    if (event.data) {
        console.log('Push event received:', event.data.text()); // Логируем сырые данные
        let data;
        try {
            // Пытаемся распарсить как JSON
            data = event.data.json();
            console.log('Parsed JSON data:', data); // Логируем JSON объект
        } catch (e) {
            // Если ошибка парсинга, то это просто текст
            console.log('Push data is not JSON:', event.data.text());
            data = {
                title: 'Новое уведомление',
                body: event.data.text(),
                url: '/'
            };
        }

        // Если пришел пустой объект или null
        if (!data) {
            data = { title: 'Уведомление', body: 'Новое событие', url: '/' };
        }

        const options = {
            body: data.body || 'Без описания',
            icon: '/img/logo_site_192.png', // ИСПРАВЛЕНО: Правильный путь к иконке
            badge: '/img/logo_site_192.png',
            vibrate: [100, 50, 100],
            requireInteraction: true, // ИСПРАВЛЕНО: Уведомление висит пока не закроешь
            data: {
                dateOfArrival: Date.now(),
                primaryKey: '2',
                url: data.url || '/'
            }
        };

        event.waitUntil(
            clients.matchAll({ type: 'window' }).then(windowClients => {
                // Проверяем, есть ли активная (сфокусированная) вкладка
                const isFocused = windowClients.some(client => client.focused);

                if (isFocused) {
                    console.log('Window is focused, skipping notification');
                    return; // Не показываем уведомление
                }

                return self.registration.showNotification(data.title || 'Бірге Көмек', options);
            })
        );
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            const urlToOpen = event.notification.data.url || '/';

            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url && 'focus' in client) {
                    // Если уже открыта вкладка с этим URL (или просто сайт), фокусируемся
                    if (client.url.includes(urlToOpen)) {
                        return client.focus();
                    }
                    // Если просто сайт открыт, но на другой странице - переходим и фокус
                    return client.navigate(urlToOpen).then(c => c.focus());
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
