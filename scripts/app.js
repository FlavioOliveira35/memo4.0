// ===================================================================================
// Lógica Principal da Aplicação (Core Application Logic)
// ===================================================================================
// Este arquivo orquestra a maior parte da funcionalidade interativa da aplicação,
// incluindo a construção das barras de navegação, o carregamento de notas,
// a adição e exclusão de notas, e a troca entre diferentes contextos
// (abas pessoais vs. temas).
// ===================================================================================


// -----------------------------------------------------------------------------------
// Seção: Construção e Gerenciamento das Barras de Navegação (Navbars)
// -----------------------------------------------------------------------------------

/**
 * @function buildNavbar
 * @description Constrói ou reconstrói a barra de navegação principal (para abas pessoais).
 * Popula a navbar com botões para cada aba pessoal do usuário e inicializa
 * a funcionalidade de arrastar e soltar (SortableJS) para reordená-las.
 */
function buildNavbar() {
    navbarContainer.innerHTML = ""; // Limpa a navbar antes de reconstruir.
    if (!currentUser) {
        return;
    }

    // Determina se a navbar de abas pessoais está ativa.
    const pessoalScreenActive = navbarWrapper.style.display !== 'none' && secondaryNavbarWrapper.style.display === 'none';

    if (currentUserPersonalTabs && currentUserPersonalTabs.length > 0) {
        // Itera sobre as abas pessoais carregadas e cria um botão para cada uma.
        currentUserPersonalTabs.forEach(tab => {
            const btn = document.createElement("button");
            btn.id = "btn_" + tab.id;
            const iconCls = tab.tabIcon || 'fa-sticky-note';
            const iHTML = `<i class="fas ${iconCls}" style="margin-right:6px;"></i>`;
            btn.innerHTML = `${iHTML}${escapeHTML(tab.name)}<span class="badge" id="badge_${tab.id}">0</span>`;
            btn.onclick = () => changeTab(tab.id);
            if (tab.id === currentTab && pessoalScreenActive) btn.classList.add('active-tab');
            navbarContainer.appendChild(btn);
            updateBadgeCount(tab.id); // Atualiza a contagem de notas no badge.
        });

        // Lógica para garantir que uma aba válida esteja sempre selecionada.
        const currTabValidInPersonalContext = pessoalScreenActive && currentUserPersonalTabs.some(t => t.id === currentTab);
        if (pessoalScreenActive && (!currentTab || !currTabValidInPersonalContext) && currentUserPersonalTabs.length > 0) {
            currentTab = currentUserPersonalTabs[0].id; // Seleciona a primeira aba como padrão.
        }

        if (currentTab && pessoalScreenActive) loadNotes();
        else if (pessoalScreenActive) notesContainer.innerHTML = '<p class="text-center" style="width:100%;color:#8b4513;margin-top:50px;">Selecione uma aba.</p>';

        // Inicializa o SortableJS na navbar principal (apenas em desktop).
        if (!isMobileView()) {
            new Sortable(navbarContainer, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                dragClass: 'sortable-drag',
                onEnd: async function(evt) {
                    const ids = Array.from(evt.target.children).map(btn => btn.id.replace('btn_', ''));
                    const batch = db.batch();
                    ids.forEach((id, index) => {
                        if (id) {
                            const docRef = db.collection("userPersonalCategories").doc(id);
                            batch.update(docRef, { order: index });
                        }
                    });
                    try {
                        await batch.commit();
                        await loadUserPersonalTabs(); // Recarrega para garantir consistência.
                    } catch (error) {
                        console.error("Erro ao salvar a nova ordem das abas:", error);
                        alert("Ocorreu um erro ao salvar a ordem.");
                        buildNavbar(); // Reverte a UI em caso de erro.
                    }
                }
            });
        }

    } else if (pessoalScreenActive) {
        // Exibe uma mensagem se não houver abas pessoais.
        const placeholderText = Array.from(navbarContainer.childNodes).find(node => node.nodeName === 'P') || document.createElement('p');
        placeholderText.style.cssText = "text-align:center;color:#f4f1e8;padding:10px;flex-grow:1;";
        placeholderText.textContent = 'Crie abas pessoais!';
        if (!navbarContainer.contains(placeholderText)) navbarContainer.appendChild(placeholderText);

        notesContainer.innerHTML = '<p class="text-center" style="width:100%;color:#8b4513;margin-top:50px;">Nenhuma aba pessoal. Clique em "Pessoais" no menu para criar uma!</p>';
        currentTab = null;
    }
}

