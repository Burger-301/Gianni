const CACHE_NAME = 'rg-solucoes-v2';
const assetsToCache = [
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
            return cache.addAll(assetsToCache).catch((err) => {
                console.log('Aviso ao carregar cache:', err);
            });
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

// Interceção de pedidos (Network First, com fallback para cache)
self.addEventListener('fetch', (event) => {
    // Ignora pedidos externos (como Firebase, CDNs de PDF, etc.) para evitar conflitos
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
