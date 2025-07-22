function updateBadgeCount(tabId){if(!currentUser)return;const badge=document.getElementById("badge_"+tabId);if(!badge)return;db.collection("postits").where("uid","==",currentUser.uid).where("category","==",tabId).onSnapshot(snap=>{const count=snap.size;badge.style.display=count>0?"inline-block":"none";if(count>0)badge.textContent=count;let overdue=false,pending=false;snap.docs.forEach(d=>{const n=d.data();if(n.dueDate){const t=new Date();t.setHours(0,0,0,0);const due=new Date(n.dueDate.split('-')[0],n.dueDate.split('-')[1]-1,n.dueDate.split('-')[2]);due.setHours(0,0,0,0);if(due<=t)overdue=true;else pending=true;}if(overdue)return;});badge.style.backgroundColor=overdue?'#dc143c':(pending?'#1d7e14':'#6e3c0e');badge.title=overdue?'Vencidos/Hoje':(pending?'Pendentes':(count>0?`${count} nota(s)`:''));},e=>{console.error("Erro badge:",e);badge.style.display='none';});}

function updateBadgeCount(tabId){if(!currentUser)return;const badge=document.getElementById("badge_"+tabId);if(!badge)return;db.collection("postits").where("uid","==",currentUser.uid).where("category","==",tabId).onSnapshot(snap=>{const count=snap.size;badge.style.display=count>0?"inline-block":"none";if(count>0)badge.textContent=count;let overdue=false,pending=false;snap.docs.forEach(d=>{const n=d.data();if(n.dueDate){const t=new Date();t.setHours(0,0,0,0);const due=new Date(n.dueDate.split('-')[0],n.dueDate.split('-')[1]-1,n.dueDate.split('-')[2]);due.setHours(0,0,0,0);if(due<=t)overdue=true;else pending=true;}if(overdue)return;});badge.style.backgroundColor=overdue?'#dc143c':(pending?'#1d7e14':'#6e3c0e');badge.title=overdue?'Vencidos/Hoje':(pending?'Pendentes':(count>0?`${count} nota(s)`:''));},e=>{console.error("Erro badge:",e);badge.style.display='none';});}

// ===================================================================================
// Gerenciador de Temas e Abas Pessoais
// ===================================================================================
// Este arquivo contém toda a lógica para carregar, criar, editar, deletar e
// reordenar tanto as "Abas Pessoais" quanto os "Tipos de Tema" e seus
// respectivos "Subtemas" (instâncias).
//
// SUGESTÃO DE REATORAÇÃO:
// A funcionalidade de "Abas Pessoais" e "Tipos de Tema" é distinta. Para maior
// clareza e manutenibilidade, seria ideal dividir este arquivo em dois:
// - `personal-tabs-manager.js`: Cuidaria de toda a lógica das abas pessoais.
// - `theme-types-manager.js`: Cuidaria dos tipos de tema e seus subtemas.
// Por enquanto, os comentários seguirão a estrutura atual.
// ===================================================================================


// -----------------------------------------------------------------------------------
// Seção: Gerenciamento de Abas Pessoais (Personal Tabs)
// -----------------------------------------------------------------------------------

/**
 * @async
 * @function loadUserPersonalTabs
 * @description Carrega as abas pessoais do usuário logado a partir do Firestore.
 * Se for o primeiro login do usuário e nenhuma aba pessoal existir, esta função
 * também inicializa um conjunto de abas padrão baseadas na antiga variável `categorias`.
 */