/**
 * @function buildSecondaryNavbar
 * @description Constrói a barra de navegação secundária (para subtemas).
 * @param {string} themeTypeId - O ID do tipo de tema pai cujos subtemas serão listados.
 */
function buildSecondaryNavbar(themeTypeId) {
    const themeTypeConfig = currentUserThemeTypesMap[themeTypeId];
    if (!themeTypeConfig) {
        notesContainer.innerHTML = "<p class='text-center' style='color:red;margin-top:50px;'>Erro: Tipo de tema desconhecido.</p>";
        secondaryNavbarContainer.innerHTML = "";
        return;
    }
    secondaryNavbarContainer.innerHTML = "";
    currentThemeInfo = { id: null, type: themeTypeId, name: null };
    notesContainer.innerHTML = `<p class='text-center' style='width:100%;color:#8b4513;margin-top:50px;'><i class='fas ${themeTypeConfig.iconClass || 'fa-folder'}' style='font-size:3rem;opacity:0.3;margin-bottom:15px;display:block;'></i>Selecione ou adicione um ${escapeHTML(themeTypeConfig.singularName)}.</p>`;
    if (themeNoteCustomizationDiv) themeNoteCustomizationDiv.style.display = 'none';

    // Botão para adicionar/gerenciar subtemas.
    const addBtn = document.createElement("button");
    addBtn.innerHTML = `<i class="fas fa-plus"></i> Novo ${escapeHTML(themeTypeConfig.singularName)}`;
    addBtn.onclick = () => openManageSubthemesModal(themeTypeId);
    addBtn.style.cssText = "background:#228B22;color:white;border:2px solid #8b4513;border-radius:8px;padding:8px 12px;cursor:pointer;margin-right:10px;font-weight:700;font-family:'Courier Prime',monospace;text-transform:uppercase;";
    secondaryNavbarContainer.appendChild(addBtn);

    if (currentUser) {
        // Listener em tempo real para os subtemas.
        db.collection("userThemes")
            .where("uid", "==", currentUser.uid)
            .where("type", "==", themeTypeId)
            .orderBy("order", "asc")
            .onSnapshot(async snapshot => {
                // Lógica de fallback para adicionar 'order' a documentos antigos.
                if (snapshot.empty) {
                    const fallbackSnapshot = await db.collection("userThemes").where("uid", "==", currentUser.uid).where("type", "==", themeTypeId).orderBy("themeName", "asc").get();
                    if (!fallbackSnapshot.empty) {
                        snapshot = fallbackSnapshot;
                        const batch = db.batch();
                        let order = 0;
                        snapshot.docs.forEach(doc => {
                            if (doc.data().order === undefined) {
                                batch.update(db.collection("userThemes").doc(doc.id), { order: order++ });
                            }
                        });
                        await batch.commit();
                        snapshot = await db.collection("userThemes").where("uid", "==", currentUser.uid).where("type", "==", themeTypeId).orderBy("order", "asc").get();
                    }
                }

                secondaryNavbarContainer.querySelectorAll('button.theme-instance-btn').forEach(b => b.remove());
                snapshot.forEach(doc => {
                    const themeInstance = doc.data();
                    const btn = document.createElement("button");
                    btn.id = `themebtn_${doc.id}`;
                    btn.dataset.id = doc.id;
                    btn.className = 'theme-instance-btn';
                    btn.style.cursor = 'grab';
                    const instanceIconHtml = (themeTypeConfig.iconClass && themeTypeConfig.iconClass.trim() !== '') ? `<i class="fas ${themeTypeConfig.iconClass}"></i> ` : '';
                    btn.innerHTML = `<span>${instanceIconHtml}${escapeHTML(themeInstance.themeName)}</span><span class="badge" id="themebadge_${doc.id}" style="display:none;">0</span>`;

                    // Ícone "kebab" (três pontos) para exclusão.
                    const deleteIconSpan = document.createElement("span");
                    deleteIconSpan.innerHTML = '';
                    deleteIconSpan.title = "Excluir Tema e todas as suas Notas";
                    deleteIconSpan.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: space-between; width: 5px; height: 15px; position: absolute; top: 50%; right: 2px; transform: translateY(-50%); opacity: 0; transition: opacity 0.2s ease-in-out; cursor: pointer; padding: 1px 0; box-sizing: border-box;';
                    for (let i = 0; i < 3; i++) {
                        const point = document.createElement('span');
                        point.style.cssText = 'display: block; width: 3px; height: 3px; background-color: rgba(51, 51, 51, 0.5); border-radius: 50%;';
                        if (i < 2) point.style.marginBottom = '1.5px';
                        deleteIconSpan.appendChild(point);
                    }
                    deleteIconSpan.onclick = (e) => {
                        e.stopPropagation(); // Impede que o clique no ícone selecione o tema.
                        deleteThemeAndNotes(doc.id, themeInstance.themeName, themeInstance.type);
                    };

                    btn.style.position = 'relative';
                    btn.appendChild(deleteIconSpan);
                    btn.onmouseover = () => { deleteIconSpan.style.opacity = '1'; };
                    btn.onmouseout = () => { deleteIconSpan.style.opacity = '0'; };
                    btn.onclick = () => selectTheme(doc.id, themeInstance.type, themeInstance.themeName);
                    secondaryNavbarContainer.appendChild(btn);
                });

                if (currentThemeInfo.id) {
                    const activeButton = document.getElementById(`themebtn_${currentThemeInfo.id}`);
                    if (activeButton) activeButton.classList.add('active-tab');
                }

                // Ativa o SortableJS na navbar secundária.
                if (!isMobileView()) {
                    new Sortable(secondaryNavbarContainer, {
                        animation: 150,
                        ghostClass: 'sortable-ghost',
                        dragClass: 'sortable-drag',
                        filter: 'button:not(.theme-instance-btn)', // Impede que o botão "Novo" seja arrastado.
                        preventOnFilter: true,
                        onEnd: async function(evt) {
                            const itemIds = Array.from(secondaryNavbarContainer.querySelectorAll('.theme-instance-btn')).map(item => item.dataset.id);
                            const batch = db.batch();
                            itemIds.forEach((id, index) => {
                                batch.update(db.collection("userThemes").doc(id), { order: index });
                            });
                            try {
                                await batch.commit();
                                console.log("Ordem dos temas atualizada com sucesso.");
                            } catch (error) {
                                console.error("Erro ao salvar a nova ordem dos temas:", error);
                                alert("Ocorreu um erro ao salvar a ordem.");
                            }
                        }
                    });
                }

            }, error => {
                console.error("Erro ao buscar temas:", error);
            });
    }
}


