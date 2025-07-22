// ===================================================================================
// Lógica do Painel de Administração (Dashboard)
// ===================================================================================
// Este script gerencia todas as funcionalidades do dashboard de administração,
// incluindo a exibição de estatísticas, listagem e gerenciamento de usuários.
// Assim como outras páginas de admin/auth, ele é autônomo.
//
// SUGESTÃO DE REATORAÇÃO:
// O arquivo é extenso e mistura várias responsabilidades:
// 1. Autenticação e verificação de permissões.
// 2. Lógica de busca e exibição de dados (estatísticas, usuários).
// 3. Manipulação de eventos da UI (cliques, filtros, selects).
// 4. Lógica de negócio para ações de admin (bloquear, dar bônus, etc.).
//
// Para melhorar a organização, poderia ser dividido em módulos:
// - `admin-auth.js`: Apenas a função `checkAuthAndAdminStatus`.
// - `admin-data-service.js`: Funções que interagem com o Firestore para buscar/atualizar dados.
// - `admin-ui-manager.js`: Funções que constroem a tabela, atualizam stats, e manipulam o DOM.
// - `admin-event-listeners.js`: Onde os listeners de eventos seriam configurados.
// ===================================================================================


// -----------------------------------------------------------------------------------
// Seção: Configuração do Firebase e Inicialização
// -----------------------------------------------------------------------------------
// Configuração do Firebase (copiada para autonomia da página).
const firebaseConfig = {
    apiKey: "AIzaSyCAjJGwKaYi6cJNrmGcdnKgO-jHYGivv0E",
    authDomain: "smemoria-bfaed.firebaseapp.com",
    projectId: "smemoria-bfaed",
    storageBucket: "smemoria-bfaed.firebasestorage.app",
    messagingSenderId: "728874899156",
    appId: "1:728874899156:web:81744aa120a926ff5ccd41"
};

// Inicialização do Firebase.
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();


// ===================================================================================
// Seção: Funções Auxiliares e de Verificação
// ===================================================================================

/**
 * @async
 * @function checkAuthAndAdminStatus
 * @description Garante que um usuário esteja autenticado e seja o administrador.
 * Redireciona para outras páginas se as condições não forem atendidas.
 * @returns {Promise<firebase.User|null>} Retorna o objeto do usuário se for admin, senão `null`.
 */
async function checkAuthAndAdminStatus() {
    return new Promise(resolve => {
        auth.onAuthStateChanged(async user => {
            if (user) {
                // NOTA DE SEGURANÇA: A verificação de admin por e-mail hard-coded não é ideal.
                // Uma abordagem mais segura e flexível seria usar "Custom Claims" do Firebase Auth,
                // que permite atribuir papéis (roles) a usuários no backend.
                if (user.email === 'flavio_cesar_oliveira@hotmail.com') {
                    resolve(user);
                } else {
                    console.warn("Acesso negado: O usuário não é administrador.");
                    alert("Acesso negado. Esta área é restrita a administradores.");
                    window.location.href = '../../index.html';
                    resolve(null);
                }
            } else {
                console.log("Nenhum usuário autenticado. Redirecionando para o login.");
                window.location.href = '../../auth/login.html';
                resolve(null);
            }
        });
    });
}

/**
 * @function calculateAge
 * @description Calcula a idade de uma pessoa a partir da sua data de nascimento.
 * @param {string} dobString - A data de nascimento no formato 'YYYY-MM-DD'.
 * @returns {number|string} A idade calculada ou 'N/A' se a data for inválida.
 */
function calculateAge(dobString) {
    if (!dobString) return 'N/A';
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}


// ===================================================================================
// Seção: Carregamento de Dados do Dashboard
// ===================================================================================

/**
 * @function loadAdminGlobalStats
 * @description Carrega e exibe as estatísticas globais na parte superior do dashboard.
 * Usa `onSnapshot` para ouvir atualizações em tempo real.
 */
