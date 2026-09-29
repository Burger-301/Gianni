const CACHE_NAME = 'rg-solucoes-v3';
const assetsToCache = [
    './',
    './index.html',
    './clientes.html',
    './nova-os.html',
    './login.html',
    './css/style.css',
    './ig/ico.png'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(assetsToCache);
        })
    );
    self.skipWaiting();
});

// Ativação e limpeza de caches antigas
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clientsClaim();
});

// Interceção de pedidos com suporte a navegação PWA
self.addEventListener('fetch', (event) => {
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Se for um pedido de abertura de página (navegação), garante que o index.html é servido
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match('./index.html') || caches.match('./');
                })
        );
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});