// -----------------------------------------------------------------------------------
// Seção: Lógica de Notas (Post-its)
// -----------------------------------------------------------------------------------

/**
 * @async
 * @function addNote
 * @description Adiciona uma nova nota (post-it) ao Firestore.
 * Determina o contexto (aba pessoal ou tema) e associa a nota a ele.
 * Também verifica o limite de notas para usuários 'free'.
 */
async function addNote() {
    const text = noteTextInput.value.trim();
    if (!text) {
        alert("Escreva algo.");
        noteTextInput.focus();
        return;
    }
    if (!currentUser) {
        alert("Não logado.");
        return;
    }

    // Verifica o status do usuário (free/premium) para aplicar o limite de notas.
    let isPremium = false;
    let permanentBonus = 0;
    let temporaryBonus = 0;
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            isPremium = userData.status === 'premium';
            permanentBonus = userData.bonusNotes || 0;
            if (userData.temporaryBonus && new Date(userData.temporaryBonus.expiresAt.seconds * 1000) > new Date()) {
                temporaryBonus = userData.temporaryBonus.amount || 0;
            }
        }
    } catch (e) {
        console.error("Erro ao verificar status e bônus do usuário:", e);
    }

    if (!isPremium) {
        try {
            const notesSnapshot = await db.collection('postits').where('uid', '==', currentUser.uid).get();
            const totalBonus = permanentBonus + temporaryBonus;
            if (notesSnapshot.size >= (30 + totalBonus)) {
                openPremiumUpgradeModal(); // Abre o modal de upgrade se o limite for atingido.
                return;
            }
        } catch (e) {
            alert("Erro ao verificar o limite de notas.");
            return;
        }
    }

    const dueDate = document.getElementById('noteDueDate').value;
    let noteData = {
        text: text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        uid: currentUser.uid,
        order: Date.now() // Usa timestamp para uma ordem inicial.
    };
    if (dueDate) noteData.dueDate = dueDate;

    const addButton = document.querySelector('#modalOverlay .modal-button-group .add-btn');
    const originalButtonText = addButton.innerHTML;

    // Associa a nota ao contexto correto.
    if (currentThemeInfo && currentThemeInfo.id && currentThemeInfo.type) {
        noteData.themeId = currentThemeInfo.id;
        noteData.themeName = currentThemeInfo.name;
        noteData.noteType = currentThemeInfo.type;
    } else if (currentTab && navbarWrapper.style.display !== 'none') {
        noteData.category = currentTab;
    } else if (currentThemeInfo && currentThemeInfo.type && !currentThemeInfo.id) {
        // Impede a criação de nota se um tipo de tema foi selecionado, mas não um subtema.
        const themeConfig = currentUserThemeTypesMap[currentThemeInfo.type];
        const singularName = themeConfig ? themeConfig.singularName.toLowerCase() : 'item';
        alert(`Por favor, selecione um ${singularName} específico antes de adicionar uma nota.`);
        return;
    } else {
        alert("Contexto de categoria ou tema inválido.");
        return;
    }

    // Feedback visual durante o salvamento.
    addButton.innerHTML = '<div class="loading"></div> Salvando...';
    addButton.disabled = true;
    closeModal();

    db.collection("postits").add(noteData)
        .then(() => updateMemoryUsageDisplay())
        .catch(e => {
            console.error("Erro ao adicionar nota:", e);
            alert("Ocorreu um erro ao salvar sua nota.");
        })
        .finally(() => {
            addButton.innerHTML = originalButtonText;
            addButton.disabled = false;
        });
}

