// ===================================================================================
// Gerenciamento da Interface do Usuário (UI)
// ===================================================================================
// Este arquivo é central para a manipulação do DOM. Ele contém:
// 1. Referências para os principais elementos da UI.
// 2. Funções auxiliares para interações comuns (modais, responsividade).
// 3. Funções para popular dinamicamente partes da UI (menus, barras de navegação).
// 4. Lógica para funcionalidades específicas da UI, como o carrossel e o resumo.
// ===================================================================================


// -----------------------------------------------------------------------------------
// Seleção de Elementos do DOM
// -----------------------------------------------------------------------------------
// Agrupar a seleção de elementos no início do arquivo melhora a organização
// e o desempenho, evitando buscas repetidas no DOM.
// SUGESTÃO: Para projetos muito grandes, poderia-se organizar isso em um objeto
// `UI_ELEMENTS` para evitar poluir o escopo global.
const appScreen = document.getElementById('appScreen');
const navbarContainer = document.getElementById("navbar");
const notesContainer = document.getElementById("notes");
const noteTextInput = document.getElementById("noteText");
const navbarWrapper = document.getElementById("navbarWrapper");
const secondaryNavbarWrapper = document.getElementById('secondaryNavbarWrapper');
const secondaryNavbarContainer = document.getElementById('secondaryNavbar');
const themeNoteCustomizationDiv = document.getElementById('themeNoteCustomization');
const modalOverlay = document.getElementById('modalOverlay');
const themeNameModalOverlay = document.getElementById('themeNameModalOverlay');
const themeNameModalTitle = document.getElementById('themeNameModalTitle');
const themeNameInput = document.getElementById('themeNameInput');
const manageSubthemesModalOverlay = document.getElementById('manageSubthemesModalOverlay');
const manageSubthemesModalTitle = document.getElementById('manageSubthemesModalTitle');
const subthemesListContainer = document.getElementById('subthemesListContainer');
const newSubthemeNameInput = document.getElementById('newSubthemeNameInput');
const addSubthemeBtn = document.getElementById('addSubthemeBtn');
const managePersonalTabsModalOverlay = document.getElementById('managePersonalTabsModalOverlay');
const personalTabsListContainer = document.getElementById('personalTabsListContainer');
const openAddPersonalTabModalBtn = document.getElementById('openAddPersonalTabModalBtn');
const personalTabEditModalOverlay = document.getElementById('personalTabEditModalOverlay');
const personalTabEditModalTitle = document.getElementById('personalTabEditModalTitle');
const editingPersonalTabIdInput = document.getElementById('editingPersonalTabId');
const personalTabNameInput = document.getElementById('personalTabNameInput');
const personalTabColorPalette = document.getElementById('personalTabColorPalette');
const selectedPersonalTabColorInput = document.getElementById('selectedPersonalTabColor');
const personalTabIconGrid = document.getElementById('personalTabIconGrid');
const selectedPersonalTabIconInput = document.getElementById('selectedPersonalTabIcon');
const savePersonalTabBtn = document.getElementById('savePersonalTabBtn');
const confirmationModalOverlay = document.getElementById('confirmationModalOverlay');
const confirmationModalTitle = document.getElementById('confirmationModalTitle');
const confirmationModalMessage = document.getElementById('confirmationModalMessage');
const themeTypeEditModalOverlay = document.getElementById('themeTypeEditModalOverlay');
const themeTypeEditModalTitle = document.getElementById('themeTypeEditModalTitle');
const editingThemeTypeIdInput = document.getElementById('editingThemeTypeId');
const themeTypeNameInputJS = document.getElementById('themeTypeNameInput');
const themeTypeIconGrid = document.getElementById('themeTypeIconGrid');
const selectedThemeTypeIconInput = document.getElementById('selectedThemeTypeIcon');
const themeTypeColorPalette = document.getElementById('themeTypeColorPalette');
const selectedThemeTypeColorInput = document.getElementById('selectedThemeTypeColor');
const saveThemeTypeBtn = document.getElementById('saveThemeTypeBtn');
const editSubthemeModalOverlay = document.getElementById('editSubthemeModalOverlay');
const editSubthemeNameInput = document.getElementById('editSubthemeNameInput');
const editingSubthemeIdInput = document.getElementById('editingSubthemeId');
const saveSubthemeNameBtn = document.getElementById('saveSubthemeNameBtn');


