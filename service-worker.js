// ===================================================================================
// Service Worker
// ===================================================================================
// O Service Worker atua como um proxy entre a aplicação web, o navegador e a rede.
// Ele é essencial para funcionalidades offline, notificações push e cache de recursos.
// Roda em um processo separado do thread principal da UI, garantindo que não
// bloqueie a interação do usuário.
// ===================================================================================


// -----------------------------------------------------------------------------------
// Seção: Configuração e Inicialização do Firebase Cloud Messaging
// -----------------------------------------------------------------------------------
// Importa os scripts do Firebase SDK necessários para o funcionamento do
// Cloud Messaging em segundo plano.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

/**
 * @const {string}
 * @description Nome único para o cache da aplicação. Mudar esta versão (ex: 'v2')
 * fará com que o Service Worker antigo seja descartado e um novo seja instalado,
 * permitindo a atualização dos arquivos cacheados.
 */
const CACHE_NAME = 'minhas-memorias-cache-v1';

/**
 * @const {Array<string>}
 * @description Lista de arquivos essenciais ("App Shell") que serão cacheados
 * durante a instalação do Service Worker para garantir que a aplicação
 * possa ser carregada offline.
 */
const urlsToCache = [
  '/',
  '/index.html',
  '/auth/login.html',
  '/auth/login.css',
  '/admin/register/register.html',
  '/admin/register/register.css',
  // Recursos de CDNs também podem ser cacheados.
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Typewriter&display=swap'
];

/**
 * @const {object}
 * @description Configuração do Firebase. Deve ser a mesma do `firebase-config.js`.
 * É necessária aqui para que o Service Worker possa se comunicar com o Firebase
 * de forma independente da aplicação principal.
 */
const firebaseConfig = {
  apiKey: "AIzaSyCAjJGwKaYi6cJNrmGcdnKgO-jHYGivv0E", authDomain: "smemoria-bfaed.firebaseapp.com",
  projectId: "smemoria-bfaed", storageBucket: "smemoria-bfaed.firebasestorage.app",
  messagingSenderId: "728874899156", appId: "1:728874899156:web:81744aa120a926ff5ccd41"
};

// Inicializa o Firebase no escopo do Service Worker.
firebase.initializeApp(firebaseConfig);

/**
 * @const {firebase.messaging.Messaging}
 * @description Obtém a instância do serviço Firebase Messaging.
 */
const messaging = firebase.messaging();

/**
 * @listens messaging#onBackgroundMessage
 * @description Manipulador para mensagens de notificação push recebidas quando a
 * aplicação não está em primeiro plano (está fechada ou em outra aba).
 * @param {object} payload - O objeto da notificação enviado pelo FCM.
 */
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[service-worker.js] Mensagem em segundo plano recebida.",
    payload
  );

  // Extrai os dados da notificação do payload.
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || "IMG/favicon.png", // Usa um ícone padrão se não for fornecido.
  };

  // Exibe a notificação para o usuário usando a API de Notificações do navegador.
  self.registration.showNotification(notificationTitle, notificationOptions);
});


// -----------------------------------------------------------------------------------
// Seção: Ciclo de Vida do Service Worker (Instalação, Ativação)
// -----------------------------------------------------------------------------------

/**
 * @listens self#install
 * @description Evento disparado quando o Service Worker é instalado pela primeira vez.
 * Ideal para cachear os recursos estáticos principais da aplicação.
 */
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache aberto, adicionando arquivos principais.');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Arquivos principais cacheados com sucesso.');
        // Força o novo Service Worker a pular a fase de espera e se tornar ativo
        // imediatamente. Isso acelera a atualização para os usuários.
        return self.skipWaiting();
      })
  );
});

/**
 * @listens self#activate
 * @description Evento disparado quando o Service Worker é ativado.
 * É o momento ideal para limpar caches antigos que não são mais necessários.
 */
self.addEventListener('activate', event => {
  console.log('Service Worker: Ativando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          // Se o nome do cache não for o atual, ele é um cache antigo e deve ser deletado.
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Limpando cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Ativado e pronto para controlar a página.');
      // Garante que o Service Worker ativado assuma o controle de todas as abas
      // abertas da aplicação imediatamente, sem a necessidade de recarregar a página.
      return self.clients.claim();
    })
  );
});


// -----------------------------------------------------------------------------------
// Seção: Estratégia de Cache e Interceptação de Requisições
// -----------------------------------------------------------------------------------
// NOTA: A lógica de verificação de lembretes que talvez existisse aqui foi
// corretamente movida para uma Cloud Function no backend, que é uma abordagem
// mais robusta e confiável, pois não depende do navegador do usuário estar aberto.

/**
 * @listens self#fetch
 * @description Evento disparado para cada requisição de rede feita pela aplicação
 * (ex: buscar um CSS, uma imagem, um script, ou dados de uma API).
 * Implementa uma estratégia "Cache First":
 * 1. Tenta encontrar o recurso no cache.
 * 2. Se encontrar, retorna a resposta do cache (rápido, funciona offline).
 * 3. Se não encontrar, faz a requisição à rede.
 */
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Retorna a resposta do cache.
          return response;
        }
        // Faz a requisição à rede como fallback.
        return fetch(event.request);
      }
      )
  );
});


// -----------------------------------------------------------------------------------
// Seção: Manipulação de Eventos de Notificação
// -----------------------------------------------------------------------------------

/**
 * @listens self#message
 * @description Ouve mensagens enviadas da aplicação principal (cliente) para o
 * Service Worker. Usado aqui para permitir que a aplicação principal peça ao
 * Service Worker para exibir uma notificação.
 */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data.payload;
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

/**
 * @listens self#notificationclick
 * @description Evento disparado quando o usuário clica em uma notificação
 * gerada por este Service Worker.
 */
self.addEventListener('notificationclick', event => {
  event.notification.close(); // Fecha a notificação.

  // Foca em uma aba existente da aplicação ou abre uma nova se nenhuma estiver aberta.
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Procura por uma aba já aberta para focar nela.
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      // Se nenhuma aba estiver aberta, abre a página inicial.
      return clients.openWindow('/');
    })
  );
});