/**
 * @function deleteNote
 * @description Abre um modal de confirmação para deletar uma nota.
 * @param {string} noteId - O ID do documento da nota a ser excluída.
 */
function deleteNote(noteId) {
    openConfirmationModal("Excluir Nota", "Tem certeza?", () => {
        db.collection("postits").doc(noteId).delete()
            .then(() => updateMemoryUsageDisplay())
            .catch(e => { console.error("Erro ao deletar:", e); });
    });
}

/**
 * @function loadNotes
 * @description Carrega e renderiza as notas do contexto atual (aba ou tema).
 * Usa `onSnapshot` para ouvir atualizações em tempo real.
 */
function loadNotes() {
    if (!currentUser || (!currentTab && !(currentThemeInfo && currentThemeInfo.id))) {
        notesContainer.innerHTML = `<p class='text-center' style='width:100%;color:#8b4513;margin-top:50px;'><i class='fas fa-info-circle' style='font-size:2rem;margin-bottom:10px;display:block;'></i> ${!currentUser ? 'Login.' : 'Selecione uma aba ou tema.'}</p>`;
        let existingSummaryBtn = document.getElementById('summaryBtn');
        if (existingSummaryBtn) existingSummaryBtn.remove();
        return;
    }
    notesContainer.innerHTML = "<p class='text-center' style='width:100%;color:#8b4513;margin-top:50px;'><i class='fas fa-spinner fa-spin'></i> Carregando...</p>";

    // Constrói a query do Firestore baseada no contexto.
    let query = db.collection("postits").where("uid", "==", currentUser.uid).orderBy("order", "asc");
    let isPersonalContext = false;

    if (navbarWrapper.style.display !== 'none' && currentTab) {
        query = query.where("category", "==", currentTab);
        isPersonalContext = true;
    } else if (secondaryNavbarWrapper.style.display !== 'none' && currentThemeInfo && currentThemeInfo.id) {
        query = query.where("themeId", "==", currentThemeInfo.id);
        isPersonalContext = false;
    } else {
        notesContainer.innerHTML = "<p class='text-center' style='width:100%;color:#8b4513;margin-top:50px;'>Selecione uma categoria ou tema.</p>";
        let existingSummaryBtn = document.getElementById('summaryBtn');
        if (existingSummaryBtn) existingSummaryBtn.remove();
        return;
    }

    query.onSnapshot(snapshot => {
        notesContainer.innerHTML = "";
        const summaryBtn = document.getElementById('summaryBtn');

        if (snapshot.empty) {
            if (summaryBtn) summaryBtn.style.display = 'none';
            let contextName = "esta visualização";
            if (isPersonalContext && currentTab) {
                const tabObject = currentUserPersonalTabs.find(t => t.id === currentTab);
                if (tabObject) contextName = `a aba "${escapeHTML(tabObject.name)}"`;
            } else if (!isPersonalContext && currentThemeInfo && currentThemeInfo.name) {
                contextName = `o tema "${escapeHTML(currentThemeInfo.name)}"`;
            }
            notesContainer.innerHTML = `<p class='text-center' style='width:100%;color:#8b4513;margin-top:50px;'><i class='fas fa-sticky-note' style='font-size:3rem;opacity:0.3;margin-bottom:15px;display:block;'></i>Nenhuma nota em ${contextName}.</p>`;
            return;
        }

        if (summaryBtn) summaryBtn.style.display = 'flex';

        snapshot.forEach(doc => {
            const note = doc.data();
            const noteDiv = document.createElement("div");
            noteDiv.id = doc.id;

            // Define a cor do post-it com base no contexto.
            let postitColorClass = 'postit-color-default-yellow';
            if (isPersonalContext && note.category) {
                const tabInfo = currentUserPersonalTabs.find(t => t.id === note.category);
                if (tabInfo && tabInfo.postitColor) {
                    postitColorClass = `postit-color-${tabInfo.postitColor}`;
                }
                noteDiv.className = `postit postit-personal-custom ${postitColorClass}`;
            } else if (!isPersonalContext && note.noteType) {
                const themeTypeConfig = currentUserThemeTypesMap[note.noteType];
                if (themeTypeConfig && themeTypeConfig.postitColor) {
                    postitColorClass = `postit-color-${themeTypeConfig.postitColor}`;
                }
                noteDiv.className = `postit themenote ${note.noteType} ${postitColorClass}`;
            } else {
                noteDiv.className = `postit ${postitColorClass}`;
            }

            // Calcula e formata a data de criação.
            const creationDate = note.createdAt?.toDate();
            let daysAgoText = "Recente";
            if (creationDate) {
                const diffDays = Math.floor((Date.now() - creationDate.getTime()) / (1000 * 3600 * 24));
                daysAgoText = diffDays === 0 ? "Hoje" : (diffDays === 1 ? "Ontem" : `${diffDays}d atrás`);
            }

            // Lógica para exibir a data de vencimento e aplicar estilos.
            let dueDateDisplay = "";
            if (note.dueDate) {
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const dueDateParts = note.dueDate.split('-');
                const dueDateObj = new Date(parseInt(dueDateParts[0]), parseInt(dueDateParts[1]) - 1, parseInt(dueDateParts[2]));
                dueDateObj.setHours(0, 0, 0, 0);
                dueDateDisplay = `<span class="postit-due-date"><i class="fas fa-calendar"></i> ${String(dueDateObj.getDate()).padStart(2, '0')}/${String(dueDateObj.getMonth() + 1).padStart(2, '0')}/${String(dueDateObj.getFullYear()).slice(-2)}</span>`;
                noteDiv.classList.remove('postit-overdue', 'postit-future-due');
                noteDiv.title = '';
                if (dueDateObj <= today) {
                    noteDiv.classList.add('postit-overdue');
                    noteDiv.title = dueDateObj.getTime() === today.getTime() ? "Vence hoje" : "Vencido";
                } else {
                    noteDiv.classList.add('postit-future-due');
                    noteDiv.title = "Pendente";
                }
            }
            noteDiv.innerHTML = `
                <div class="postit-header">
                    <span class="days">${daysAgoText}</span>
                    <div style="display:flex;align-items:center;gap:8px;">
                        ${dueDateDisplay}
                        <button class="delete-btn" onclick="deleteNote('${doc.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="postit-content">${escapeHTML(note.text)}</div>`;
            noteDiv.addEventListener('dblclick', handleDoubleClickEditing);
            notesContainer.appendChild(noteDiv);
        });

        // Ativa o SortableJS para reordenar as notas.
        new Sortable(notesContainer, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            delay: 100,
            delayOnTouchOnly: true,
            touchStartThreshold: 10,
            onEnd: function(evt) {
                const updates = Array.from(notesContainer.querySelectorAll('.postit')).map((el, index) => ({ docId: el.id, newOrder: index }));
                const batch = db.batch();
                updates.forEach(update => batch.update(db.collection("postits").doc(update.docId), { order: update.newOrder }));
                batch.commit().catch(error => console.error("Erro ao reordenar notas:", error));
            }
        });
    }, error => {
        console.error("Erro ao carregar notas:", error);
        notesContainer.innerHTML = `<p class='text-center' style='width:100%;color:red;margin-top:50px;'>Erro ao carregar notas.</p>`;
    });
}

