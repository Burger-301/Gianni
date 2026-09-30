const CACHE_NAME = 'rg-solucoes-v4';
const assetsToCache = [
    './index.html',
    './clientes.html',
    './nova-os.html',
    './login.html',
    './css/style.css',
    './ig/ico.png'
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
    self.clientsClaim();
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
