function updateBadgeCount(tabId){if(!currentUser)return;const badge=document.getElementById("badge_"+tabId);if(!badge)return;db.collection("postits").where("uid","==",currentUser.uid).where("category","==",tabId).onSnapshot(snap=>{const count=snap.size;badge.style.display=count>0?"inline-block":"none";if(count>0)badge.textContent=count;let overdue=false,pending=false;snap.docs.forEach(d=>{const n=d.data();if(n.dueDate){const t=new Date();t.setHours(0,0,0,0);const due=new Date(n.dueDate.split('-')[0],n.dueDate.split('-')[1]-1,n.dueDate.split('-')[2]);due.setHours(0,0,0,0);if(due<=t)overdue=true;else pending=true;}if(overdue)return;});badge.style.backgroundColor=overdue?'#dc143c':(pending?'#1d7e14':'#6e3c0e');badge.title=overdue?'Vencidos/Hoje':(pending?'Pendentes':(count>0?`${count} nota(s)`:''));},e=>{console.error("Erro badge:",e);badge.style.display='none';});}

function updateBadgeCount(tabId){if(!currentUser)return;const badge=document.getElementById("badge_"+tabId);if(!badge)return;db.collection("postits").where("uid","==",currentUser.uid).where("category","==",tabId).onSnapshot(snap=>{const count=snap.size;badge.style.display=count>0?"inline-block":"none";if(count>0)badge.textContent=count;let overdue=false,pending=false;snap.docs.forEach(d=>{const n=d.data();if(n.dueDate){const t=new Date();t.setHours(0,0,0,0);const due=new Date(n.dueDate.split('-')[0],n.dueDate.split('-')[1]-1,n.dueDate.split('-')[2]);due.setHours(0,0,0,0);if(due<=t)overdue=true;else pending=true;}if(overdue)return;});badge.style.backgroundColor=overdue?'#dc143c':(pending?'#1d7e14':'#6e3c0e');badge.title=overdue?'Vencidos/Hoje':(pending?'Pendentes':(count>0?`${count} nota(s)`:''));},e=>{console.error("Erro badge:",e);badge.style.display='none';});}

// ===================================================================================
// Estado Global da Aplicação
// ===================================================================================
// Este arquivo define as variáveis globais que controlam o estado da aplicação.
// Ele deve ser o primeiro script a ser carregado para que estas variáveis
// estejam disponíveis para todos os outros módulos.
//
// SUGESTÃO DE MELHORIA:
// Para aplicações maiores e mais complexas, o uso de variáveis globais pode
// dificultar o rastreamento de alterações de estado. Considerar a implementação
// de um padrão de gerenciamento de estado mais robusto, como Redux, Vuex, ou
// mesmo um objeto de estado centralizado com funções "setter" para controlar
// as mutações. Isso tornaria o fluxo de dados mais previsível e fácil de depurar.
// ===================================================================================

/**
 * @type {object|null}
 * @description Armazena o objeto do usuário atualmente autenticado no Firebase.
 * `null` se nenhum usuário estiver logado.
 */
let currentUser = null;

/**
 * @type {string|null}
 * @description Armazena o ID da aba pessoal (categoria) atualmente selecionada.
 * Essencial para filtrar as notas e saber qual aba destacar na UI.
 */
let currentTab = null;

/**
 * @type {object}
 * @property {string|null} id - O ID da instância do tema/subtema selecionado.
 * @property {string|null} type - O ID do "tipo de tema" pai.
 * @property {string|null} name - O nome do tema/subtema selecionado.
 * @description Mantém as informações sobre o tema (ou subtema) ativo.
 * Usado para carregar as notas corretas quando se está na visualização de temas.
 */
let currentThemeInfo = { id: null, type: null, name: null };

/**
 * @type {string|null}
 * @description Armazena o ID do tipo de tema que está sendo visualizado.
 * (Ex: "Receitas", "Projetos").
 * NOTA: Esta variável parece ter uma sobreposição de responsabilidade com `currentThemeInfo.type`.
 * Seria bom revisar se ambas são necessárias ou se o estado pode ser unificado.
 */
let currentThemeType = null;

/**
 * @type {Array<object>}
 * @description Um array com os objetos de "tipos de tema" do usuário.
 * Cada objeto contém ID, nome, ícone, etc. Usado para popular menus e dropdowns.
 * Carregado a partir do Firestore.
 */