/**
 * @function handleDoubleClickEditing
 * @description Permite a edição in-loco do texto de uma nota com um duplo clique.
 * Substitui o div do conteúdo por uma textarea.
 * SUGESTÃO: Esta função é muito longa e contém outras funções aninhadas.
 * Para melhor legibilidade, as funções `autoR`, `saveLoc`, e `revDivLoc` poderiam
 * ser extraídas (se possível, dependendo do escopo) ou pelo menos mais bem comentadas.
 * @param {Event} event - O evento de duplo clique.
 */
function handleDoubleClickEditing(event) {
    const pDiv = event.currentTarget;
    const cDiv = pDiv.querySelector('.postit-content');
    if (!cDiv || (event.target.classList.contains('delete-btn') || event.target.closest('.delete-btn'))) return;
    pDiv.classList.add('postit-editing');
    const nId = pDiv.id;
    const origTxt = cDiv.textContent;
    const txtArea = document.createElement('textarea');
    txtArea.value = origTxt;
    txtArea.className = 'postit-content-editing';

    function autoR() { txtArea.style.height = 'auto'; txtArea.style.height = txtArea.scrollHeight + 'px'; }
    txtArea.addEventListener('input', autoR);
    cDiv.parentNode.replaceChild(txtArea, cDiv);
    txtArea.focus();
    txtArea.select();
    autoR();

    function saveLoc() {
        const newTxt = txtArea.value.trim();
        let txtShow = origTxt;
        if (newTxt !== origTxt.trim()) {
            if (newTxt) {
                db.collection("postits").doc(nId).update({ text: newTxt }).catch(e => console.error("Erro ao atualizar nota:", e));
                txtShow = newTxt;
            } else {
                db.collection("postits").doc(nId).update({ text: "" }).catch(e => console.error("Erro ao limpar nota:", e));
                txtShow = "";
            }
        }
        revDivLoc(txtShow);
    }

    function revDivLoc(txt) {
        pDiv.classList.remove('postit-editing');
        const newD = document.createElement('div');
        newD.className = 'postit-content';
        newD.textContent = txt;
        newD.addEventListener('dblclick', handleDoubleClickEditing);
        if (txtArea.parentNode) txtArea.parentNode.replaceChild(newD, txtArea);
        else if (pDiv.classList.contains('postit-editing')) pDiv.classList.remove('postit-editing');
    }
    txtArea.addEventListener('blur', saveLoc);
    txtArea.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveLoc(); }
        else if (e.key === 'Escape') { e.preventDefault(); revDivLoc(origTxt); }
    });
}


