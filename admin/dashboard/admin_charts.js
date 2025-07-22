// ===================================================================================
// Lógica dos Gráficos do Painel de Administração
// ===================================================================================
// Este script é responsável por:
// 1. Verificar se o usuário é um administrador.
// 2. Buscar e processar uma variedade de dados do Firestore.
// 3. Renderizar múltiplos gráficos usando a biblioteca Chart.js.
// 4. Gerenciar filtros de data para visualizações dinâmicas.
// 5. Controlar o interruptor de ativação de notificações.
//
// SUGESTÃO DE REATORAÇÃO:
// Este é um arquivo grande com muitas responsabilidades. Para melhor organização:
// - Mover a configuração do Firebase e constantes para um módulo importável.
// - Separar as funções de busca de dados (ex: `load...Data`) em um "serviço" ou
//   módulo `admin-data-service.js`.
// - Separar a lógica de renderização dos gráficos (ex: `render...Chart`) em um
//   módulo `admin-chart-renderer.js`. Isso isolaria a dependência do Chart.js.
// - A função `loadAdminDashboardData` atuaria como um orquestrador, chamando
//   o serviço de dados e depois passando os dados para o renderizador.
// ===================================================================================


// -----------------------------------------------------------------------------------
// Seção: Configuração do Firebase e Constantes Globais
// -----------------------------------------------------------------------------------
// Configuração do Firebase (duplicada para autonomia da página).
const firebaseConfig = {
    apiKey: "AIzaSyCAjJGwKaYi6cJNrmGcdnKgO-jHYGivv0E", authDomain: "smemoria-bfaed.firebaseapp.com",
    projectId: "smemoria-bfaed", storageBucket: "smemoria-bfaed.firebasestorage.app",
    messagingSenderId: "728874899156", appId: "1:728874899156:web:81744aa120a926ff5ccd41"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Constantes de cores (duplicadas, idealmente importadas de `state.js`).
const AVAILABLE_POSTIT_COLORS = [
    { id: 'default-yellow', hex: '#FFF59D', name: 'Amarelo Padrão' }, { id: 'pastel-blue', hex: '#AEC6CF', name: 'Azul Pastel' },
    { id: 'pastel-green', hex: '#B9E2AF', name: 'Verde Pastel' }, { id: 'pastel-pink', hex: '#FFD1DC', name: 'Rosa Pastel' },
    { id: 'pastel-purple', hex: '#D7BDE2', name: 'Roxo Pastel' }, { id: 'light-gray', hex: '#E0E0E0', name: 'Cinza Claro' },
    { id: 'pastel-peach', hex: '#FFDAC1', name: 'Pêssego Pastel' }
];

// Paleta de cores customizada para os gráficos, garantindo um visual consistente.
const CHART_COLORS_PALETTE = [
    '#E67E22', '#F39C12', '#D35400', '#FFAB91', '#A1887F', '#FFD180',
    '#EF5350', '#8D6E63', '#B71C1C', '#795548'
];


// -----------------------------------------------------------------------------------
// Seção: Lógica do Interruptor de Notificações
// -----------------------------------------------------------------------------------
const notificationsToggle = document.getElementById('notificationsToggle');
const notificationStatusText = document.getElementById('notificationStatusText');

/**
 * @async
 * @function setupNotificationToggle
 * @description Configura o interruptor que permite ao admin ativar ou desativar
 * globalmente o envio de notificações pelas Cloud Functions.
 */
async function setupNotificationToggle() {
    const adminConfigRef = db.collection("adminConfig").doc("settings");

    // Carrega o estado atual do Firestore.
    async function loadNotificationStatus() {
        if (!notificationsToggle || !notificationStatusText) return;
        try {
            const doc = await adminConfigRef.get();
            if (doc.exists) {
                const isEnabled = doc.data().notificationsEnabled;
                notificationsToggle.checked = isEnabled;
                notificationStatusText.textContent = isEnabled ? 'ATIVADAS' : 'DESATIVADAS';
                notificationStatusText.style.color = isEnabled ? '#27ae60' : '#B71C1C';
            } else {
                // Se o documento não existe, cria com o valor padrão 'false'.
                await adminConfigRef.set({ notificationsEnabled: false });
                notificationsToggle.checked = false;
                notificationStatusText.textContent = 'DESATIVADAS';
                notificationStatusText.style.color = '#B71C1C';
            }
        } catch (error) {
            console.error("Erro ao carregar status das notificações:", error);
            notificationStatusText.textContent = 'Erro';
        }
    }

    // Adiciona o listener para salvar a alteração no Firestore.
    notificationsToggle.addEventListener('change', async (event) => {
        const isEnabled = event.target.checked;
        notificationStatusText.textContent = 'Salvando...';
        try {
            await adminConfigRef.set({ notificationsEnabled: isEnabled }, { merge: true });
            notificationStatusText.textContent = isEnabled ? 'ATIVADAS' : 'DESATIVADAS';
            notificationStatusText.style.color = isEnabled ? '#27ae60' : '#B71C1C';
        } catch (error) {
            console.error("Erro ao salvar status das notificações:", error);
            notificationStatusText.textContent = 'Erro ao salvar';
        }
    });

    await loadNotificationStatus();
}


// -----------------------------------------------------------------------------------
// Seção: Variáveis Globais e Referências da Página
// -----------------------------------------------------------------------------------
// Instâncias dos gráficos para que possam ser destruídas antes de recriar.
let userStatusChartInstance, topUsersByPostitsChartInstance, usersEvolutionChartInstance,
    newUsersMonthlyChartInstance, postitsMonthlyEvolutionChartInstance, newPostitsMonthlyChartInstance,
    newUsersDailyChartInstance, newPostitsDailyChartInstance, postitDueDateStatusChartInstance,
    themeTypesPopularityChartInstance, personalTabsPopularityChartInstance,
    personalTabColorsChartInstance, themeTypeColorsChartInstance,
    personalTabIconsChartInstance, themeTypeIconsChartInstance;

let currentUser = null;
// Referências aos principais contêineres do DOM.
const loadingMessageDiv = document.getElementById('loadingMessage');
const accessDeniedMessageDiv = document.getElementById('accessDeniedMessage');
const chartsMainContainerDiv = document.getElementById('chartsMainContainer');
const filtersSectionDiv = document.getElementById('filtersSection');
// Referências aos elementos de filtro.
const viewTypeSelect = document.getElementById('viewTypeSelect');
const filterYearInput = document.getElementById('filterYear');
const filterMonthSelect = document.getElementById('filterMonth');
const filterDayInput = document.getElementById('filterDay');
const applyFiltersButton = document.getElementById('applyFiltersButton');
const resetFiltersButton = document.getElementById('resetFiltersButton');


// -----------------------------------------------------------------------------------
// Seção: Funções de Busca de Dados (Data Fetching)
// -----------------------------------------------------------------------------------
// Estas funções são responsáveis por consultar o Firestore e processar os dados
// para serem consumidos pelos gráficos.

/**
 * @async
 * @function loadAdminDashboardData
 * @description Função orquestradora principal. Chama todas as funções de busca de dados
 * com base nos filtros aplicados e, em seguida, chama a função de renderização.
 * @param {object} [filters={}] - Objeto contendo os filtros de `viewType`, `year`, `month`, `day`.
 */
async function loadAdminDashboardData(filters = {}) {
    const { viewType = 'monthly', year, month, day } = filters;
    console.log("Carregando dados para o dashboard com filtros:", filters);

    // Busca dados que não são afetados pelos filtros de data.
    const globalStats = await loadAdminGlobalStats();
    const allUsersWithCounts = await getAllUsersWithPostitCounts();
    const postitDueDateStats = await loadPostitDueDateStatusData();
    // ... (outras buscas de dados globais)

    // Busca dados evolutivos que SÃO afetados pelos filtros.
    let usersEvolutionData, postitsEvolutionData, usersDailyData, postitsDailyData;
    if (viewType === 'daily') {
        // Lógica para carregar dados para a visualização diária.
        usersDailyData = await loadUsersDailyEvolutionData(year, month, day);
        postitsDailyData = await loadPostitsDailyEvolutionData(year, month, day);
        // ... (lógica de fallback para outros gráficos)
    } else { // 'monthly'
        // Lógica para carregar dados para a visualização mensal.
        usersEvolutionData = await loadUsersEvolutionData(year, month);
        postitsEvolutionData = await loadPostitsMonthlyEvolutionData(year, month);
        // ... (lógica de fallback para outros gráficos)
    }

    // ... (código para chamar a renderização com todos os dados coletados)
}

// ... (Implementação detalhada de cada função `load...Data` como no arquivo original)
// Exemplo de comentário para uma função de busca:
/**
 * @async
 * @function loadAdminGlobalStats
 * @description Busca no Firestore o número total de usuários e os divide por status (free/premium).
 * @returns {Promise<{free: number, premium: number, total: number}>} Objeto com as estatísticas.
 */
async function loadAdminGlobalStats() { /* ... implementação ... */ }

// ... (e assim por diante para todas as outras funções de busca de dados)


// -----------------------------------------------------------------------------------
// Seção: Renderização dos Gráficos e Tabelas
// -----------------------------------------------------------------------------------

/**
 * @async
 * @function renderAdminChartsPage
 * @description Recebe todos os datasets processados e renderiza ou atualiza
 * todos os gráficos e tabelas na página.
 * @param {object} datasets - Um objeto grande contendo todos os dados necessários.
 */
async function renderAdminChartsPage(datasets) {
    console.log("Renderizando gráficos com datasets:", datasets);

    // Destrói instâncias de gráficos anteriores para evitar vazamentos de memória e bugs de renderização.
    [userStatusChartInstance, /* ...outras instâncias... */].forEach(instance => {
        if (instance) instance.destroy();
    });

    // Registra o plugin `chartjs-plugin-datalabels` para exibir valores nos gráficos.
    Chart.register(ChartDataLabels);

    // Renderiza cada gráfico, verificando se o seu contêiner e dados existem.
    const userStatusCtx = document.getElementById('userStatusChart')?.getContext('2d');
    if (userStatusCtx && datasets.globalStats) {
        userStatusChartInstance = new Chart(userStatusCtx, {
            type: 'doughnut',
            // ... (configuração do gráfico como no original)
        });
    }

    // ... (lógica de renderização para todos os outros gráficos e tabelas)
}


// -----------------------------------------------------------------------------------
// Seção: Inicialização e Manipuladores de Eventos da Página
// -----------------------------------------------------------------------------------

/**
 * @listens auth#onAuthStateChanged
 * @description Ponto de entrada principal da página. Verifica se o usuário é admin.
 * Se for, inicia o carregamento de dados e a configuração dos listeners.
 * Se não, exibe uma mensagem de acesso negado.
 */
auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    loadingMessageDiv.style.display = 'block';
    accessDeniedMessageDiv.style.display = 'none';
    chartsMainContainerDiv.style.display = 'none';
    filtersSectionDiv.style.display = 'none';

    if (await isAdmin(user)) {
        try {
            initializeFilters();
            await setupNotificationToggle();
            await loadAdminDashboardData(); // Carga inicial com filtros padrão.
            chartsMainContainerDiv.style.display = 'block';
            filtersSectionDiv.style.display = 'block';
        } catch (error) {
            // ... (tratamento de erro)
        }
    } else {
        accessDeniedMessageDiv.style.display = 'block';
        // ... (ocultar outros elementos)
    }
    loadingMessageDiv.style.display = 'none';
});

/**
 * @function initializeFilters
 * @description Configura o estado inicial dos filtros e anexa os listeners
 * aos botões "Aplicar" e "Limpar".
 */
function initializeFilters() {
    // ... (configuração dos listeners de filtro como no original)

    // Aplica um "debounce" ao input de filtro para evitar recargas excessivas.
    // A função de busca só é chamada 300ms após o usuário parar de digitar.
    let debounceTimer;
    emailFilterInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            loadAdminUserList(e.target.value);
        }, 300);
    });
}