// ===================================================================================
// Funções Auxiliares e de Gerenciamento de UI
// ===================================================================================

/**
 * @function escapeHTML
 * @description Escapa uma string para prevenir ataques de XSS (Cross-Site Scripting).
 * Cria um nó de texto, que interpreta a string como texto puro e não como HTML,
 * e depois retorna o innerHTML resultante (e.g., '<' vira '&lt;').
 * @param {string} str - A string a ser escapada.
 * @returns {string} A string segura para ser inserida no HTML.
 */
function escapeHTML(str) {
    const d = document.createElement("div");
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
}

/**
 * @function isMobileView
 * @description Verifica se a largura da janela corresponde à de um dispositivo móvel.
 * O breakpoint de 1024px é um valor comum para tablets em modo paisagem.
 * @returns {boolean} `true` se a visualização for considerada móvel.
 */
function isMobileView() {
    return window.innerWidth <= 1024;
}

// -----------------------------------------------------------------------------------
// Gerenciamento do Modal de Confirmação
// -----------------------------------------------------------------------------------

/**
 * @function openConfirmationModal
 * @description Abre um modal genérico de confirmação.
 * @param {string} title - O título a ser exibido no cabeçalho do modal.
 * @param {string} message - A mensagem/pergunta a ser exibida no corpo do modal.
 * @param {Function} callback - A função a ser executada se o usuário confirmar.
 */
function openConfirmationModal(title, message, callback) {
    confirmationModalTitle.textContent = title;
    confirmationModalMessage.textContent = message;
    confirmCallback = callback; // Armazena o callback na variável global.
    confirmationModalOverlay.classList.add('active');
}

/**
 * @function closeConfirmationModal
 * @description Fecha o modal de confirmação e limpa o callback.
 */
function closeConfirmationModal() {
    confirmationModalOverlay.classList.remove('active');
    confirmCallback = null; // Limpa o callback para evitar execuções acidentais.
}

/**
 * @function confirmAction
 * @description Executa o callback de confirmação e fecha o modal.
 */
function confirmAction() {
    if (typeof confirmCallback === 'function') {
        confirmCallback();
    }
    closeConfirmationModal();
}

/**
 * @function cancelConfirmation
 * @description Apenas fecha o modal de confirmação sem executar o callback.
 */
function cancelConfirmation() {
    closeConfirmationModal();
}
// Adiciona um listener para fechar o modal se o usuário clicar no overlay (fundo).
confirmationModalOverlay.addEventListener('click', function(e) {
    if (e.target === confirmationModalOverlay) {
        closeConfirmationModal();
    }
});

// -----------------------------------------------------------------------------------
// Gerenciamento de Telas e Modais Principais
// -----------------------------------------------------------------------------------

/**
 * @function showScreen
 * @description Controla qual "tela" (div principal) é exibida.
 * @param {string} id - O ID da div da tela a ser mostrada ('appScreen', 'adminScreen', etc.).
 */
function showScreen(id) {
    console.log(`Show tela: ${id}`);
    // Esconde todas as telas principais.
    document.querySelectorAll('.screen').forEach(s => {
        if (s.id === 'appScreen' || s.id === 'adminScreen') s.classList.remove('active');
    });
    const scr = document.getElementById(id);
    if (scr && (scr.id === 'appScreen' || scr.id === 'adminScreen')) {
        scr.classList.add('active');
    } else if (id === 'loginScreen' || id === 'registerScreen') {
        // Para telas de auth, redireciona para a página HTML correspondente.
        window.location.href = id === 'loginScreen' ? 'auth/login.html' : 'admin/register/register.html';
    } else {
        // Fallback: se a tela não for encontrada, mostra a tela principal do app se o
        // usuário estiver logado, caso contrário, redireciona para o login.
        console.error("Tela não encontrada:", id);
        if (currentUser) appScreen.classList.add('active');
        else window.location.href = 'auth/login.html';
    }
}

/**
 * @function openModal
 * @description Abre o modal principal para adicionar uma nova nota.
 */