let currentUserThemeTypesArray = [];

/**
 * @type {object}
 * @description Um mapa (objeto) dos "tipos de tema" do usuário, usando o ID como chave.
 * Permite acesso rápido às configurações de um tipo de tema (`O(1)`) sem ter que
 * varrer o `currentUserThemeTypesArray`.
 * Ex: `currentUserThemeTypesMap['id_do_tipo_receita']`
 */
let currentUserThemeTypesMap = {};

/**
 * @type {Array<object>}
 * @description Um array com as abas pessoais customizadas pelo usuário.
 * Cada objeto contém ID, nome, cor, ícone, etc.
 * Carregado a partir do Firestore.
 */
let currentUserPersonalTabs = [];

/**
 * @type {Chart|null}
 * @description Instância do gráfico (Chart.js) que mostra a distribuição de status dos usuários.
 * Usado no painel de administração para evitar a recriação do gráfico a cada renderização.
 */
let userStatusChartInstance = null;

/**
 * @type {Chart|null}
 * @description Instância do gráfico (Chart.js) que mostra os usuários com mais post-its.
 * Usado no painel de administração.
 */
let topUsersByPostitsChartInstance = null;

/**
 * @type {Function|null}
 * @description Armazena a função de callback a ser executada quando o usuário
 * clica no botão de confirmação do modal de confirmação.
 */
let confirmCallback = null;

/**
 * @const {Array<Array<string>>}
 * @description Array com as categorias padrão.
 * NOTA: Este array parece ser um legado ou não estar mais em uso principal,
 * visto que a lógica mais recente favorece os "Tipos de Tema" e "Abas Pessoais"
 * customizáveis pelo usuário. Se não estiver em uso, pode ser removido para
* simplificar o código.
 */
const categorias = [
    ["pessoal", "🚨 Problemas"], ["diario", "📝 Anotações"], ["reuniao", "📅 Reunião"],
    ["trabalho", "💼 Profissional"], ["investimentos", "💰 Finanças"], ["motivacionais", "✨ Inspiração"],
    ["gestao", "📊 Conhecimento"], ["mimos_esposa", "💕 Saúde"], ["mimos_filho", "👨‍👩‍👦 Família"],
    ["mimos_flavio", "🎁 Pessoal"], ["mimos_casa", "🏠 Casa"], ["sonhos", "🎯 Metas"]
];

/**
 * @const {Array<object>}
 * @description Define as cores disponíveis para os post-its.
 * Cada objeto contém um ID único, o código hexadecimal da cor e um nome amigável.
 * Usado nas paletas de cores dos modais de edição/criação.
 */
const AVAILABLE_POSTIT_COLORS = [
    { id: 'default-yellow', hex: '#FFF59D', name: 'Amarelo Padrão' },
    { id: 'pastel-blue', hex: '#AEC6CF', name: 'Azul Pastel' },
    { id: 'pastel-green', hex: '#B9E2AF', name: 'Verde Pastel' },
    { id: 'pastel-pink', hex: '#FFD1DC', name: 'Rosa Pastel' },
    { id: 'pastel-purple', hex: '#D7BDE2', name: 'Roxo Pastel' },
    { id: 'light-gray', hex: '#E0E0E0', name: 'Cinza Claro' },
    { id: 'pastel-peach', hex: '#FFDAC1', name: 'Pêssego Pastel' }
];

/**
 * @const {Array<string>}
 * @description Uma lista extensiva de classes de ícones do Font Awesome.
 * Usada para popular as grades de seleção de ícones nos modais.
 * SUGESTÃO: Manter uma lista tão grande diretamente no código pode ser ineficiente.
 * Uma alternativa seria carregar isso de um arquivo JSON externo, ou, se a biblioteca
 * permitir, buscar os ícones dinamicamente. Para o escopo atual, funciona bem.
 */