function loadAdminGlobalStats() {
    const totalUsersStat = document.getElementById('totalUsersStat');
    const freeUsersStat = document.getElementById('freeUsersStat');
    const premiumUsersStat = document.getElementById('premiumUsersStat');
    const adminUsersStat = document.getElementById('adminUsersStat');

    if (!totalUsersStat || !freeUsersStat || !premiumUsersStat || !adminUsersStat) return;

    db.collection('users').onSnapshot(snapshot => {
        const users = snapshot.docs.map(doc => doc.data());
        totalUsersStat.textContent = users.length;
        freeUsersStat.textContent = users.filter(u => u.status === 'free').length;
        premiumUsersStat.textContent = users.filter(u => u.status === 'premium').length;
        adminUsersStat.textContent = users.filter(u => u.email === 'flavio_cesar_oliveira@hotmail.com').length;
    }, error => {
        console.error("Erro ao carregar estatísticas globais:", error);
        totalUsersStat.textContent = 'Erro';
    });
}

// Variável para armazenar a função de cancelamento do listener do Firestore.
// Isso é crucial para evitar múltiplas execuções e vazamentos de memória.
let unsubscribeUserList = null;

/**
 * @async
 * @function loadAdminUserList
 * @description Carrega e renderiza a lista de usuários na tabela principal.
 * Implementa filtro por e-mail e atualizações em tempo real.
 * @param {string} [emailFilter=''] - String para filtrar usuários por e-mail.
 */
