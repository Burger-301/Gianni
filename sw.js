self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open('rg-solucoes-cache-v1').then((cache) => {
            return cache.addAll([
                'index.html',
                'clientes.html',
                'nova-os.html',
                'login.html',
                'css/style.css',
                'img/logo.png'
            ]);
        })
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