async function loadUserPersonalTabs() {
    if (!currentUser) {
        currentUserPersonalTabs = [];
        buildNavbar(); // Reconstrói a navbar vazia.
        return;
    }
    try {
        const snapshot = await db.collection("userPersonalCategories")
            .where("uid", "==", currentUser.uid)
            .orderBy("order", "asc") // Garante que as abas sejam carregadas na ordem correta.
            .get();

        currentUserPersonalTabs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Bloco de inicialização para novos usuários.
        // NOTA: Esta é uma forma de migrar usuários de um sistema antigo (se houvesse)
        // ou simplesmente dar um ponto de partida para novos usuários.
        if (currentUserPersonalTabs.length === 0 && typeof categorias !== 'undefined' && categorias.length > 0) {
            const batch = db.batch();
            const colorMap = {'pessoal':'default-yellow','diario':'pastel-peach','reuniao':'pastel-green','trabalho':'pastel-blue','investimentos':'pastel-green','motivacionais':'pastel-pink','gestao':'pastel-blue','mimos_esposa':'pastel-pink','mimos_filho':'pastel-blue','mimos_flavio':'pastel-purple','mimos_casa':'default-yellow','sonhos':'pastel-peach'};
            const iconMap = {'pessoal':'fa-exclamation-triangle','diario':'fa-pencil-alt','reuniao':'fa-calendar-alt','trabalho':'fa-briefcase','investimentos':'fa-chart-line','motivacionais':'fa-lightbulb','gestao':'fa-book','mimos_esposa':'fa-heart','mimos_filho':'fa-child','mimos_flavio':'fa-gift','mimos_casa':'fa-home','sonhos':'fa-star'};

            categorias.forEach((cat, idx) => {
                const oId = cat[0];
                // Cria um novo documento para cada categoria padrão.
                batch.set(db.collection("userPersonalCategories").doc(), {
                    uid: currentUser.uid,
                    name: cat[1],
                    originalId: oId, // Mantém uma referência ao ID original, se necessário.
                    order: idx,
                    postitColor: colorMap[oId] || 'default-yellow',
                    tabIcon: iconMap[oId] || 'fa-sticky-note',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            await batch.commit(); // Envia todas as criações de uma vez só.

            // Recarrega as abas para obter os dados recém-criados.
            const newSnap = await db.collection("userPersonalCategories").where("uid", "==", currentUser.uid).orderBy("order", "asc").get();
            currentUserPersonalTabs = newSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
    } catch (e) {
        console.error("Erro ao carregar/inicializar abas pessoais:", e);
        currentUserPersonalTabs = []; // Garante um estado limpo em caso de erro.
        alert("Erro ao carregar suas abas pessoais.");
    }
    buildNavbar(); // Atualiza a UI com as abas carregadas.
}

/**
 * @function openManagePersonalTabsModal
 * @description Abre o modal para gerenciar (ver, reordenar, deletar) as abas pessoais.
 */
function openManagePersonalTabsModal() {
    if (managePersonalTabsModalOverlay && currentUser) {
        populatePersonalTabsList();
        managePersonalTabsModalOverlay.classList.add('active');
    } else if (!currentUser) {
        alert("Login necessário.");
    }
}

function closeManagePersonalTabsModal() {
    if (managePersonalTabsModalOverlay) managePersonalTabsModalOverlay.classList.remove('active');
}

/**
 * @function populatePersonalTabsList
 * @description Popula a lista de abas pessoais dentro do modal de gerenciamento.
 * Também inicializa a funcionalidade de arrastar e soltar (SortableJS).
 */
function populatePersonalTabsList() {
    if (!personalTabsListContainer) return;
    personalTabsListContainer.innerHTML = ''; // Limpa a lista anterior.

    if (!currentUserPersonalTabs || currentUserPersonalTabs.length === 0) {
        personalTabsListContainer.innerHTML = '<p style="text-align:center;color:#8b4513;padding:20px;">Nenhuma aba. Adicione uma!</p>';
        return;
    }

    const ul = document.createElement('ul');
    ul.style.listStyleType = 'none';
    ul.style.padding = '0';
    ul.id = 'sortablePersonalTabsList';

    currentUserPersonalTabs.forEach(tab => {
        const li = document.createElement('li');
        li.dataset.id = tab.id;
        li.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #e0d8c8;font-family:'Courier Prime',monospace;font-size:0.9rem;background-color:#fdfaf3;border-radius:3px;margin-bottom:4px;";
        li.onmouseover = () => li.style.backgroundColor = '#f5f0e6';
        li.onmouseout = () => li.style.backgroundColor = '#fdfaf3';

        // Elementos visuais (ícone, cor, nome).
        const colorInd = document.createElement('span');
        const colorHex = AVAILABLE_POSTIT_COLORS.find(c => c.id === (tab.postitColor || 'default-yellow'))?.hex || '#FFF59D';
        colorInd.style.cssText = `width:16px;height:16px;border-radius:50%;background-color:${colorHex};margin-right:8px;border:1px solid rgba(0,0,0,0.2);flex-shrink:0;`;
        colorInd.title = `Cor: ${AVAILABLE_POSTIT_COLORS.find(c => c.id === (tab.postitColor || 'default-yellow'))?.name || 'Padrão'}`;

        const iconEl = document.createElement('i');
        iconEl.className = `fas ${tab.tabIcon || 'fa-sticky-note'}`;
        iconEl.style.marginRight = '8px';
        iconEl.style.color = '#555';

        const nameSp = document.createElement('span');
        nameSp.className = 'personal-tab-name';
        nameSp.textContent = tab.name;
        nameSp.style.flexGrow = "1";
        nameSp.style.cursor = "grab"; // Indica que o item é arrastável.

        const contWrap = document.createElement('div');
        contWrap.style.display = 'flex';
        contWrap.style.alignItems = 'center';
        contWrap.style.flexGrow = '1';
        contWrap.appendChild(iconEl);
        contWrap.appendChild(colorInd);
        contWrap.appendChild(nameSp);

        // Botões de ação (editar, deletar).
        const actsDiv = document.createElement('div');
        actsDiv.className = 'personal-tab-actions';
        actsDiv.style.display = "flex";
        actsDiv.style.gap = "6px";
        const edBtn = document.createElement('button');
        edBtn.innerHTML = '<i class="fas fa-edit"></i>';
        edBtn.title = "Editar";
        edBtn.className = 'edit-theme-type-btn';
        edBtn.style.padding = "5px 8px";
        edBtn.onclick = (e) => { e.stopPropagation(); openPersonalTabEditModal(tab); };
        const delBtn = document.createElement('button');
        delBtn.innerHTML = '<i class="fas fa-trash"></i>';
        delBtn.title = "Deletar";
        delBtn.className = 'delete-theme-type-btn';
        delBtn.style.padding = "5px 8px";
        delBtn.onclick = (e) => { e.stopPropagation(); confirmDeletePersonalTab(tab.id, tab.name); };
        actsDiv.appendChild(edBtn);
        actsDiv.appendChild(delBtn);

        li.appendChild(contWrap);
        li.appendChild(actsDiv);
        ul.appendChild(li);
    });

    if (ul.lastChild) ul.lastChild.style.borderBottom = 'none';
    personalTabsListContainer.appendChild(ul);

    // Inicializa o SortableJS na lista.
    if (document.getElementById('sortablePersonalTabsList')) {
        new Sortable(document.getElementById('sortablePersonalTabsList'), {
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onEnd: async function(evt) {
                // Callback executado após o usuário soltar um item.
                const ids = Array.from(evt.target.children).map(i => i.dataset.id);
                // Atualiza a ordem no array local para feedback imediato (UI otimista).
                const newOrdTabs = [];
                ids.forEach((id, idx) => {
                    const t = currentUserPersonalTabs.find(x => x.id === id);
                    if (t) {
                        t.order = idx;
                        newOrdTabs.push(t);
                    }
                });
                currentUserPersonalTabs = newOrdTabs;

                // Salva a nova ordem no Firestore usando um batch write.
                const batch = db.batch();
                currentUserPersonalTabs.forEach(t => {
                    if (t.id && typeof t.order === 'number') {
                        batch.update(db.collection("userPersonalCategories").doc(t.id), { order: t.order });
                    }
                });
                try {
                    await batch.commit();
                    buildNavbar(); // Reconstrói a navbar principal para refletir a nova ordem.
                } catch (e) {
                    console.error("Erro ao salvar nova ordem das abas:", e);
                    alert("Erro ao salvar a nova ordem.");
                    // Em caso de erro, recarrega os dados do servidor para reverter a UI.
                    await loadUserPersonalTabs();
                    populatePersonalTabsList();
                }
            }
        });
    }
}

/**
 * @function openPersonalTabEditModal
 * @description Abre o modal para criar ou editar uma aba pessoal.
 * Popula as paletas de cores e grades de ícones.
 * @param {object|null} tabToEdit - O objeto da aba a ser editada, ou `null` para criar uma nova.
 */
function openPersonalTabEditModal(tabToEdit = null) {
    if (!personalTabEditModalOverlay || !personalTabColorPalette || !selectedPersonalTabColorInput || !personalTabIconGrid || !selectedPersonalTabIconInput) {
        console.error("Elementos do modal de edição de aba pessoal não encontrados!");
        return;
    }

    // --- Preenchimento dos Campos e Definição de Valores Iniciais ---
    let initialColorId, initialIconClass;
    if (tabToEdit && tabToEdit.id) {
        personalTabEditModalTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Aba';
        editingPersonalTabIdInput.value = tabToEdit.id;
        personalTabNameInput.value = tabToEdit.name;
        initialColorId = tabToEdit.postitColor || 'default-yellow';
        initialIconClass = tabToEdit.tabIcon || 'fa-sticky-note';
    } else {
        personalTabEditModalTitle.innerHTML = '<i class="fas fa-plus"></i> Nova Aba';
        editingPersonalTabIdInput.value = '';
        personalTabNameInput.value = '';
        initialColorId = 'default-yellow';
        initialIconClass = 'fa-sticky-note';
    }
    selectedPersonalTabColorInput.value = initialColorId;
    selectedPersonalTabIconInput.value = initialIconClass;


    // --- Configuração da Paleta de Cores ---
    personalTabColorPalette.innerHTML = '';
    AVAILABLE_POSTIT_COLORS.forEach(color => {
        const div = document.createElement('div');
        div.style.backgroundColor = color.hex;
        div.dataset.colorId = color.id;
        div.title = color.name;
        if (color.id === initialColorId) {
            div.classList.add('selected');
        }
        div.onclick = () => {
            selectedPersonalTabColorInput.value = color.id;
            Array.from(personalTabColorPalette.children).forEach(c => c.classList.remove('selected'));
            div.classList.add('selected');
        };
        personalTabColorPalette.appendChild(div);
    });

    // --- Configuração da Grade de Ícones ---
    personalTabIconGrid.innerHTML = '';
    AVAILABLE_ICONS.forEach(iconClass => {
        const wrap = document.createElement('div');
        wrap.dataset.iconClass = iconClass;
        if (iconClass === initialIconClass) {
            wrap.classList.add('selected');
        }
        const iEl = document.createElement('i');
        iEl.className = `fas ${iconClass}`;
        iEl.title = iconClass.replace('fa-', '');
        wrap.appendChild(iEl);
        wrap.onclick = () => {
            selectedPersonalTabIconInput.value = iconClass;
            Array.from(personalTabIconGrid.children).forEach(c => c.classList.remove('selected'));
            wrap.classList.add('selected');
        };
        personalTabIconGrid.appendChild(wrap);
    });

    personalTabEditModalOverlay.classList.add('active');
    personalTabNameInput.focus();
}

/**
 * @function closePersonalTabEditModal
 * @description Fecha e reseta o modal de edição de aba pessoal.
 */
function closePersonalTabEditModal() {
    if (personalTabEditModalOverlay) {
        personalTabEditModalOverlay.classList.remove('active');
        editingPersonalTabIdInput.value = '';
        personalTabNameInput.value = '';
        selectedPersonalTabColorInput.value = '';
        selectedPersonalTabIconInput.value = 'fa-sticky-note';
        if (personalTabColorPalette) personalTabColorPalette.innerHTML = '';
        if (personalTabIconGrid) personalTabIconGrid.innerHTML = '';
    }
}

/**
 * @async
 * @function savePersonalTab
 * @description Salva as alterações de uma aba pessoal (nova ou existente) no Firestore.
 */
async function savePersonalTab() {
    const id = editingPersonalTabIdInput.value.trim(),
        name = personalTabNameInput.value.trim();
    const color = selectedPersonalTabColorInput.value || AVAILABLE_POSTIT_COLORS[0].id;
    const icon = selectedPersonalTabIconInput.value || 'fa-sticky-note';

    if (!name) { alert("Nome da aba é obrigatório."); personalTabNameInput.focus(); return; }
    if (!currentUser) { alert("Erro: Usuário não logado."); closePersonalTabEditModal(); return; }

    savePersonalTabBtn.disabled = true;
    savePersonalTabBtn.innerHTML = '<div class="loading"></div> Salvando...';

    const data = { name, postitColor: color, tabIcon: icon, uid: currentUser.uid };
    try {
        if (id) {
            // Se há um ID, atualiza o documento existente.
            await db.collection("userPersonalCategories").doc(id).update({ name: data.name, postitColor: data.postitColor, tabIcon: data.tabIcon });
        } else {
            // Se não há ID, cria um novo documento.
            // Calcula a próxima posição de 'order'.
            let maxOrd = -1;
            if (currentUserPersonalTabs && currentUserPersonalTabs.length > 0) {
                const ords = currentUserPersonalTabs.map(t => typeof t.order === 'number' ? t.order : -1);
                if(ords.length > 0) maxOrd = Math.max(...ords.filter(o => o !== -1), -1);
            }
            data.order = maxOrd + 1;
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("userPersonalCategories").add(data);
        }
        // Recarrega os dados e atualiza a UI.
        await loadUserPersonalTabs();
        populatePersonalTabsList();
        closePersonalTabEditModal();
    } catch (e) {
        console.error("Erro ao salvar aba:", e);
        alert("Erro ao salvar aba.");
    } finally {
        savePersonalTabBtn.disabled = false;
        savePersonalTabBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Aba';
    }
}

/**
 * @async
 * @function confirmDeletePersonalTab
 * @description Confirma e executa a exclusão de uma aba pessoal.
 * Antes de excluir, verifica se a aba não contém nenhuma nota associada.
 * @param {string} tabId - O ID da aba a ser excluída.
 * @param {string} tabName - O nome da aba, para ser usado nas mensagens.
 */
async function confirmDeletePersonalTab(tabId, tabName) {
    if (!currentUser) { alert("Erro: Usuário não logado."); return; }

    // VERIFICAÇÃO DE SEGURANÇA: Não permite excluir uma aba se ela contiver notas.
    try {
        const notesSnap = await db.collection("postits").where("uid", "==", currentUser.uid).where("category", "==", tabId).limit(1).get();
        if (!notesSnap.empty) {
            alert(`A aba "${tabName}" não pode ser excluída porque contém notas. Por favor, mova ou exclua as notas primeiro.`);
            return;
        }
    } catch (e) {
        console.error("Erro ao verificar notas na aba:", e);
        alert("Ocorreu um erro ao verificar as notas da aba.");
        return;
    }

    openConfirmationModal(`Excluir: ${tabName}`, `Tem certeza que deseja excluir a aba "${tabName}"?`, async () => {
        try {
            await db.collection("userPersonalCategories").doc(tabId).delete();
            const oldTab = currentTab;
            await loadUserPersonalTabs();
            populatePersonalTabsList();

            // Se a aba excluída era a que estava ativa, muda para a primeira aba da lista.
            if (oldTab === tabId) {
                if (currentUserPersonalTabs.length > 0) {
                    changeTab(currentUserPersonalTabs.sort((a, b) => a.order - b.order)[0].id);
                } else {
                    // Se não houver mais abas, limpa a UI.
                    currentTab = null;
                    navbarContainer.innerHTML = '<p style="text-align:center;color:#f4f1e8;padding:10px;">Crie uma aba!</p>';
                    notesContainer.innerHTML = '<p style="text-align:center;color:#8b4513;margin-top:50px;">Nenhuma aba.</p>';
                    if (managePersonalTabsBtn) managePersonalTabsBtn.style.display = 'flex';
                }
            }
        } catch (e) {
            console.error("Erro ao excluir aba:", e);
            alert("Erro ao excluir a aba.");
        }
    });
}


// -----------------------------------------------------------------------------------
// Seção: Gerenciamento de Tipos de Tema (Theme Types)
// -----------------------------------------------------------------------------------

/**
 * @async
 * @function loadUserDefinedThemeTypes
 * @description Carrega do Firestore os "tipos de tema" criados pelo usuário.
 * Popula tanto um array (`currentUserThemeTypesArray`) para iteração quanto um
 * mapa (`currentUserThemeTypesMap`) para busca rápida.
 * Inclui uma lógica de fallback para garantir que os temas tenham um campo 'order'.
 */
async function loadUserDefinedThemeTypes() {
    if (!currentUser) {
        currentUserThemeTypesArray = [];
        currentUserThemeTypesMap = {};
        return;
    }
    try {
        let snapshot = await db.collection("userDefinedThemeTypes").where("uid", "==", currentUser.uid).orderBy("order", "asc").get();

        // Fallback para o caso de documentos antigos não terem o campo 'order'.
        if (snapshot.empty) {
            const fallbackSnapshot = await db.collection("userDefinedThemeTypes").where("uid", "==", currentUser.uid).orderBy("name", "asc").get();
            if (!fallbackSnapshot.empty) {
                snapshot = fallbackSnapshot;
                const batch = db.batch();
                let order = 0;
                // Adiciona o campo 'order' aos documentos que não o possuem.
                snapshot.docs.forEach(doc => {
                    if (doc.data().order === undefined) {
                        const docRef = db.collection("userDefinedThemeTypes").doc(doc.id);
                        batch.update(docRef, { order: order++ });
                    }
                });
                await batch.commit();
                // Recarrega com a ordenação correta.
                snapshot = await db.collection("userDefinedThemeTypes").where("uid", "==", currentUser.uid).orderBy("order", "asc").get();
            }
        }

        currentUserThemeTypesArray = [];
        currentUserThemeTypesMap = {};
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                const data = doc.data();
                const id = doc.id;
                const conf = {
                    id,
                    label: `${data.iconClass ? '<i class="fas ' + data.iconClass + '"></i> ' : ''}${escapeHTML(data.name)}`, // Label com HTML para UI.
                    name: data.name,
                    singularName: data.name, // Pode ser customizado no futuro.
                    iconClass: data.iconClass,
                    postitColor: data.postitColor
                };
                currentUserThemeTypesArray.push(conf);
                currentUserThemeTypesMap[id] = conf; // Mapeia por ID para acesso O(1).
            });
        }
        console.log("Tipos de tema carregados:", currentUserThemeTypesArray);
    } catch (e) {
        console.error("Erro ao carregar tipos de tema:", e);
        currentUserThemeTypesArray = [];
        currentUserThemeTypesMap = {};
        alert("Erro ao carregar as configurações de tema.");
    }
}

/**
 * @function openThemeNameModal
 * @description Abre um modal simples para o usuário digitar o nome de um novo subtema.
 * @param {string} themeTypeId - O ID do tipo de tema pai.
 * @deprecated Esta função parece ser um método mais antigo e talvez redundante,
 * já que `openManageSubthemesModal` oferece uma UI mais completa.
 */
function openThemeNameModal(themeTypeId) {
    const conf = currentUserThemeTypesMap[themeTypeId];
    if (!conf) { alert("Erro: Tipo de tema desconhecido."); return; }
    currentThemeType = themeTypeId;
    themeNameModalTitle.textContent = `Novo ${conf.singularName}`;
    themeNameInput.value = '';
    themeNameModalOverlay.classList.add('active');
    themeNameInput.focus();
}

function closeThemeNameModal() {
    themeNameModalOverlay.classList.remove('active');
    themeNameInput.value = '';
    currentThemeType = null;
}

function saveThemeName() {
    const name = themeNameInput.value.trim();
    if (name && currentThemeType) {
        addNewTheme(currentThemeType, name); // `addNewTheme` está em `app.js`.
        closeThemeNameModal();
    } else if (!name) {
        alert('Digite um nome.');
    } else {
        alert('Erro: Tipo de tema não definido.');
    }
}

// -----------------------------------------------------------------------------------
// Seção: Gerenciamento de Subtemas (Instâncias de Tipos de Tema)
// -----------------------------------------------------------------------------------

let currentManagingThemeTypeId = null; // Armazena o contexto do modal de gerenciamento.

/**
 * @function openManageSubthemesModal
 * @description Abre o modal para gerenciar os subtemas de um tipo de tema específico.
 * @param {string} themeTypeId - O ID do tipo de tema pai.
 */
function openManageSubthemesModal(themeTypeId) {
    const themeTypeConfig = currentUserThemeTypesMap[themeTypeId];
    if (!themeTypeConfig) {
        alert("Erro: Tipo de tema desconhecido.");
        return;
    }
    currentManagingThemeTypeId = themeTypeId;
    manageSubthemesModalTitle.innerHTML = `<i class="fas ${themeTypeConfig.iconClass || 'fa-folder'}"></i> Gerenciar: ${escapeHTML(themeTypeConfig.name)}`;
    populateSubthemesList();
    manageSubthemesModalOverlay.classList.add('active');
}

function closeManageSubthemesModal() {
    manageSubthemesModalOverlay.classList.remove('active');
    currentManagingThemeTypeId = null;
    if (subthemesListContainer) subthemesListContainer.innerHTML = '<p>Carregando...</p>';
}

/**
 * @async
 * @function populateSubthemesList
 * @description Popula a lista de subtemas dentro do modal de gerenciamento.
 */
async function populateSubthemesList() {
    if (!currentManagingThemeTypeId || !subthemesListContainer) return;
    subthemesListContainer.innerHTML = '<p style="text-align:center;color:#8b4513;padding:20px;">Carregando...</p>';

    try {
        const snapshot = await db.collection("userThemes")
            .where("uid", "==", currentUser.uid)
            .where("type", "==", currentManagingThemeTypeId)
            .orderBy("order", "asc")
            .get();

        const subthemes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (subthemes.length === 0) {
            subthemesListContainer.innerHTML = '<p style="text-align:center;color:#8b4513;padding:20px;">Nenhum subtema. Adicione um!</p>';
            return;
        }

        subthemesListContainer.innerHTML = '';
        const ul = document.createElement('ul');
        ul.style.listStyleType = 'none';
        ul.style.padding = '0';
        ul.id = 'sortableSubthemesList';

        subthemes.forEach(theme => {
            const li = document.createElement('li');
            li.dataset.id = theme.id;
            li.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #e0d8c8;font-family:'Courier Prime',monospace;background-color:#fdfaf3;border-radius:3px;margin-bottom:4px;";

            const nameSpan = document.createElement('span');
            nameSpan.className = 'subtheme-name';
            nameSpan.textContent = theme.themeName;
            nameSpan.style.flexGrow = "1";
            nameSpan.style.cursor = "grab";

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'subtheme-actions';
            actionsDiv.style.display = "flex";
            actionsDiv.style.gap = "8px";

            const editBtn = document.createElement('button');
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.title = "Editar Nome";
            editBtn.className = 'modal-action-btn edit';
            editBtn.onclick = () => editSubthemeName(theme.id, theme.themeName);

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = "Deletar Subtema e suas Notas";
            deleteBtn.className = 'modal-action-btn delete';
            // `deleteThemeAndNotes` está em `app.js` e é uma função genérica.
            deleteBtn.onclick = () => deleteThemeAndNotes(theme.id, theme.themeName, theme.type);

            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(deleteBtn);
            li.appendChild(nameSpan);
            li.appendChild(actionsDiv);
            ul.appendChild(li);
        });

        subthemesListContainer.appendChild(ul);

        // Ativa o SortableJS para reordenar os subtemas.
        new Sortable(ul, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onEnd: async function(evt) {
                const itemIds = Array.from(ul.children).map(item => item.dataset.id);
                const batch = db.batch();
                itemIds.forEach((id, index) => {
                    const docRef = db.collection("userThemes").doc(id);
                    batch.update(docRef, { order: index });
                });
                try {
                    await batch.commit();
                    // Reconstrói a navbar secundária para refletir a nova ordem.
                    buildSecondaryNavbar(currentManagingThemeTypeId);
                } catch (error) {
                    console.error("Erro ao salvar a nova ordem:", error);
                    alert("Ocorreu um erro ao salvar a ordem.");
                }
            }
        });

    } catch (error) {
        console.error("Erro ao carregar subtemas:", error);
        subthemesListContainer.innerHTML = '<p style="text-align:center;color:red;padding:20px;">Erro ao carregar subtemas.</p>';
    }
}

/**
 * @async
 * @function handleAddNewSubtheme
 * @description Pega o nome do input e cria um novo subtema no Firestore.
 */
async function handleAddNewSubtheme() {
    const name = newSubthemeNameInput.value.trim();
    if (!name) {
        alert("O nome do subtema não pode estar vazio.");
        newSubthemeNameInput.focus();
        return;
    }
    if (!currentManagingThemeTypeId || !currentUser) {
        alert("Erro: Contexto do tema ou usuário não definido.");
        return;
    }

    addSubthemeBtn.disabled = true;
    addSubthemeBtn.innerHTML = '<div class="loading-small"></div>';

    try {
        // Encontra a última ordem para adicionar o novo item no final.
        const snapshot = await db.collection("userThemes")
            .where("uid", "==", currentUser.uid)
            .where("type", "==", currentManagingThemeTypeId)
            .orderBy("order", "desc").limit(1).get();
        let newOrder = 0;
        if (!snapshot.empty) {
            newOrder = (snapshot.docs[0].data().order || 0) + 1;
        }

        await db.collection("userThemes").add({
            uid: currentUser.uid,
            type: currentManagingThemeTypeId,
            themeName: name,
            order: newOrder,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        newSubthemeNameInput.value = '';
        await populateSubthemesList(); // Atualiza a lista no modal.
        buildSecondaryNavbar(currentManagingThemeTypeId); // Atualiza a navbar.
    } catch (error) {
        console.error("Erro ao adicionar novo subtema:", error);
        alert("Ocorreu um erro ao salvar o novo subtema.");
    } finally {
        addSubthemeBtn.disabled = false;
        addSubthemeBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar';
    }
}

/**
 * @function editSubthemeName
 * @description Abre um `prompt` para o usuário editar o nome de um subtema.
 * SUGESTÃO: Usar um `prompt` é funcional, mas pouco elegante. Uma melhoria seria
 * substituir isso por um input inline ou um pequeno modal customizado para uma
 * experiência de usuário mais moderna e consistente.
 * @param {string} id - O ID do subtema a ser editado.
 * @param {string} currentName - O nome atual, para preencher o prompt.
 */
function editSubthemeName(id, currentName) {
    openEditSubthemeModal(id, currentName);
}

function openEditSubthemeModal(id, currentName) {
    if (!editSubthemeModalOverlay) return;
    editingSubthemeIdInput.value = id;
    editSubthemeNameInput.value = currentName;
    editSubthemeModalOverlay.classList.add('active');
    editSubthemeNameInput.focus();
}

function closeEditSubthemeModal() {
    if (editSubthemeModalOverlay) {
        editSubthemeModalOverlay.classList.remove('active');
        editingSubthemeIdInput.value = '';
        editSubthemeNameInput.value = '';
    }
}

async function saveSubthemeName() {
    const id = editingSubthemeIdInput.value;
    const newName = editSubthemeNameInput.value.trim();

    if (!id || !newName) {
        alert("O nome não pode estar vazio.");
        return;
    }

    saveSubthemeNameBtn.disabled = true;
    saveSubthemeNameBtn.innerHTML = '<div class="loading-small"></div> Salvando...';

    try {
        await db.collection("userThemes").doc(id).update({ themeName: newName });

        // Atualiza a UI
        await populateSubthemesList();
        buildSecondaryNavbar(currentManagingThemeTypeId);

        // Se o tema editado for o que está ativo, atualiza o título.
        if (currentThemeInfo && currentThemeInfo.id === id) {
            selectTheme(id, currentManagingThemeTypeId, newName);
        }

        closeEditSubthemeModal();

    } catch (error) {
        console.error("Erro ao atualizar nome do subtema:", error);
        alert("Erro ao atualizar o nome.");
    } finally {
        saveSubthemeNameBtn.disabled = false;
        saveSubthemeNameBtn.innerHTML = '<i class="fas fa-save"></i> Salvar';
    }
}


// -----------------------------------------------------------------------------------
// Seção: Modais e Lógica para Gerenciar os "Tipos de Tema"
// -----------------------------------------------------------------------------------
// Esta seção é muito similar à de "Abas Pessoais", mas para os Tipos de Tema.

function openManageThemeTypesModal() {
    if (manageThemeTypesModalOverlay) {
        populateThemeTypesList();
        manageThemeTypesModalOverlay.classList.add('active');
    }
}
function closeManageThemeTypesModal() {
    if (manageThemeTypesModalOverlay) manageThemeTypesModalOverlay.classList.remove('active');
}

/**
 * @function populateThemeTypesList
 * @description Popula a lista de tipos de tema no modal de gerenciamento.
 */
function populateThemeTypesList() {
    const cont = document.getElementById('themeTypesListContainer');
    if (!cont) return;
    cont.innerHTML = '';
    if (!currentUserThemeTypesArray || currentUserThemeTypesArray.length === 0) {
        cont.innerHTML = '<p style="text-align:center;color:#8b4513;padding:20px;">Nenhum tipo de tema. Adicione um!</p>';
        return;
    }
    const ul = document.createElement('ul');
    ul.style.listStyleType = 'none';
    ul.style.padding = '0';
    ul.id = 'sortableThemeTypesList';
    currentUserThemeTypesArray.forEach(tt => {
        const li = document.createElement('li');
        li.dataset.id = tt.id;
        li.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #e0d8c8;font-family:'Courier Prime',monospace;font-size:0.9rem;background-color:#fdfaf3;border-radius:3px;margin-bottom:4px; cursor: grab;";
        li.onmouseover = () => li.style.backgroundColor = '#f5f0e6';
        li.onmouseout = () => li.style.backgroundColor = '#fdfaf3';

        const iconHTML = tt.iconClass ? `<i class="fas ${tt.iconClass}" style="margin-right:8px;color:#555;"></i>` : '<i class="fas fa-folder" style="margin-right:8px;color:#555;"></i>';
        const colorIndHTML = tt.postitColor ? `<span style="width:14px;height:14px;border-radius:50%;background-color:${AVAILABLE_POSTIT_COLORS.find(c => c.id === tt.postitColor)?.hex || '#FFF59D'};margin-right:8px;border:1px solid #ccc;display:inline-block;vertical-align:middle;"></span>` : '<span style="width:14px;height:14px;border-radius:50%;background-color:#FFF59D;margin-right:8px;border:1px solid #ccc;display:inline-block;vertical-align:middle;"></span>';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'theme-type-name';
        nameSpan.style.display = 'flex';
        nameSpan.style.alignItems = 'center';
        nameSpan.style.flexGrow = '1';
        nameSpan.innerHTML = `${iconHTML}${colorIndHTML}${escapeHTML(tt.name)}`;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'theme-type-actions';
        actionsDiv.style.display = 'flex';
        actionsDiv.style.gap = '8px';

        const editBtn = document.createElement('button');
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Editar';
        editBtn.title = "Editar";
        editBtn.className = 'modal-action-btn edit';
        editBtn.onclick = () => openThemeTypeEditModal(tt);

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Deletar';
        deleteBtn.title = "Deletar";
        deleteBtn.className = 'modal-action-btn delete';
        deleteBtn.onclick = () => confirmDeleteThemeType(tt.id, tt.name);

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);

        li.appendChild(nameSpan);
        li.appendChild(actionsDiv);
        ul.appendChild(li);
    });
    if (ul.lastChild) ul.lastChild.style.borderBottom = 'none';
    cont.appendChild(ul);

    new Sortable(ul, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        onEnd: async function(evt) {
            const itemIds = Array.from(ul.children).map(item => item.dataset.id);
            const batch = db.batch();
            itemIds.forEach((id, index) => {
                const docRef = db.collection("userDefinedThemeTypes").doc(id);
                batch.update(docRef, { order: index });
            });
            try {
                await batch.commit();
                console.log("Ordem dos tipos de tema atualizada com sucesso.");
                await loadUserDefinedThemeTypes();
                populateNewCategoryDropdown();
                updateMobileActionColumnUI();
            } catch (error) {
                console.error("Erro ao salvar a nova ordem dos tipos de tema:", error);
                alert("Ocorreu um erro ao salvar a ordem. A página será atualizada.");
                location.reload();
            }
        }
    });
}

// Listener para o botão de salvar no modal de edição de tipo de tema.
// NOTA: O código está um pouco condensado e poderia ser mais legível se quebrado
// em funções menores.
if (manageThemeTypesModalOverlay) {
    manageThemeTypesModalOverlay.addEventListener('click', function(e) { if (e.target === manageThemeTypesModalOverlay) closeManageThemeTypesModal(); });
    document.getElementById('openAddThemeTypeModalBtn')?.addEventListener('click', () => openThemeTypeEditModal());
}
if (saveThemeTypeBtn) {
    saveThemeTypeBtn.addEventListener('click', async () => {
        const id = editingThemeTypeIdInput.value.trim();
        const name = themeTypeNameInputJS.value.trim();
        const icon = (selectedThemeTypeIconInput.value && selectedThemeTypeIconInput.value.trim() !== '') ? selectedThemeTypeIconInput.value : 'fa-folder';
        const color = selectedThemeTypeColorInput.value || 'default-yellow';
        if (!name) { alert("Nome é obrigatório."); themeTypeNameInputJS.focus(); return; }
        saveThemeTypeBtn.disabled = true;
        saveThemeTypeBtn.innerHTML = '<div class="loading"></div> Salvando...';
        try {
            const data = { uid: currentUser.uid, name, iconClass: icon, postitColor: color };
            if (id) {
                // Atualiza um tipo de tema existente.
                await db.collection("userDefinedThemeTypes").doc(id).update(data);
            } else {
                // Cria um novo tipo de tema, garantindo que ele tenha uma ordem.
                let maxOrder = -1;
                if (currentUserThemeTypesArray && currentUserThemeTypesArray.length > 0) {
                    const orders = currentUserThemeTypesArray.map(t => typeof t.order === 'number' ? t.order : -1);
                    if (orders.length > 0) {
                        maxOrder = Math.max(...orders.filter(o => o !== -1), -1);
                    }
                }
                data.order = maxOrder + 1;
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection("userDefinedThemeTypes").add(data);
            }
            await loadUserDefinedThemeTypes();
            populateThemeTypesList();
            populateNewCategoryDropdown();
            updateMobileActionColumnUI();
            closeThemeTypeEditModal();
        } catch (e) {
            console.error("Erro ao salvar tipo de tema:", e);
            alert("Erro ao salvar.");
        } finally {
            saveThemeTypeBtn.disabled = false;
            saveThemeTypeBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Tipo';
        }
    });
}
function openThemeTypeEditModal(themeType = null) {
    if (!themeTypeEditModalOverlay || !themeTypeIconGrid || !themeTypeColorPalette) return;

    // --- Configuração da Grade de Ícones ---
    themeTypeIconGrid.innerHTML = '';
    let initIcon = (themeType?.iconClass && themeType.iconClass.trim() !== '') ? themeType.iconClass : 'fa-folder';
    selectedThemeTypeIconInput.value = initIcon;

    AVAILABLE_ICONS.forEach(iCls => {
        const wrap = document.createElement('div');
        wrap.dataset.iconClass = iCls;
        if (iCls === initIcon) {
            wrap.classList.add('selected');
        }
        const iEl = document.createElement('i');
        iEl.className = `fas ${iCls}`;
        wrap.appendChild(iEl);

        wrap.onclick = () => {
            selectedThemeTypeIconInput.value = iCls;
            // Remove a classe 'selected' de todos os ícones e a adiciona apenas ao clicado.
            Array.from(themeTypeIconGrid.children).forEach(c => c.classList.remove('selected'));
            wrap.classList.add('selected');
        };
        themeTypeIconGrid.appendChild(wrap);
    });

    // --- Configuração da Paleta de Cores ---
    themeTypeColorPalette.innerHTML = '';
    let initColor = themeType?.postitColor || 'default-yellow';
    selectedThemeTypeColorInput.value = initColor;

    AVAILABLE_POSTIT_COLORS.forEach(color => {
        const cDiv = document.createElement('div');
        cDiv.style.backgroundColor = color.hex;
        cDiv.dataset.colorId = color.id;
        cDiv.title = color.name;
        if (color.id === initColor) {
            cDiv.classList.add('selected');
        }

        cDiv.onclick = () => {
            selectedThemeTypeColorInput.value = color.id;
            // Remove a classe 'selected' de todas as cores e a adiciona apenas à clicada.
            Array.from(themeTypeColorPalette.children).forEach(c => c.classList.remove('selected'));
            cDiv.classList.add('selected');
        };
        themeTypeColorPalette.appendChild(cDiv);
    });

    // --- Preenchimento dos Campos e Exibição do Modal ---
    editingThemeTypeIdInput.value = themeType?.id || '';
    themeTypeNameInputJS.value = themeType?.name || '';
    themeTypeEditModalTitle.innerHTML = `<i class="fas ${themeType ? (initIcon || 'fa-edit') : 'fa-plus'}"></i> ${themeType ? 'Editar' : 'Adicionar'} Tipo de Tema`;
    themeTypeEditModalOverlay.classList.add('active');
    themeTypeNameInputJS.focus();
}
function closeThemeTypeEditModal() {
    if (themeTypeEditModalOverlay) {
        themeTypeEditModalOverlay.classList.remove('active');
        editingThemeTypeIdInput.value = '';
        themeTypeNameInputJS.value = '';
        selectedThemeTypeIconInput.value = 'fa-folder';
        selectedThemeTypeColorInput.value = 'default-yellow';
        if (themeTypeIconGrid) themeTypeIconGrid.innerHTML = '';
        if (themeTypeColorPalette) themeTypeColorPalette.innerHTML = '';
    }
}
if(themeTypeEditModalOverlay) themeTypeEditModalOverlay.addEventListener('click', function(e){if(e.target === themeTypeEditModalOverlay) closeThemeTypeEditModal();});

/**
 * @async
 * @function confirmDeleteThemeType
 * @description Confirma e executa a exclusão de um tipo de tema.
 * Verifica se o tipo de tema não está em uso por nenhum subtema antes de excluir.
 * @param {string} themeTypeId - ID do tipo de tema a ser excluído.
 * @param {string} themeTypeName - Nome para as mensagens.
 */
async function confirmDeleteThemeType(themeTypeId, themeTypeName) {
    openConfirmationModal(`Excluir Tipo: ${themeTypeName}`, `Tem certeza que deseja excluir "${themeTypeName}"? (Os subtemas e notas existentes NÃO serão excluídos, mas ficarão órfãos).`, async () => {
        if (!currentUser) { alert("Não logado."); return; }
        try {
            // VERIFICAÇÃO DE SEGURANÇA: Impede a exclusão se houver subtemas usando este tipo.
            const instSnap = await db.collection("userThemes").where("uid", "==", currentUser.uid).where("type", "==", themeTypeId).limit(1).get();
            if (!instSnap.empty) {
                alert(`O tipo de tema "${themeTypeName}" está em uso por subtemas como "${instSnap.docs[0].data().themeName}". Por favor, remova ou reatribua estes subtemas antes de excluir o tipo.`);
                return;
            }
            await db.collection("userDefinedThemeTypes").doc(themeTypeId).delete();
            await loadUserDefinedThemeTypes();
            populateThemeTypesList();
            populateNewCategoryDropdown();
            updateMobileActionColumnUI();
            // Se o tipo de tema excluído estava ativo, volta para a tela de abas pessoais.
            if (currentThemeInfo && currentThemeInfo.type === themeTypeId) {
                secondaryNavbarWrapper.style.display = "none";
                notesContainer.innerHTML = '';
                handleNewCategorySelection('pessoais');
            }
        } catch (e) {
            console.error("Erro ao excluir tipo de tema:", e);
            alert("Erro ao excluir.");
        }
    });
};

// -----------------------------------------------------------------------------------
// Listeners de Eventos Globais para os Modais
// -----------------------------------------------------------------------------------
// Agrupamento final de listeners para garantir que os modais sejam interativos.

if (managePersonalTabsModalOverlay) managePersonalTabsModalOverlay.addEventListener('click', function(event) { if (event.target === managePersonalTabsModalOverlay) closeManagePersonalTabsModal(); });
if (openAddPersonalTabModalBtn) openAddPersonalTabModalBtn.addEventListener('click', () => openPersonalTabEditModal());
if (personalTabEditModalOverlay) personalTabEditModalOverlay.addEventListener('click', function(event) { if (event.target === personalTabEditModalOverlay) closePersonalTabEditModal(); });
if (savePersonalTabBtn) savePersonalTabBtn.addEventListener('click', savePersonalTab);

if (manageSubthemesModalOverlay) manageSubthemesModalOverlay.addEventListener('click', function(event) { if (event.target === manageSubthemesModalOverlay) closeManageSubthemesModal(); });
if (addSubthemeBtn) addSubthemeBtn.addEventListener('click', handleAddNewSubtheme);
if (newSubthemeNameInput) newSubthemeNameInput.addEventListener('keydown', function(event) { if (event.key === 'Enter') handleAddNewSubtheme(); });

if (editSubthemeModalOverlay) {
    editSubthemeModalOverlay.addEventListener('click', function(event) {
        if (event.target === editSubthemeModalOverlay) {
            closeEditSubthemeModal();
        }
    });
}
if (saveSubthemeNameBtn) saveSubthemeNameBtn.addEventListener('click', saveSubthemeName);