function openModal() {
    modalOverlay.classList.add('active');
    noteTextInput.focus(); // Foca no campo de texto para melhor usabilidade.
}

/**
 * @function closeModal
 * @description Fecha o modal de nova nota e limpa os campos.
 */
function closeModal() {
    modalOverlay.classList.remove('active');
    noteTextInput.value = '';
    document.getElementById('noteDueDate').value = '';
}

/**
 * @function updateMemoryUsageDisplay
 * @description Atualiza a contagem de notas usadas versus o limite total.
 * Busca os dados do usuário e a contagem de notas no Firestore para exibir o uso.
 * Lida com status 'premium' (ilimitado) e bônus de notas.
 */
async function updateMemoryUsageDisplay() {
    const dsp = document.getElementById('memoryUsageDisplayContainer'),
        uC = document.getElementById('usedMemoryCount'),
        tL = document.getElementById('totalMemoryLimit');
    if (!dsp || !uC || !tL) return;

    if (!currentUser) {
        dsp.style.display = 'none';
        return;
    }
    dsp.style.display = 'block';

    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        let isPremium = false;
        let permanentBonus = 0;
        let temporaryBonus = 0;

        if (userDoc.exists) {
            const userData = userDoc.data();
            isPremium = userData.status === 'premium';
            permanentBonus = userData.bonusNotes || 0;

            // Verifica se o bônus temporário ainda é válido.
            if (userData.temporaryBonus && new Date(userData.temporaryBonus.expiresAt.seconds * 1000) > new Date()) {
                temporaryBonus = userData.temporaryBonus.amount || 0;
            }
        }

        // Conta as notas do usuário.
        const notesSnapshot = await db.collection('postits').where('uid', '==', currentUser.uid).get();
        uC.textContent = notesSnapshot.size;

        if (isPremium) {
            tL.textContent = 'Ilimitado';
        } else {
            const totalLimit = 30 + permanentBonus + temporaryBonus; // 30 é o limite base para usuários 'free'.
            tL.textContent = totalLimit;
        }
    } catch (e) {
        console.error("Erro ao atualizar o uso de memória:", e);
        uC.textContent = 'Erro';
        tL.textContent = 'Erro';
    }
}

// -----------------------------------------------------------------------------------
// Lógica de Menus Responsivos e Dropdowns
// -----------------------------------------------------------------------------------
const hamburgerBtn = document.querySelector('.hamburger-btn');
const collapsibleMenu = document.querySelector('.collapsible-menu');
if (hamburgerBtn && collapsibleMenu) {
    // Abre/fecha o menu hambúrguer em telas móveis.
    hamburgerBtn.addEventListener('click', function() {
        collapsibleMenu.classList.toggle('active');
        // Repopula o menu para garantir que ele esteja atualizado.
        populateNewCategoryDropdown();
    });

    // Listener para fechar o menu dropdown quando um item é clicado em modo mobile.
    collapsibleMenu.addEventListener('click', function(event) {
        const target = event.target;
        const isDropdownItself = target.matches('.category-dropdown') || target.closest('.category-dropdown');
        const isInsideDropdownContent = target.closest('.dropdown-content');
        let shouldCloseMenu = false;

        // Define as condições para fechar o menu.
        if (target.closest('a[data-category-type]')) { shouldCloseMenu = true; }
        else if (target.closest('.contact-link-mobile') || target.closest('.settings-link-mobile')) { shouldCloseMenu = true; }
        else if (target.closest('button.auth-button')) { shouldCloseMenu = true; }
        else if (target.closest('a') && target.closest('a').innerHTML.includes('Gerenciar Temas')) { shouldCloseMenu = true; }

        // Em desktop, não fecha o menu se clicar no próprio botão do dropdown.
        if (isDropdownItself && !isInsideDropdownContent && !isMobileView()) { shouldCloseMenu = false; }

        if (shouldCloseMenu && isMobileView()) {
            collapsibleMenu.classList.remove('active');
        }
    });
}

