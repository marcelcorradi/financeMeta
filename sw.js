// Definição da versão do cache
const CACHE_NAME = 'financemeta-cache-v1';

// Arquivos a serem armazenados em cache
const FILES_TO_CACHE = [
  './',
  './index.html',
  './goals.html',
  './add-goal.html',
  './offline.html',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/ui.js',
  './manifest.json',
  './images/icons/icon-72x72.png',
  './images/icons/icon-96x96.png',
  './images/icons/icon-128x128.png',
  './images/icons/icon-144x144.png',
  './images/icons/icon-152x152.png',
  './images/icons/icon-192x192.png',
  './images/icons/icon-384x384.png',
  './images/icons/icon-512x512.png',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js'
];

// Evento de instalação do Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  
  // Pré-armazenar arquivos estáticos
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Armazenando arquivos em cache');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        console.log('[Service Worker] Instalação concluída');
        return self.skipWaiting();
      })
  );
});

// Evento de ativação do Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativando...');
  
  // Limpar caches antigos
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Ativação concluída');
      return self.clients.claim();
    })
  );
});

// Evento de interceptação de requisições
self.addEventListener('fetch', event => {
  console.log('[Service Worker] Interceptando requisição:', event.request.url);
  
  // Estratégia Cache First para recursos estáticos
  if (isStaticResourceRequest(event.request)) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            console.log('[Service Worker] Retornando recurso do cache:', event.request.url);
            return cachedResponse;
          }
          
          console.log('[Service Worker] Buscando recurso na rede:', event.request.url);
          return fetch(event.request)
            .then(response => {
              // Verificar se a resposta é válida
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Armazenar a resposta no cache
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            })
            .catch(error => {
              console.error('[Service Worker] Erro ao buscar recurso:', error);
              // Retornar página offline para navegação
              if (event.request.mode === 'navigate') {
                return caches.match('./offline.html');
              }
              
              return null;
            });
        })
    );
  } else {
    // Para API e outros recursos dinâmicos, tentar rede primeiro
    event.respondWith(
      fetch(event.request)
        .catch(error => {
          console.error('[Service Worker] Erro ao buscar recurso dinâmico:', error);
          // Retornar página offline para navegação
          if (event.request.mode === 'navigate') {
            return caches.match('./offline.html');
          }
          
          return null;
        })
    );
  }
});

// Verificar se a requisição é para um recurso estático
function isStaticResourceRequest(request) {
  // Verificar URL
  const url = new URL(request.url);
  
  // Verificar se é uma requisição GET
  if (request.method !== 'GET') {
    return false;
  }
  
  // Verificar se é um arquivo estático
  const isStaticFile = 
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.includes('/financemeta/') ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/goals.html') ||
    url.pathname.endsWith('/add-goal.html') ||
    url.pathname.endsWith('/settings.html') ||
    url.pathname.endsWith('/offline.html');
  
  // Verificar domínios externos para recursos CDN
  const isExternalResource =
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname === 'cdnjs.cloudflare.com';
  
  return isStaticFile || isExternalResource;
}