async function loadAdminUserList(emailFilter = '') {
    const userListContainer = document.getElementById('adminUserListContainer');
    if (!userListContainer) return;

    userListContainer.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Carregando lista de usuários...</p>';

    // Cancela o listener anterior antes de criar um novo.
    if (unsubscribeUserList) {
        unsubscribeUserList();
    }

    let query = db.collection('users').orderBy('email');

    // `onSnapshot` estabelece um listener em tempo real.
    unsubscribeUserList = query.onSnapshot(async (usersSnapshot) => {
        let users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Aplica o filtro de e-mail no lado do cliente.
        if (emailFilter) {
            users = users.filter(user => user.email.toLowerCase().includes(emailFilter.toLowerCase()));
        }

        if (users.length === 0) {
            userListContainer.innerHTML = '<p>Nenhum usuário encontrado.</p>';
            return;
        }

        // Para obter a contagem de post-its, ouvimos a coleção de post-its também.
        // Isso garante que a contagem seja atualizada em tempo real junto com os dados do usuário.
        db.collection('postits').onSnapshot(postitsSnapshot => {
            const postitCounts = {};
            postitsSnapshot.forEach(doc => {
                const postit = doc.data();
                if (postit.uid) {
                    postitCounts[postit.uid] = (postitCounts[postit.uid] || 0) + 1;
                }
            });

            // Constrói a tabela HTML dinamicamente.
            const table = document.createElement('table');
            table.className = 'admin-user-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th><input type="checkbox" id="selectAllCheckbox"></th>
                        <th>Nome</th>
                        <th>E-mail</th>
                        <th>Cidade</th>
                        <th>Estado</th>
                        <th>Idade</th>
                        <th>Status</th>
                        <th>Post-its</th>
                        <th>Limite Total</th>
                        <th>Logins</th>
                        <th>Bônus</th>
                        <th>Bônus Temp.</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr data-uid="${user.uid}" class="${user.accountStatus === 'blocked' ? 'blocked-user' : ''}">
                            <td><input type="checkbox" class="user-checkbox" data-uid="${user.uid}"></td>
                            <td>${user.name || 'N/A'}</td>
                            <td>${user.email}</td>
                            <td>${user.city || 'N/A'}</td>
                            <td>${user.state || 'N/A'}</td>
                            <td>${calculateAge(user.dateOfBirth)}</td>
                            <td>
                                <select class="status-select" data-uid="${user.uid}" ${user.email === 'flavio_cesar_oliveira@hotmail.com' ? 'disabled' : ''}>
                                    <option value="free" ${user.status === 'free' ? 'selected' : ''}>Free</option>
                                    <option value="premium" ${user.status === 'premium' ? 'selected' : ''}>Premium</option>
                                </select>
                            </td>
                            <td>${postitCounts[user.uid] || 0}</td>
                            <td>${
                                user.status === 'premium' ? '∞' :
                                30 + (user.bonusNotes || 0) +
                                (user.temporaryBonus && new Date(user.temporaryBonus.expiresAt.seconds * 1000) > new Date() ? user.temporaryBonus.amount : 0)
                            }</td>
                            <td>${user.totalLogins || 1}</td>
                            <td class="bonus-cell">
                                <span class="bonus-count">${user.bonusNotes || 0}</span>
                                <div class="donation-controls">
                                    <input type="number" class="donation-input" placeholder="Qtd." min="1">
                                    <button class="admin-action-btn bonus-update subtract" data-uid="${user.uid}" data-operation="subtract" title="Subtrair Bônus">-</button>
                                    <button class="admin-action-btn bonus-update add" data-uid="${user.uid}" data-operation="add" title="Adicionar Bônus">+</button>
                                </div>
                            </td>
                            <td class="temp-bonus-cell">
                                ${user.temporaryBonus && new Date(user.temporaryBonus.expiresAt.seconds * 1000) > new Date() ?
                                    `<span class="temp-bonus-active">Ativo: ${user.temporaryBonus.amount} até ${new Date(user.temporaryBonus.expiresAt.seconds * 1000).toLocaleDateString()}</span>` :
                                    ''
                                }
                                <div class="temp-bonus-controls">
                                    <input type="number" class="temp-bonus-amount-input" placeholder="Qtd." min="1">
                                    <input type="number" class="temp-bonus-days-input" placeholder="Dias" min="1">
                                    <button class="admin-action-btn temp-bonus-add" data-uid="${user.uid}">+</button>
                                </div>
                            </td>
                            <td class="actions-cell">
                                <button class="admin-action-btn toggle-block ${user.accountStatus === 'blocked' ? 'unblock' : 'block'}" data-uid="${user.uid}" ${user.email === 'flavio_cesar_oliveira@hotmail.com' ? 'disabled' : ''}>
                                    ${user.accountStatus === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                                </button>
                                <button class="admin-action-btn delete" data-uid="${user.uid}" data-clicks="0" ${user.email === 'flavio_cesar_oliveira@hotmail.com' ? 'disabled' : ''}>
                                    Excluir
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            `;

            userListContainer.innerHTML = '';
            userListContainer.appendChild(table);

            // Reanexa os listeners de eventos aos novos elementos da tabela.
            attachTableEventListeners(table);
        });
    }, (error) => {
        console.error("Erro ao carregar lista de usuários:", error);
        userListContainer.innerHTML = '<p style="color: red;">Erro ao carregar usuários. Verifique o console para mais detalhes.</p>';
    });
}

/**
 * @function loadDemographicsData
 * @description Carrega dados demográficos e renderiza o gráfico de usuários por estado.
 */
function loadDemographicsData() {
    db.collection('users').onSnapshot(snapshot => {
        const users = snapshot.docs.map(doc => doc.data());

        // Calcula e exibe a média de idade.
        const averageAgeStat = document.getElementById('averageAgeStat');
        const ages = users.map(u => calculateAge(u.dateOfBirth)).filter(age => typeof age === 'number');
        if (ages.length > 0) {
            const averageAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;
            averageAgeStat.textContent = averageAge.toFixed(1);
        } else {
            averageAgeStat.textContent = 'N/A';
        }

        // Agrupa usuários por estado para o gráfico.
        const usersByState = users.reduce((acc, user) => {
            if (user.state) {
                const state = user.state.toUpperCase();
                acc[state] = (acc[state] || 0) + 1;
            }
            return acc;
        }, {});

        const sortedStates = Object.entries(usersByState).sort((a, b) => b[1] - a[1]);
        const labels = sortedStates.map(entry => entry[0]);
        const data = sortedStates.map(entry => entry[1]);

        // Renderiza o gráfico usando Chart.js.
        const ctx = document.getElementById('usersByStateChart').getContext('2d');
        new Chart(ctx, { // NOTA: Isso pode criar múltiplos gráficos se não for gerenciado corretamente.
            type: 'bar',
            data: { labels, datasets: [{ label: '# de Usuários', data, backgroundColor: 'rgba(139, 69, 19, 0.7)', borderColor: 'rgba(139, 69, 19, 1)', borderWidth: 1 }] },
            options: { scales: { y: { beginAtZero: true } } }
        });
    }, error => {
        console.error("Erro ao carregar dados demográficos:", error);
    });
}


// ===================================================================================
// Seção: Manipuladores de Eventos (Ações do Admin)
// ===================================================================================

/**
 * @function attachTableEventListeners
 * @description Anexa todos os listeners de eventos necessários aos botões e inputs da tabela de usuários.
 * @param {HTMLTableElement} table - O elemento da tabela onde os listeners serão anexados.
 */
function attachTableEventListeners(table) {
    table.querySelectorAll('.status-select').forEach(select => select.addEventListener('change', handleUserStatusChange));
    table.querySelectorAll('.admin-action-btn.toggle-block').forEach(button => button.addEventListener('click', handleUserBlockToggle));
    table.querySelectorAll('.admin-action-btn.delete').forEach(button => button.addEventListener('click', handleUserDelete));
    table.querySelectorAll('.admin-action-btn.bonus-update').forEach(button => button.addEventListener('click', handlePermanentBonusUpdate));
    table.querySelectorAll('.admin-action-btn.temp-bonus-add').forEach(button => button.addEventListener('click', handleTemporaryBonus));

    // Lógica para seleção em massa
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const userCheckboxes = table.querySelectorAll('.user-checkbox');
    const bulkActionsContainer = document.getElementById('bulkActionsContainer');
    const selectedUsersCount = document.getElementById('selectedUsersCount');

    function updateBulkActionsUI() {
        const selectedCheckboxes = table.querySelectorAll('.user-checkbox:checked');
        selectedUsersCount.textContent = selectedCheckboxes.length;
        bulkActionsContainer.style.display = selectedCheckboxes.length > 0 ? 'block' : 'none';
    }

    selectAllCheckbox.addEventListener('change', (e) => {
        userCheckboxes.forEach(checkbox => { checkbox.checked = e.target.checked; });
        updateBulkActionsUI();
    });

    userCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (!checkbox.checked) selectAllCheckbox.checked = false;
            updateBulkActionsUI();
        });
    });
}

/**
 * @async
 * @function handleUserStatusChange
 * @description Atualiza o status de um usuário (free/premium) no Firestore.
 */
async function handleUserStatusChange(event) {
    const uid = event.target.dataset.uid;
    const newStatus = event.target.value;
    if (!confirm(`Tem certeza que deseja alterar o status deste usuário para ${newStatus}?`)) {
        event.target.value = newStatus === 'free' ? 'premium' : 'free'; // Reverte a seleção na UI.
        return;
    }
    try {
        await db.collection('users').doc(uid).update({ status: newStatus });
        alert("Status do usuário atualizado com sucesso!");
    } catch (error) {
        console.error("Erro ao atualizar status do usuário:", error);
        alert("Falha ao atualizar o status.");
        event.target.value = newStatus === 'free' ? 'premium' : 'free'; // Reverte em caso de erro.
    }
}

/**
 * @async
 * @function handleUserDelete
 * @description Exclui o documento de um usuário do Firestore.
 * Implementa um mecanismo de "cliques múltiplos" para prevenir exclusões acidentais.
 * NOTA: Esta ação NÃO exclui o usuário do Firebase Authentication. Isso teria que
 * ser feito separadamente, preferencialmente por uma Cloud Function com privilégios de admin.
 */
async function handleUserDelete(event) {
    const button = event.target;
    const uid = button.dataset.uid;
    let clicks = parseInt(button.dataset.clicks, 10) || 0;
    clicks++;
    button.dataset.clicks = clicks;

    if (clicks < 10) {
        button.textContent = `Excluir (${clicks}/10)`;
        button.onmouseleave = () => {
            button.dataset.clicks = 0;
            button.textContent = 'Excluir';
            button.onmouseleave = null;
        };
    } else {
        if (confirm("Atenção: Excluir um usuário removerá seu documento do Firestore, mas NÃO sua conta do sistema de autenticação. Deseja continuar?")) {
            try {
                await db.collection('users').doc(uid).delete();
                alert("Usuário excluído do Firestore com sucesso!");
            } catch (error) {
                console.error("Erro ao excluir usuário:", error);
                alert("Falha ao excluir o usuário.");
            }
        }
        button.dataset.clicks = 0;
        button.textContent = 'Excluir';
    }
}

/**
 * @async
 * @function handleUserBlockToggle
 * @description Alterna o status da conta de um usuário entre 'active' e 'blocked'.
 */
async function handleUserBlockToggle(event) {
    const button = event.target;
    const uid = button.dataset.uid;
    const userRef = db.collection('users').doc(uid);
    try {
        const userDoc = await userRef.get();
        if (!userDoc.exists) { alert("Usuário não encontrado."); return; }
        const currentStatus = userDoc.data().accountStatus;
        const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
        const actionText = newStatus === 'blocked' ? 'bloquear' : 'desbloquear';
        if (confirm(`Tem certeza que deseja ${actionText} este usuário?`)) {
            await userRef.update({ accountStatus: newStatus });
        }
    } catch (error) {
        console.error(`Erro ao ${actionText} usuário:`, error);
        alert(`Falha ao ${actionText} o usuário.`);
    }
}

/**
 * @async
 * @function handlePermanentBonusUpdate
 * @description Adiciona ou subtrai notas de bônus permanentes de um usuário.
 */
async function handlePermanentBonusUpdate(event) {
    const button = event.target;
    const uid = button.dataset.uid;
    const operation = button.dataset.operation;
    const controlsContainer = button.closest('.donation-controls');
    const input = controlsContainer.querySelector('.donation-input');
    const amount = parseInt(input.value, 10);

    if (isNaN(amount) || amount <= 0) { alert("Por favor, insira uma quantidade válida."); input.focus(); return; }
    const actionText = operation === 'add' ? `adicionar ${amount}` : `subtrair ${amount}`;
    if (!confirm(`Tem certeza que deseja ${actionText} bônus para este usuário?`)) return;

    const userRef = db.collection('users').doc(uid);
    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw "Documento do usuário não encontrado!";
            const currentBonus = userDoc.data().bonusNotes || 0;
            let newBonus = operation === 'add' ? currentBonus + amount : Math.max(0, currentBonus - amount);
            transaction.update(userRef, { bonusNotes: newBonus });
        });
        alert(`Sucesso! O bônus do usuário foi atualizado.`);
        input.value = '';
    } catch (error) {
        console.error("Erro ao atualizar bônus permanente:", error);
        alert("Falha ao atualizar o bônus.");
    }
}

/**
 * @async
 * @function handleTemporaryBonus
 * @description Concede um bônus temporário de notas a um usuário.
 */
async function handleTemporaryBonus(event) {
    const button = event.target;
    const uid = button.dataset.uid;
    const controlsContainer = button.closest('.temp-bonus-controls');
    const amountInput = controlsContainer.querySelector('.temp-bonus-amount-input');
    const daysInput = controlsContainer.querySelector('.temp-bonus-days-input');
    const amount = parseInt(amountInput.value, 10);
    const days = parseInt(daysInput.value, 10);

    if (isNaN(amount) || amount <= 0 || isNaN(days) || days <= 0) { alert("Por favor, insira uma quantidade e duração válidas."); return; }
    if (!confirm(`Tem certeza que deseja conceder um bônus de ${amount} notas por ${days} dias?`)) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    const temporaryBonus = { amount: amount, expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt) };

    try {
        await db.collection('users').doc(uid).update({ temporaryBonus });
        alert("Bônus temporário concedido com sucesso!");
        amountInput.value = '';
        daysInput.value = '';
    } catch (error) {
        console.error("Erro ao conceder bônus temporário:", error);
        alert("Falha ao conceder o bônus temporário.");
    }
}


// ===================================================================================
// Seção: Lógica de Ações em Massa
// ===================================================================================

/**
 * @function getSelectedUserIds
 * @description Retorna um array com os UIDs de todos os usuários selecionados na tabela.
 * @returns {string[]}
 */
function getSelectedUserIds() {
    return Array.from(document.querySelectorAll('.user-checkbox:checked')).map(cb => cb.dataset.uid);
}

/**
 * @async
 * @function handleBulkBlock
 * @description Bloqueia ou desbloqueia múltiplos usuários selecionados.
 * @param {boolean} shouldBlock - `true` para bloquear, `false` para desbloquear.
 */
async function handleBulkBlock(shouldBlock) {
    const selectedIds = getSelectedUserIds();
    if (selectedIds.length === 0) { alert("Nenhum usuário selecionado."); return; }
    const actionText = shouldBlock ? "bloquear" : "desbloquear";
    if (!confirm(`Tem certeza que deseja ${actionText} ${selectedIds.length} usuário(s)?`)) return;

    const batch = db.batch();
    selectedIds.forEach(uid => {
        const userRef = db.collection('users').doc(uid);
        batch.update(userRef, { accountStatus: shouldBlock ? 'blocked' : 'active' });
    });

    try {
        await batch.commit();
        alert("Ação em massa concluída com sucesso!");
        // Limpa a seleção na UI.
        document.getElementById('selectAllCheckbox').checked = false;
        document.querySelectorAll('.user-checkbox').forEach(cb => cb.checked = false);
        document.getElementById('bulkActionsContainer').style.display = 'none';
    } catch (error) {
        console.error("Erro na ação em massa de bloqueio:", error);
        alert("Ocorreu um erro ao processar a ação em massa.");
    }
}

/**
 * @async
 * @function handleBulkBonus
 * @description Concede um bônus temporário para múltiplos usuários selecionados.
 */
async function handleBulkBonus() {
    const selectedIds = getSelectedUserIds();
    if (selectedIds.length === 0) { alert("Nenhum usuário selecionado."); return; }
    const amount = parseInt(document.getElementById('bulkBonusAmount').value, 10);
    const days = parseInt(document.getElementById('bulkBonusDays').value, 10);

    if (isNaN(amount) || amount <= 0 || isNaN(days) || days <= 0) { alert("Por favor, insira valores válidos para o bônus em massa."); return; }
    if (!confirm(`Conceder um bônus de ${amount} notas por ${days} dias para ${selectedIds.length} usuário(s)?`)) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    const temporaryBonus = { amount: amount, expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt) };

    const batch = db.batch();
    selectedIds.forEach(uid => {
        const userRef = db.collection('users').doc(uid);
        batch.update(userRef, { temporaryBonus });
    });

    try {
        await batch.commit();
        alert("Bônus em massa concedido com sucesso!");
        // Limpa a UI de ações em massa.
        document.getElementById('selectAllCheckbox').checked = false;
        document.querySelectorAll('.user-checkbox').forEach(cb => cb.checked = false);
        document.getElementById('bulkActionsContainer').style.display = 'none';
        document.getElementById('bulkBonusAmount').value = '';
        document.getElementById('bulkBonusDays').value = '';
    } catch (error) {
        console.error("Erro na ação em massa de bônus:", error);
        alert("Ocorreu um erro ao processar a ação em massa de bônus.");
    }
}


// ===================================================================================
// Seção: Inicialização Principal do Dashboard
// ===================================================================================
document.addEventListener('DOMContentLoaded', async () => {
    const adminUser = await checkAuthAndAdminStatus();

    if (adminUser) {
        // Se o usuário for um admin verificado, carrega todos os dados e configura os listeners.
        loadAdminGlobalStats();
        loadAdminUserList();
        loadDemographicsData();

        const backButton = document.getElementById('adminScreenBackButton');
        const viewChartsButton = document.getElementById('viewAdminChartsBtn');
        const emailFilterInput = document.getElementById('adminUserEmailFilter');
        const bulkBlockBtn = document.getElementById('bulkBlockBtn');
        const bulkUnblockBtn = document.getElementById('bulkUnblockBtn');
        const bulkApplyBonusBtn = document.getElementById('bulkApplyBonusBtn');

        if (backButton) backButton.addEventListener('click', () => { window.location.href = '../../index.html'; });
        if (viewChartsButton) viewChartsButton.addEventListener('click', () => { window.location.href = 'admin_charts.html'; });

        // Aplica um "debounce" no filtro de e-mail para evitar buscas excessivas no DB
        // a cada tecla digitada, esperando 300ms de inatividade para buscar.
        if (emailFilterInput) {
            let debounceTimer;
            emailFilterInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    loadAdminUserList(e.target.value);
                }, 300);
            });
        }

        if (bulkBlockBtn) bulkBlockBtn.addEventListener('click', () => handleBulkBlock(true));
        if (bulkUnblockBtn) bulkUnblockBtn.addEventListener('click', () => handleBulkBlock(false));
        if (bulkApplyBonusBtn) bulkApplyBonusBtn.addEventListener('click', handleBulkBonus);
    }
});