// Listeners para os botões de atalho "Pessoais".
document.getElementById('mobilePessoaisBtn')?.addEventListener('click', function() {
    handleNewCategorySelection('pessoais');
    if (collapsibleMenu?.classList.contains('active') && isMobileView()) {
        collapsibleMenu.classList.remove('active');
    }
});
document.getElementById('headerPessoaisBtn')?.addEventListener('click', () => openManagePersonalTabsModal());

/**
 * @function populateNewCategoryDropdown
 * @description Constrói dinamicamente o menu de categorias.
 * A estrutura do menu é diferente para visualizações mobile (lista de links) e
 * desktop (botão com dropdown).
 */
function populateNewCategoryDropdown() {
    const mob = isMobileView();
    const nav = document.querySelector('.collapsible-menu .main-nav');
    if (!nav) return;
    nav.innerHTML = ''; // Limpa o conteúdo anterior.

    if (mob) {
        // Constrói o menu para mobile.
        nav.innerHTML = `<div style="padding:15px 20px;font-family:'Courier Prime',monospace;color:#2c2416;font-size:1.1rem;font-weight:bold;border-bottom:1px solid #d2b48c;margin-bottom:5px;">Categorias</div>`;
        const pLink = document.createElement('a');
        pLink.href = '#';
        pLink.dataset.categoryType = 'pessoais';
        pLink.innerHTML = '<i class="fas fa-user-circle"></i> Pessoais';
        nav.appendChild(pLink);
        // Adiciona os tipos de tema do usuário.
        currentUserThemeTypesArray.forEach(cfg => {
            const l = document.createElement('a');
            l.href = '#';
            l.dataset.categoryType = cfg.id;
            l.innerHTML = cfg.label; // O 'label' já deve conter o ícone.
            nav.appendChild(l);
        });
        const mngLink = document.createElement('a');
        mngLink.href = '#';
        mngLink.innerHTML = '<i class="fas fa-palette"></i> Gerenciar Tipos de Tema...';
        mngLink.style.cssText = "border-top:1px solid #d2b48c;margin-top:10px;";
        mngLink.onclick = e => {
            e.preventDefault();
            openManageThemeTypesModal();
            if (collapsibleMenu?.classList.contains('active')) {
                collapsibleMenu.classList.remove('active');
            }
        };
        nav.appendChild(mngLink);
    } else {
        // Constrói o menu para desktop.
        const ddDiv = document.createElement('div');
        ddDiv.className = 'category-dropdown';
        const ddBtn = document.createElement('button');
        ddBtn.className = 'dropdown-btn';
        ddBtn.innerHTML = `<span class="btn-text">Categorias</span> <i class="fas fa-chevron-down"></i>`;
        const ddCont = document.createElement('div');
        ddCont.className = 'dropdown-content';
        const pOvr = document.createElement('a');
        pOvr.href = '#';
        pOvr.dataset.categoryType = 'pessoais';
        pOvr.textContent = 'Pessoais';
        ddCont.appendChild(pOvr);
        currentUserThemeTypesArray.forEach(cfg => {
            const l = document.createElement('a');
            l.href = '#';
            l.dataset.categoryType = cfg.id;
            l.innerHTML = cfg.label;
            ddCont.appendChild(l);
        });
        const mngLink = document.createElement('a');
        mngLink.href = '#';
        mngLink.innerHTML = '<i class="fas fa-cog"></i> Gerenciar Tipos de Tema...';
        mngLink.style.cssText = "border-top:1px solid #d2b48c;font-weight:bold;";
        mngLink.onclick = e => {
            e.preventDefault();
            openManageThemeTypesModal();
        };
        ddCont.appendChild(mngLink);
        ddDiv.appendChild(ddBtn);
        ddDiv.appendChild(ddCont);
        nav.appendChild(ddDiv);

        // Garante que o botão de resumo exista, pois ele é posicionado aqui em desktop.
        let summaryBtn = document.getElementById('summaryBtn');
        if (!summaryBtn) {
            summaryBtn = document.createElement('button');
            summaryBtn.id = 'summaryBtn';
            summaryBtn.title = 'Gerar Resumo da Aba';
            summaryBtn.innerHTML = '<i class="fas fa-print"></i>';
            summaryBtn.className = 'summary-btn';
            summaryBtn.style.display = 'none'; // Começa oculto.
            summaryBtn.onclick = openSummaryModal;
            const topBar = document.querySelector('.top-bar .main-nav');
            if (topBar) topBar.appendChild(summaryBtn);
        }
    }

    // Adiciona os listeners de clique para os links de categoria recém-criados.
    nav.querySelectorAll('a[data-category-type]').forEach(l => {
        l.addEventListener('click', function(e) {
            e.preventDefault();
            const type = this.dataset.categoryType;
            handleNewCategorySelection(type);
            if (isMobileView() && collapsibleMenu.classList.contains('active')) {
                collapsibleMenu.classList.remove('active');
            }
        });
    });
}

