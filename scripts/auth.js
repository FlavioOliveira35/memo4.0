// ===================================================================================
// Lógica de Autenticação e Pós-Login
// ===================================================================================
// Este arquivo gerencia o estado de autenticação do usuário, incluindo o logout
// e as ações que devem ser executadas assim que o estado de autenticação muda
// (seja um login bem-sucedido ou um logout).
// ===================================================================================

/**
 * @function logout
 * @description Realiza o logout do usuário no Firebase.
 * Após o logout bem-sucedido, redireciona o usuário para a página de login.
 * Em caso de erro, exibe um alerta e registra o erro no console.
 */
function logout() {
    auth.signOut().then(() => {
        console.log('Usuário deslogado com sucesso.');
        // Redireciona para a página de login, garantindo que o estado da aplicação
        // seja reiniciado para um usuário não autenticado.
        window.location.href = 'auth/login.html';
    }).catch((error) => {
        console.error('Erro ao fazer logout:', error);
        alert('Erro ao tentar sair. Por favor, tente novamente.');
    });
}

// ===================================================================================
// Observador de Mudança de Estado de Autenticação (onAuthStateChanged)
// ===================================================================================
// Este é o principal "ouvinte" que reage a logins e logouts.
// O código dentro deste bloco é executado sempre que um usuário faz login ou sai.
// É o ponto de entrada para a inicialização da aplicação para um usuário autenticado.
auth.onAuthStateChanged(async user => {
    const headerPessoaisBtn = document.getElementById('headerPessoaisBtn');

    // Limpa botões de admin e premium para evitar duplicação em re-renderizações.
    let currentPremiumBtn = document.getElementById('headerPremiumButton');
    if (currentPremiumBtn) currentPremiumBtn.remove();
    let currentAdminBtn = document.getElementById('adminPanelButton');
    if (currentAdminBtn) currentAdminBtn.remove();

    if (user) {
        // --- LÓGICA PARA USUÁRIO AUTENTICADO ---

        if (headerPessoaisBtn) headerPessoaisBtn.style.display = 'block';
        currentUser = user; // Define o usuário globalmente
        const uDocRef = db.collection('users').doc(user.uid);

        try {
            let userDoc;
            // Usa uma transação do Firestore para garantir a atomicidade da operação.
            // Isso previne condições de corrida se o usuário logar muito rápido
            // em múltiplos dispositivos ou abas.
            await db.runTransaction(async (transaction) => {
                const docSnap = await transaction.get(uDocRef);
                if (!docSnap.exists) {
                    // Se o documento do usuário não existe, é o primeiro login.
                    // Cria um novo documento com dados padrão.
                    const newUser = {
                        uid: user.uid,
                        email: user.email,
                        // SUGESTÃO: A lógica de status 'premium' hard-coded para um e-mail
                        // específico não é escalável. O ideal seria gerenciar isso através de
                        // um painel de administração ou um sistema de pagamentos.
                        status: (user.email === 'flavio_cesar_oliveira@hotmail.com' ? 'premium' : 'free'),
                        accountStatus: 'active',
                        bonusNotes: 0,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        totalLogins: 1,
                        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    transaction.set(uDocRef, newUser);
                    userDoc = newUser;
                } else {
                    // Se o usuário já existe, atualiza as informações de login.
                    const userData = docSnap.data();
                    transaction.update(uDocRef, {
                        totalLogins: (userData.totalLogins || 0) + 1,
                        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    userDoc = userData;
                }
            });

            // Após a transação, verifica se a conta está bloqueada.
            if (userDoc.accountStatus === 'blocked') {
                alert("Sua conta está bloqueada. Entre em contato com o suporte.");
                logout(); // Desloga o usuário se a conta estiver bloqueada.
                return;
            }

        } catch (e) {
            console.error("Erro na transação de login do usuário:", e);
            // Em caso de erro na transação, desloga o usuário para evitar
            // que ele fique em um estado inconsistente e potencialmente inseguro.
            logout();
            return;
        }

        const uActCont = document.querySelector('.top-bar .collapsible-menu .user-actions');
        const logoutBtn = uActCont?.querySelector('.header-logout-btn-new');

        // Adiciona o botão do painel de administração se o usuário for o admin.
        // NOTA: Assim como o status premium, a verificação de admin por e-mail
        // não é a abordagem mais segura ou flexível. O ideal seria usar
        // "custom claims" do Firebase Auth para definir papéis (roles) como 'admin'.
        if (user.email === 'flavio_cesar_oliveira@hotmail.com') {
            const admBtn = document.createElement('button');
            admBtn.id = 'adminPanelButton';
            admBtn.innerHTML = '<i class="fas fa-user-shield"></i> Admin';
            admBtn.onclick = () => { window.location.href = 'admin/dashboard/admin_dashboard.html'; };
            if (uActCont && logoutBtn) {
                uActCont.insertBefore(admBtn, logoutBtn);
            } else if (uActCont) {
                uActCont.appendChild(admBtn);
            }
        }

        // Adiciona o botão "Premium" se o usuário não for premium.
        try {
            const uStatDoc = await db.collection('users').doc(user.uid).get();
            if (!uStatDoc.exists || uStatDoc.data().status !== 'premium') {
                const premBtn = document.createElement('button');
                premBtn.id = 'headerPremiumButton';
                premBtn.innerHTML = '<i class="fas fa-star"></i> Premium';
                premBtn.onclick = openPremiumUpgradeModal;
                const refP = uActCont?.querySelector('#adminPanelButton') || logoutBtn;
                if (uActCont && refP) uActCont.insertBefore(premBtn, refP);
                else if (uActCont) uActCont.appendChild(premBtn);
            }
        } catch (e) {
            console.error("Erro ao criar o botão Premium:", e);
        }

        // Carrega os dados essenciais do usuário (configurações de temas e abas).
        // Estas funções precisam ser concluídas antes de renderizar a UI principal.
        await loadUserDefinedThemeTypes();
        await loadUserPersonalTabs();

        // Exibe a tela principal da aplicação.
        showScreen("appScreen");

        // Decide qual aba/categoria mostrar inicialmente.
        if (currentUserPersonalTabs && currentUserPersonalTabs.length > 0) {
            // Se houver abas pessoais, seleciona a primeira ou a que estava ativa.
            if (!currentTab || !currentUserPersonalTabs.some(t => t.id === currentTab)) {
                currentTab = currentUserPersonalTabs.sort((a, b) => a.order - b.order)[0].id;
            }
            handleNewCategorySelection('pessoais');
        } else if (currentUserThemeTypesArray && currentUserThemeTypesArray.length > 0) {
            // Se não houver abas pessoais, mas houver tipos de tema, mostra o primeiro.
            handleNewCategorySelection(currentUserThemeTypesArray[0].id);
        } else {
            // Se não houver nada, mostra a tela de abas pessoais vazia.
            handleNewCategorySelection('pessoais');
        }

        // Atualiza os elementos da UI com os dados do usuário.
        updateMemoryUsageDisplay();
        populateNewCategoryDropdown();
        updateMobileActionColumnUI();

        // Solicita permissão para notificações push.
        // Isso é feito aqui para garantir que temos um usuário logado e podemos
        // associar o token de notificação a ele.
        if ('Notification' in window && navigator.serviceWorker) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Permissão para notificações concedida.');
                    // Aqui seria o local ideal para obter o token do FCM e salvá-lo no
                    // documento do usuário no Firestore.
                } else {
                    console.log('Permissão para notificações não concedida.');
                }
            });
        }

    } else {
        // --- LÓGICA PARA USUÁRIO NÃO AUTENTICADO (LOGOUT) ---

        if (headerPessoaisBtn) headerPessoaisBtn.style.display = 'none';

        // Reseta todas as variáveis de estado global para seus valores iniciais.
        currentUser = null;
        currentTab = null;
        currentUserPersonalTabs = [];
        currentUserThemeTypesArray = [];
        currentUserThemeTypesMap = {};

        // Atualiza a UI para refletir o estado de logout.
        updateMemoryUsageDisplay();

        // Redireciona para a página de login.
        // NOTA: O `logout()` já faz isso. Esta linha é uma garantia extra caso
        // o `onAuthStateChanged` seja acionado por outra razão (ex: token expirado).
        window.location.href = 'auth/login.html';

        // Limpa os contêineres da UI.
        if (navbarContainer) navbarContainer.innerHTML = '';
        if (notesContainer) notesContainer.innerHTML = '';

        // Atualiza os menus para o estado de "deslogado".
        populateNewCategoryDropdown();
        updateMobileActionColumnUI();
    }
});