// -----------------------------------------------------------------------------------
// Seção: Lógica de Navegação e Seleção de Contexto
// -----------------------------------------------------------------------------------

/**
 * @function changeTab
 * @description Muda para uma aba pessoal específica.
 * @param {string} tabId - O ID da aba para a qual mudar.
 */
function changeTab(tabId) {
    console.log("Mudar para aba pessoal ID:", tabId);
    currentTab = tabId;
    if (secondaryNavbarWrapper) secondaryNavbarWrapper.style.display = 'none';
    if (navbarWrapper) navbarWrapper.style.display = '';
    buildNavbar(); // Reconstrói para destacar a aba ativa.
    currentThemeInfo = { id: null, type: null, name: null }; // Limpa o contexto de tema.
    if (themeNoteCustomizationDiv) themeNoteCustomizationDiv.style.display = 'none';
    loadNotes();
}

/**
 * @function selectTheme
 * @description Seleciona um subtema específico para visualização.
 * @param {string} instId - O ID da instância do tema (subtema).
 * @param {string} typeId - O ID do tipo de tema pai.
 * @param {string} instName - O nome do subtema.
 */
function selectTheme(instId, typeId, instName) {
    console.log(`Tema selecionado: ${instName} (ID:${instId}, TipoID:${typeId})`);
    currentThemeInfo = { id: instId, type: typeId, name: instName };
    document.querySelectorAll('#secondaryNavbar button').forEach(b => b.classList.remove('active-tab'));
    const actBtn = document.getElementById(`themebtn_${instId}`);
    if (actBtn) actBtn.classList.add('active-tab');
    loadNotes();
    const ddTxt = document.querySelector('.top-bar .category-dropdown .dropdown-btn .btn-text');
    if (ddTxt && !isMobileView()) {
        const conf = currentUserThemeTypesMap[typeId];
        ddTxt.innerHTML = conf ? `${escapeHTML(instName)} <small style="font-size:0.8em;opacity:0.7;">(${escapeHTML(conf.name)})</small>` : escapeHTML(instName);
    }
    if (navbarWrapper) navbarWrapper.style.display = "none";
    if (secondaryNavbarWrapper) secondaryNavbarWrapper.style.display = "";
}