// Listener para redesenhar os menus responsivos quando a janela é redimensionada.
window.addEventListener('resize', () => {
    populateNewCategoryDropdown();
    updateMobileActionColumnUI();
});

/**
 * @function populateMobileCategoryIcons
 * @description Popula a coluna de ícones de ação rápida para mobile.
 */
function populateMobileCategoryIcons() {
    const cont = document.getElementById('mobileCategoryIconsContainer');
    if (!cont) return;
    cont.innerHTML = '';
    currentUserThemeTypesArray.forEach(cfg => {
        const btn = document.createElement('button');
        btn.className = 'mobile-category-icon-btn';
        btn.innerHTML = `<i class="fas ${cfg.iconClass || 'fa-folder'}"></i>`;
        btn.title = cfg.name;
        btn.dataset.categoryType = cfg.id;
        btn.addEventListener('click', () => {
            handleNewCategorySelection(cfg.id);
            if (collapsibleMenu?.classList.contains('active')) {
                collapsibleMenu.classList.remove('active');
            }
        });
        cont.appendChild(btn);
    });
}

/**
 * @function updateMobileActionColumnUI
 * @description Gerencia a visibilidade e o conteúdo da coluna de ação da direita,
 * que só aparece em visualizações móveis. Move botões como "Premium" para esta
 * coluna em mobile.
 */
function updateMobileActionColumnUI() {
    const actCol = document.getElementById('mobileRightActionColumn');
    const premBtn = document.getElementById('headerPremiumButton');
    const uADesk = document.querySelector('.top-bar .collapsible-menu .user-actions');
    const lgoBtn = uADesk?.querySelector('.header-logout-btn-new');
    if (!actCol) return;

    if (isMobileView()) {
        actCol.style.display = 'flex';
        populateMobileCategoryIcons();
        // Move o botão premium para a coluna móvel, se existir.
        if (premBtn && premBtn.parentElement !== actCol && getComputedStyle(premBtn).display !== 'none') {
            premBtn.classList.add('mobile-premium-icon');
            premBtn.innerHTML = '<i class="fas fa-star"></i>';
            actCol.insertBefore(premBtn, actCol.firstChild);
        }
    } else {
        // Esconde a coluna móvel e move o botão premium de volta para o cabeçalho desktop.
        actCol.style.display = 'none';
        document.getElementById('mobileCategoryIconsContainer').innerHTML = '';
        if (premBtn && premBtn.parentElement === actCol) {
            premBtn.classList.remove('mobile-premium-icon');
            premBtn.innerHTML = '<i class="fas fa-star"></i> Seja Premium';
            const admRef = uADesk?.querySelector('#adminPanelButton');
            if (uADesk && admRef) uADesk.insertBefore(premBtn, admRef);
            else if (uADesk && lgoBtn) uADesk.insertBefore(premBtn, lgoBtn);
            else if (uADesk) uADesk.appendChild(premBtn);
        }
    }
}

// -----------------------------------------------------------------------------------
// Lógica do Modal de Resumo e Copiar para a Área de Transferência
// -----------------------------------------------------------------------------------

/**
 * @function openSummaryModal
 * @description Abre um modal que resume todas as notas da aba ou tema atual.
 */
