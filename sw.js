const CACHE_NAME = 'rg-solucoes-v5';
const assetsToCache = [
    './index.html',
    './clientes.html',
    './nova-os.html',
    './horas-extras.html',
    './login.html',
    './css/style.css',
    './img/logo.png',
    './img/ico1.png'
];

// Instalação do Service Worker e criação da nova cache limpa
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(assetsToCache);
        })
    );
    self.skipWaiting();
});

// Ativação e eliminação imediata de todas as caches antigas
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
    self.clients.claim();
});

// Interceção de pedidos correta (cada página abre o seu ficheiro respetivo)
self.addEventListener('fetch', (event) => {
    if (!event.request.url.startsWith(self.location.origin)) {
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