/**
 * @function handleNewCategorySelection
 * @description Função central que gerencia a troca entre a visualização de "Abas Pessoais"
 * e a visualização de "Tipos de Tema".
 * @param {string} type - O ID do tipo de tema ou a string 'pessoais'.
 */
function handleNewCategorySelection(type) {
    const ddTxt = document.querySelector('.category-dropdown .dropdown-btn .btn-text');
    const isP = type === 'pessoais';
    const summaryBtn = document.getElementById('summaryBtn');

    // Alterna a visibilidade das navbars.
    if (navbarWrapper) navbarWrapper.style.display = isP ? "" : "none";
    if (secondaryNavbarWrapper) secondaryNavbarWrapper.style.display = isP ? "none" : "";

    if (summaryBtn) summaryBtn.style.display = 'flex';

    if (isP) {
        // Lógica para quando "Pessoais" é selecionado.
        currentThemeInfo = { id: null, type: null, name: null };
        if (themeNoteCustomizationDiv) themeNoteCustomizationDiv.style.display = 'none';
        if (ddTxt && !isMobileView()) ddTxt.textContent = "Categorias";
        if (currentUserPersonalTabs && currentUserPersonalTabs.length > 0) {
            const targetT = (!currentTab || !currentUserPersonalTabs.some(t => t.id === currentTab)) ? currentUserPersonalTabs.sort((a, b) => a.order - b.order)[0].id : currentTab;
            changeTab(targetT);
        } else {
            currentTab = null;
            if (navbarContainer) navbarContainer.innerHTML = '<p style="text-align:center;color:#f4f1e8;padding:10px;width:100%;">Crie abas!</p>';
            if (notesContainer) notesContainer.innerHTML = '<p style="text-align:center;color:#8b4513;margin-top:50px;">Nenhuma aba pessoal.</p>';
        }
    } else {
        // Lógica para quando um tipo de tema é selecionado.
        const conf = currentUserThemeTypesMap[type];
        if (!conf) { console.error("Configuração do tipo de tema não encontrada:", type); handleNewCategorySelection('pessoais'); return; }
        currentThemeInfo = { id: null, type: type, name: conf.name };
        buildSecondaryNavbar(type);
        if (ddTxt && !isMobileView()) ddTxt.textContent = conf.name;
        if (notesContainer) notesContainer.innerHTML = `<p class='text-center' style='width:100%;color:#8b4513;margin-top:50px;'><i class='fas ${conf.iconClass||'fa-folder'}' style='font-size:3rem;opacity:0.3;margin-bottom:15px;display:block;'></i>Selecione ou crie um ${escapeHTML(conf.singularName)}.</p>`;
    }
}

/**
 * @function addNewTheme
 * @description Adiciona uma nova instância de tema (subtema) ao Firestore.
 * @param {string} themeTypeId - O ID do tipo de tema pai.
 * @param {string} instanceName - O nome para o novo subtema.
 * @deprecated Esta função é muito similar a `handleAddNewSubtheme` em `theme-manager.js`.
 * Deveriam ser unificadas para evitar duplicação de código.
 */