function openSummaryModal() {
    const summaryModalOverlay = document.getElementById('summaryModalOverlay');
    const summaryContentDiv = document.getElementById('summaryContent');
    const summaryModalTitle = document.getElementById('summaryModalTitle');
    if (!summaryModalOverlay || !summaryContentDiv || !summaryModalTitle) return;

    let query;
    let contextName = "";

    // Determina o contexto (aba pessoal ou tema) para montar a query do Firestore.
    if (currentTab && navbarWrapper.style.display !== 'none') {
        const tabObject = currentUserPersonalTabs.find(t => t.id === currentTab);
        contextName = tabObject ? tabObject.name : "Aba Pessoal";
        query = db.collection("postits").where("uid", "==", currentUser.uid).where("category", "==", currentTab).orderBy("order", "asc");
    } else if (currentThemeInfo && currentThemeInfo.id) {
        contextName = currentThemeInfo.name;
        query = db.collection("postits").where("uid", "==", currentUser.uid).where("themeId", "==", currentThemeInfo.id).orderBy("order", "asc");
    } else {
        return; // Não há contexto para resumir.
    }

    summaryModalTitle.innerHTML = `<i class="fas fa-file-alt"></i> Resumo de "${escapeHTML(contextName)}"`;

    query.get().then(snapshot => {
        if (snapshot.empty) {
            summaryContentDiv.textContent = "Nenhuma nota para resumir.";
        } else {
            let summaryText = "";
            snapshot.docs.forEach((doc, index) => {
                summaryText += `${index + 1}. ${doc.data().text}\n\n`;
            });
            summaryContentDiv.textContent = summaryText.trim();
        }
        summaryModalOverlay.classList.add('active');
    }).catch(error => {
        console.error("Erro ao gerar resumo:", error);
        summaryContentDiv.textContent = "Ocorreu um erro ao carregar o resumo.";
        summaryModalOverlay.classList.add('active');
    });
}

function closeSummaryModal() {
    const summaryModalOverlay = document.getElementById('summaryModalOverlay');
    if (summaryModalOverlay) summaryModalOverlay.classList.remove('active');
}

/**
 * @function copySummaryToClipboard
 * @description Copia o conteúdo do resumo para a área de transferência do usuário.
 * Usa a API `navigator.clipboard` (moderna e segura) com um fallback para o
 * método `document.execCommand('copy')` para navegadores mais antigos.
 */
function copySummaryToClipboard() {
    const summaryContentDiv = document.getElementById('summaryContent');
    const copyBtn = document.getElementById('copySummaryBtn');
    if (!summaryContentDiv || !copyBtn) return;

    const textToCopy = summaryContentDiv.textContent;

    // A API Clipboard é a preferida, mas requer um contexto seguro (HTTPS).
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
            copyBtn.disabled = true;
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.disabled = false;
            }, 2000);
        }).catch(err => {
            console.warn('Falha ao usar navigator.clipboard, tentando fallback: ', err);
            fallbackCopyTextToClipboard(textToCopy, copyBtn);
        });
    } else {
        console.warn('Navigator.clipboard não disponível ou contexto não seguro, usando fallback.');
        fallbackCopyTextToClipboard(textToCopy, copyBtn);
    }
}

/**
 * @function fallbackCopyTextToClipboard
 * @description Fallback para copiar texto usando `document.execCommand`.
 * Cria uma `textarea` fora da tela, insere o texto, seleciona e copia.
 * @param {string} text - O texto a ser copiado.
 * @param {HTMLElement} buttonElement - O elemento do botão para dar feedback visual.
 */
function fallbackCopyTextToClipboard(text, buttonElement) {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Estilos para tornar a textarea invisível e evitar alterações no layout.
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            const originalText = buttonElement.innerHTML;
            buttonElement.innerHTML = '<i class="fas fa-check"></i> Copiado!';
            buttonElement.disabled = true;
            setTimeout(() => {
                buttonElement.innerHTML = originalText;
                buttonElement.disabled = false;
            }, 2000);
        } else {
            console.error('Fallback: Falha ao copiar texto com execCommand.');
            alert('Não foi possível copiar o conteúdo (fallback).');
        }
    } catch (err) {
        console.error('Fallback: Erro ao copiar texto com execCommand: ', err);
        alert('Não foi possível copiar o conteúdo (fallback error).');
    }
    document.body.removeChild(textArea);
}

// -----------------------------------------------------------------------------------
// Listeners Globais e de Inicialização da UI
// -----------------------------------------------------------------------------------