const AVAILABLE_ICONS = [
    'fa-star', 'fa-heart', 'fa-cog', 'fa-home', 'fa-book', 'fa-briefcase', 'fa-lightbulb', 'fa-flag', 'fa-tag', 'fa-camera',
    'fa-music', 'fa-film', 'fa-gamepad', 'fa-plane', 'fa-car', 'fa-bicycle', 'fa-ship', 'fa-anchor', 'fa-coffee', 'fa-utensils',
    'fa-chart-bar', 'fa-chart-line', 'fa-chart-pie', 'fa-calendar-alt', 'fa-clock', 'fa-comments', 'fa-comment-dots', 'fa-envelope',
    'fa-folder', 'fa-folder-open', 'fa-file-alt', 'fa-file-code', 'fa-file-invoice-dollar', 'fa-graduation-cap', 'fa-hammer', 'fa-key',
    'fa-lock', 'fa-map-marker-alt', 'fa-moon', 'fa-sun', 'fa-palette', 'fa-paint-brush', 'fa-pencil-alt', 'fa-rocket', 'fa-shield-alt',
    'fa-shopping-cart', 'fa-tree', 'fa-trophy', 'fa-umbrella-beach', 'fa-wallet', 'fa-microchip', 'fa-bolt', 'fa-cloud', 'fa-code',
    'fa-database', 'fa-desktop', 'fa-dumbbell', 'fa-futbol', 'fa-gift', 'fa-globe-americas', 'fa-headphones-alt', 'fa-hiking',
    'fa-laptop-code', 'fa-leaf', 'fa-life-ring', 'fa-microscope', 'fa-mobile-alt', 'fa-motorcycle', 'fa-network-wired', 'fa-newspaper',
    'fa-paw', 'fa-pills', 'fa-plug', 'fa-puzzle-piece', 'fa-receipt', 'fa-robot', 'fa-satellite-dish', 'fa-save', 'fa-search-dollar',
    'fa-seedling', 'fa-server', 'fa-shapes', 'fa-share-alt', 'fa-shopping-bag', 'fa-signature', 'fa-sitemap', 'fa-snowboarding',
    'fa-spa', 'fa-store', 'fa-stream', 'fa-swimmer', 'fa-sync-alt', 'fa-tachometer-alt', 'fa-tasks', 'fa-terminal', 'fa-tools',
    'fa-train', 'fa-tram', 'fa-truck', 'fa-tv', 'fa-user-astronaut', 'fa-user-graduate', 'fa-user-ninja', 'fa-user-secret', 'fa-user-tie',
    'fa-video', 'fa-volleyball-ball', 'fa-wifi', 'fa-wind', 'fa-wine-glass-alt', 'fa-wrench', 'fa-sticky-note', 'fa-thumbtack',
    'fa-bell', 'fa-bomb', 'fa-bone', 'fa-brain', 'fa-burn', 'fa-bullhorn', 'fa-bug', 'fa-building', 'fa-bus-alt', 'fa-calculator',
    'fa-campground', 'fa-candy-cane', 'fa-capsules', 'fa-cash-register', 'fa-cat', 'fa-certificate', 'fa-chair', 'fa-chess',
    'fa-church', 'fa-city', 'fa-clipboard-check', 'fa-clipboard-list', 'fa-cloud-download-alt', 'fa-cloud-upload-alt', 'fa-cocktail',
    'fa-code-branch', 'fa-coins', 'fa-compass', 'fa-compress-arrows-alt', 'fa-concierge-bell', 'fa-cookie-bite', 'fa-couch',
    'fa-credit-card', 'fa-crop-alt', 'fa-crosshairs', 'fa-crow', 'fa-crown', 'fa-crutch', 'fa-cube', 'fa-cubes', 'fa-cut', 'fa-dice',
    'fa-digital-tachograph', 'fa-directions', 'fa-divide', 'fa-dizzy', 'fa-dna', 'fa-dog', 'fa-dollar-sign', 'fa-dolly',
    'fa-door-closed', 'fa-door-open', 'fa-dove', 'fa-drafting-compass', 'fa-dragon', 'fa-draw-polygon', 'fa-drum', 'fa-drum-steelpan',
    'fa-dumpster-fire', 'fa-dungeon', 'fa-egg', 'fa-eject', 'fa-eraser', 'fa-ethernet', 'fa-euro-sign', 'fa-exchange-alt',
    'fa-exclamation', 'fa-exclamation-circle', 'fa-exclamation-triangle', 'fa-expand-arrows-alt', 'fa-external-link-alt',
    'fa-eye', 'fa-eye-dropper', 'fa-eye-slash', 'fa-fan', 'fa-feather-alt', 'fa-female', 'fa-fighter-jet', 'fa-file',
    'fa-file-archive', 'fa-file-audio', 'fa-file-contract', 'fa-file-csv', 'fa-file-download', 'fa-file-excel', 'fa-file-export',
    'fa-file-image', 'fa-file-import', 'fa-file-invoice', 'fa-file-medical', 'fa-file-medical-alt', 'fa-file-pdf', 'fa-file-powerpoint',
    'fa-file-prescription', 'fa-file-signature', 'fa-file-upload', 'fa-file-video', 'fa-file-word', 'fa-fill-drip', 'fa-fingerprint',
    'fa-fire', 'fa-fire-alt', 'fa-fire-extinguisher', 'fa-first-aid', 'fa-fish', 'fa-fist-raised', 'fa-flag-checkered', 'fa-flask',
    'fa-flushed', 'fa-folder-minus', 'fa-folder-plus', 'fa-font', 'fa-football-ball', 'fa-forward', 'fa-frog', 'fa-frown', 'fa-frown-open',
    'fa-funnel-dollar', 'fa-gas-pump', 'fa-gavel', 'fa-gem', 'fa-genderless', 'fa-ghost', 'fa-glasses', 'fa-globe', 'fa-golf-ball',
    'fa-grimace', 'fa-grin', 'fa-grin-alt', 'fa-grin-beam', 'fa-grin-beam-sweat', 'fa-grin-hearts', 'fa-grin-squint', 'fa-grin-squint-tears',
    'fa-grin-stars', 'fa-grin-tears', 'fa-grin-tongue', 'fa-grin-tongue-squint', 'fa-grin-tongue-wink', 'fa-grin-wink', 'fa-grip-horizontal',
    'fa-guitar', 'fa-hand-holding-heart', 'fa-hand-holding-usd', 'fa-hand-lizard', 'fa-hand-middle-finger', 'fa-hand-paper', 'fa-hand-peace',
    'fa-hand-point-down', 'fa-hand-point-left', 'fa-hand-point-right', 'fa-hand-point-up', 'fa-hand-pointer', 'fa-hand-rock', 'fa-hand-scissors',
    'fa-hand-spock', 'fa-hands', 'fa-hands-helping', 'fa-handshake', 'fa-hanukiah', 'fa-hard-hat', 'fa-hashtag', 'fa-hat-cowboy',
    'fa-hat-wizard', 'fa-hdd', 'fa-heading', 'fa-headset', 'fa-heart-broken', 'fa-helicopter', 'fa-highlighter', 'fa-history',
    'fa-hockey-puck', 'fa-holly-berry', 'fa-horse', 'fa-hospital', 'fa-hospital-alt', 'fa-hot-tub', 'fa-hotel', 'fa-hourglass',
    'fa-house-damage', 'fa-hryvnia', 'fa-i-cursor', 'fa-ice-cream', 'fa-icicles', 'fa-icons', 'fa-id-badge', 'fa-id-card',
    'fa-id-card-alt', 'fa-igloo', 'fa-image', 'fa-images', 'fa-inbox', 'fa-indent', 'fa-industry', 'fa-infinity', 'fa-info',
    'fa-info-circle', 'fa-italic', 'fa-jedi', 'fa-joint', 'fa-journal-whills', 'fa-kaaba', 'fa-keyboard', 'fa-khanda',
    'fa-kiss', 'fa-kiss-beam', 'fa-kiss-wink-heart', 'fa-kiwi-bird', 'fa-landmark', 'fa-language', 'fa-laptop', 'fa-laptop-house',
    'fa-laugh', 'fa-laugh-beam', 'fa-laugh-squint', 'fa-laugh-wink', 'fa-layer-group', 'fa-level-down-alt', 'fa-level-up-alt',
    'fa-lira-sign', 'fa-list', 'fa-list-alt', 'fa-list-ol', 'fa-list-ul', 'fa-location-arrow', 'fa-low-vision', 'fa-luggage-cart',
    'fa-magic', 'fa-magnet', 'fa-mail-bulk', 'fa-male', 'fa-map', 'fa-map-marked', 'fa-map-marked-alt', 'fa-map-pin', 'fa-map-signs',
    'fa-marker', 'fa-mars', 'fa-mars-double', 'fa-mars-stroke', 'fa-mars-stroke-h', 'fa-mars-stroke-v', 'fa-mask', 'fa-medal',
    'fa-medkit', 'fa-meh', 'fa-meh-blank', 'fa-meh-rolling-eyes', 'fa-memory', 'fa-menorah', 'fa-mercury', 'fa-meteor', 'fa-microphone',
    'fa-microphone-alt', 'fa-microphone-alt-slash', 'fa-microphone-slash', 'fa-mitten', 'fa-mobile', 'fa-money-bill',
    'fa-money-bill-alt', 'fa-money-bill-wave', 'fa-money-bill-wave-alt', 'fa-money-check', 'fa-money-check-alt', 'fa-monument',
    'fa-moon', 'fa-mortar-pestle', 'fa-mosque', 'fa-mouse', 'fa-mouse-pointer', 'fa-mug-hot', 'fa-neuter', 'fa-not-equal',
    'fa-notes-medical', 'fa-object-group', 'fa-object-ungroup', 'fa-oil-can', 'fa-om', 'fa-otter', 'fa-outdent', 'fa-pager',
    'fa-paint-roller', 'fa-paper-plane', 'fa-paperclip', 'fa-parachute-box', 'fa-paragraph', 'fa-parking', 'fa-passport',
    'fa-pastafarianism', 'fa-paste', 'fa-pause', 'fa-pause-circle', 'fa-peace', 'fa-pen', 'fa-pen-alt', 'fa-pen-fancy',
    'fa-pen-nib', 'fa-pen-square', 'fa-pencil-ruler', 'fa-people-arrows', 'fa-people-carry', 'fa-pepper-hot', 'fa-percent',
    'fa-percentage', 'fa-person-booth', 'fa-phone', 'fa-phone-alt', 'fa-phone-slash', 'fa-phone-square', 'fa-phone-square-alt',
    'fa-phone-volume', 'fa-photo-video', 'fa-piggy-bank', 'fa-place-of-worship', 'fa-plane-arrival', 'fa-plane-departure',
    'fa-play', 'fa-play-circle', 'fa-plus-circle', 'fa-plus-square', 'fa-podcast', 'fa-poll', 'fa-poll-h', 'fa-poo',
    'fa-poop', 'fa-portrait', 'fa-pound-sign', 'fa-power-off', 'fa-pray', 'fa-praying-hands', 'fa-prescription',
    'fa-prescription-bottle', 'fa-prescription-bottle-alt', 'fa-print', 'fa-procedures', 'fa-project-diagram',
    'fa-quran', 'fa-quote-left', 'fa-quote-right', 'fa-random', 'fa-record-vinyl', 'fa-recycle', 'fa-redo', 'fa-redo-alt',
    'fa-registered', 'fa-remove-format', 'fa-reply', 'fa-reply-all', 'fa-republican', 'fa-restroom', 'fa-retweet',
    'fa-ribbon', 'fa-ring', 'fa-road', 'fa-route', 'fa-rss', 'fa-rss-square', 'fa-ruble-sign', 'fa-ruler',
    'fa-ruler-combined', 'fa-ruler-horizontal', 'fa-ruler-vertical', 'fa-running', 'fa-rupee-sign', 'fa-sad-cry',
    'fa-sad-tear', 'fa-satellite', 'fa-school', 'fa-screwdriver', 'fa-scroll', 'fa-sd-card', 'fa-search',
    'fa-search-location', 'fa-search-minus', 'fa-search-plus', 'fa-share', 'fa-share-square', 'fa-shekel-sign',
    'fa-shield-virus', 'fa-shoe-prints', 'fa-shopping-basket', 'fa-shower', 'fa-shuttle-van', 'fa-sign',
    'fa-sign-in-alt', 'fa-sign-language', 'fa-sign-out-alt', 'fa-signal', 'fa-sim-card', 'fa-skull',
    'fa-skull-crossbones', 'fa-slash', 'fa-sleigh', 'fa-sliders-h', 'fa-smile', 'fa-smile-beam', 'fa-smile-wink',
    'fa-smog', 'fa-smoking', 'fa-smoking-ban', 'fa-sms', 'fa-snowflake', 'fa-socks', 'fa-solar-panel',
    'fa-sort', 'fa-sort-alpha-down', 'fa-sort-alpha-down-alt', 'fa-sort-alpha-up', 'fa-sort-alpha-up-alt',
    'fa-sort-amount-down', 'fa-sort-amount-down-alt', 'fa-sort-amount-up', 'fa-sort-amount-up-alt',
    'fa-sort-down', 'fa-sort-numeric-down', 'fa-sort-numeric-down-alt', 'fa-sort-numeric-up',
    'fa-sort-numeric-up-alt', 'fa-sort-up', 'fa-spell-check', 'fa-spider', 'fa-spinner', 'fa-splotch',
    'fa-spray-can', 'fa-square', 'fa-square-full', 'fa-square-root-alt', 'fa-stamp', 'fa-star-and-crescent',
    'fa-star-half', 'fa-star-half-alt', 'fa-star-of-david', 'fa-star-of-life', 'fa-step-backward',
    'fa-step-forward', 'fa-stethoscope', 'fa-stop', 'fa-stop-circle', 'fa-stopwatch', 'fa-store-alt',
    'fa-store-alt-slash', 'fa-street-view', 'fa-strikethrough', 'fa-stroopwafel', 'fa-subscript',
    'fa-subway', 'fa-suitcase', 'fa-suitcase-rolling', 'fa-surprise', 'fa-swatchbook', 'fa-synagogue',
    'fa-syringe', 'fa-table', 'fa-table-tennis', 'fa-tablet', 'fa-tablet-alt', 'fa-tablets',
    'fa-tag', 'fa-tags', 'fa-tape', 'fa-taxi', 'fa-teeth', 'fa-teeth-open', 'fa-temperature-high',
    'fa-temperature-low', 'fa-tenge', 'fa-text-height', 'fa-text-width', 'fa-th', 'fa-th-large', 'fa-th-list',
    'fa-theater-masks', 'fa-thermometer', 'fa-thermometer-empty', 'fa-thermometer-full', 'fa-thermometer-half',
    'fa-thermometer-quarter', 'fa-thermometer-three-quarters', 'fa-thumbs-down', 'fa-thumbs-up',
    'fa-thumbtack', 'fa-ticket-alt', 'fa-tint', 'fa-tint-slash', 'fa-tired', 'fa-toggle-off', 'fa-toggle-on',
    'fa-toilet', 'fa-toilet-paper', 'fa-toilet-paper-slash', 'fa-toolbox', 'fa-tooth', 'fa-torah',
    'fa-torii-gate', 'fa-tractor', 'fa-trademark', 'fa-traffic-light', 'fa-transgender', 'fa-transgender-alt',
    'fa-trash', 'fa-trash-alt', 'fa-trash-restore', 'fa-trash-restore-alt', 'fa-tree', 'fa-truck-loading',
    'fa-truck-monster', 'fa-truck-moving', 'fa-truck-pickup', 'fa-tshirt', 'fa-tty', 'fa-underline',
    'fa-undo', 'fa-undo-alt', 'fa-universal-access', 'fa-university', 'fa-unlink', 'fa-unlock', 'fa-unlock-alt',
    'fa-upload', 'fa-user', 'fa-user-alt', 'fa-user-alt-slash', 'fa-user-check', 'fa-user-circle', 'fa-user-clock',
    'fa-user-cog', 'fa-user-edit', 'fa-user-friends', 'fa-user-injured', 'fa-user-lock', 'fa-user-md',
    'fa-user-minus', 'fa-user-plus', 'fa-user-shield', 'fa-user-slash', 'fa-users', 'fa-users-cog',
    'fa-utensil-spoon', 'fa-vector-square', 'fa-venus', 'fa-venus-double', 'fa-venus-mars', 'fa-vial',
    'fa-vials', 'fa-volume-down', 'fa-volume-mute', 'fa-volume-off', 'fa-volume-up', 'fa-vote-yea',
    'fa-vr-cardboard', 'fa-walking', 'fa-warehouse', 'fa-water', 'fa-wave-square', 'fa-weight',
    'fa-weight-hanging', 'fa-wheelchair', 'fa-window-close', 'fa-window-maximize', 'fa-window-minimize',
    'fa-window-restore', 'fa-wine-bottle', 'fa-won-sign', 'fa-yen-sign'
];