function addNewTheme(themeTypeId, instanceName) {
    if (!currentUser) { alert("Não logado."); return; }
    const conf = currentUserThemeTypesMap[themeTypeId];
    if (!conf) { alert("Erro: Tipo de tema base desconhecido."); return; }
    db.collection("userThemes").where("uid", "==", currentUser.uid).where("type", "==", themeTypeId).orderBy("order", "desc").limit(1).get().then(snapshot => {
        let newOrder = 0;
        if (!snapshot.empty) {
            const lastTheme = snapshot.docs[0].data();
            newOrder = (lastTheme.order || 0) + 1;
        }
        db.collection("userThemes").add({
            uid: currentUser.uid,
            type: themeTypeId,
            themeName: instanceName,
            order: newOrder,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(dRef => selectTheme(dRef.id, themeTypeId, instanceName)).catch(e => {
            console.error("Erro ao adicionar tema:", e);
            alert("Erro ao criar tema.");
        });
    });
}

/**
 * @function updateThemeBadge
 * @description Atualiza o badge de contagem de notas para um subtema específico.
 * Similar a `updateBadgeCount`, mas para a navbar secundária.
 * @param {string} themeId - O ID do subtema.
 */
function updateThemeBadge(themeId) {
    if (!currentUser) return;
    const badge = document.getElementById("themebadge_" + themeId);
    if (!badge) return;
    db.collection("postits").where("uid", "==", currentUser.uid).where("themeId", "==", themeId).onSnapshot(snap => {
        const count = snap.size;
        badge.style.display = count > 0 ? "inline-block" : "none";
        if (count > 0) badge.textContent = count;
        let overdue = false,
            pending = false;
        snap.docs.forEach(d => {
            const n = d.data();
            if (n.dueDate) {
                const t = new Date();
                t.setHours(0, 0, 0, 0);
                const due = new Date(n.dueDate.split('-')[0], n.dueDate.split('-')[1] - 1, n.dueDate.split('-')[2]);
                due.setHours(0, 0, 0, 0);
                if (due <= t) overdue = true;
                else pending = true;
            }
            if (overdue) return;
        });
        badge.style.backgroundColor = overdue ? '#dc143c' : (pending ? '#1d7e14' : '#6e3c0e');
        badge.title = overdue ? 'Vencidos/Hoje' : (pending ? 'Pendentes' : (count > 0 ? `${count} nota(s)` : ''));
    }, e => console.error("Erro no badge do tema:", e));
}


/**
 * @async
 * @function deleteThemeAndNotes
 * @description Exclui um subtema E TODAS as notas associadas a ele.
 * Esta é uma ação destrutiva e em cascata.
 * @param {string} themeId - O ID do subtema a ser excluído.
 * @param {string} themeName - O nome para as mensagens de confirmação.
 * @param {string} type - O ID do tipo de tema pai, para reconstruir a UI.
 */
async function deleteThemeAndNotes(themeId, themeName, type) {
    openConfirmationModal(`Excluir: ${themeName}`, `Excluir "${themeName}" e todas as suas notas? Esta ação não pode ser desfeita.`, async () => {
        if (!currentUser) { alert("Não logado."); return; }
        try {
            const pQuery = db.collection("postits").where("themeId", "==", themeId).where("uid", "==", currentUser.uid);
            const pSnap = await pQuery.get();
            const batch = db.batch();
            pSnap.forEach(doc => batch.delete(doc.ref)); // Deleta todas as notas.
            batch.delete(db.collection("userThemes").doc(themeId)); // Deleta o subtema.
            await batch.commit();

            updateMemoryUsageDisplay();
            if (currentThemeInfo && currentThemeInfo.id === themeId) {
                currentThemeInfo = { id: null, type: type, name: null };
            }
            buildSecondaryNavbar(type); // Reconstrói a navbar.
            if (manageSubthemesModalOverlay.classList.contains('active')) {
                populateSubthemesList(); // Atualiza a lista no modal se estiver aberto.
            }
        } catch (e) {
            console.error("Erro ao excluir tema e notas:", e);
            alert("Erro ao excluir.");
        }
    });
}


console.log("Aplicação inicializada com sucesso!");