// Listener para o estado de autenticação (a lógica principal está em auth.js).
// Aqui, ele é usado para um propósito legado de verificação de lembretes,
// que agora é tratado pelo Service Worker.
// NOTA: Este bloco pode ser obsoleto e talvez possa ser removido se a lógica
// de verificação de lembretes foi completamente migrada.
auth.onAuthStateChanged(user => {
    if (user) {
        // A verificação de lembretes agora é feita pelo Service Worker.
    }
});

// Listener de eventos principais da UI (modais, botões).
document.addEventListener('keydown', function(e) {
    // Atalho Ctrl/Cmd + Enter para adicionar nota.
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (modalOverlay.classList.contains('active') && noteTextInput.value.trim()) {
            addNote();
        }
    }
    // Atalho Esc para fechar o modal.
    if (e.key === 'Escape') {
        if (modalOverlay.classList.contains('active')) {
            closeModal();
        }
    }
});

// Listener para auto-ajuste da altura do textarea de nova nota.
noteTextInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.max(120, this.scrollHeight) + 'px';
});

// Listeners para fechar modais ao clicar no fundo.
modalOverlay.addEventListener('click', function(e) {
    if (e.target === modalOverlay) closeModal();
});
themeNameModalOverlay.addEventListener('click', function(e) {
    if (e.target === themeNameModalOverlay) closeThemeNameModal();
});


// ===================================================================================
// Lógica do Carrossel da Barra de Navegação
// ===================================================================================

/**
 * @function initializeCarousel
 * @description Inicializa a funcionalidade de carrossel para uma barra de navegação.
 * @param {string} wrapperId - O ID do elemento 'wrapper' que contém a navbar e as setas.
 */
function initializeCarousel(wrapperId) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;

    const navbar = wrapper.querySelector('.navbar');
    const leftArrow = wrapper.querySelector('.left-arrow');
    const rightArrow = wrapper.querySelector('.right-arrow');

    if (!navbar || !leftArrow || !rightArrow) return;

    /**
     * @function updateArrowVisibility
     * @description Verifica se a navbar tem conteúdo excedente (overflow) e
     * mostra/esconde as setas de rolagem conforme necessário.
     */
    const updateArrowVisibility = () => {
        const hasOverflow = navbar.scrollWidth > navbar.clientWidth;
        // Mostra a seta esquerda se houver overflow e não estiver no início.
        leftArrow.style.display = hasOverflow && navbar.scrollLeft > 0 ? 'flex' : 'none';
        // Mostra a seta direita se houver overflow e não estiver no final.
        // A verificação de -1 é para contornar problemas de arredondamento de subpixels.
        rightArrow.style.display = hasOverflow && navbar.scrollLeft < navbar.scrollWidth - navbar.clientWidth - 1 ? 'flex' : 'none';
    };

    /**
     * @function scroll
     * @description Rola a navbar suavemente para a esquerda ou direita.
     * @param {'left' | 'right'} direction - A direção da rolagem.
     */
    const scroll = (direction) => {
        // Rola 80% da largura visível da navbar para uma navegação rápida.
        const scrollAmount = navbar.clientWidth * 0.8;
        navbar.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    leftArrow.addEventListener('click', () => scroll('left'));
    rightArrow.addEventListener('click', () => scroll('right'));
    navbar.addEventListener('scroll', updateArrowVisibility);
    window.addEventListener('resize', updateArrowVisibility); // Garante que a UI se ajuste ao redimensionar.

    // Um `MutationObserver` é usado para detectar quando novas abas são adicionadas
    // ou removidas da navbar, para que a visibilidade das setas seja reavaliada.
    const observer = new MutationObserver(updateArrowVisibility);
    observer.observe(navbar, { childList: true, subtree: true });

    // Chama a função uma vez após um pequeno delay para garantir que o layout
    // inicial esteja completo antes de verificar o overflow.
    setTimeout(updateArrowVisibility, 100);
}

// Inicializa os carrosséis quando o DOM estiver pronto.
document.addEventListener('DOMContentLoaded', () => {
    initializeCarousel('navbarWrapper');
    initializeCarousel('secondaryNavbarWrapper');
});
