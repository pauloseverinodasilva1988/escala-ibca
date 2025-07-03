// js/escala.js

// Variáveis globais para o calendário
let currentCalendarDate = new Date(); // Data atualmente exibida no calendário (Dashboard e Gerenciar Eventos)
let selectedCalendarDate = null; // Data selecionada no calendário

// Variáveis para o modal de troca de membro
let currentSwapDetails = {
    scaleId: null,      // ID da escala no histórico
    ministryId: null,   // ID do ministério na escala
    dateString: null,   // Data do evento (YYYY-MM-DD)
    memberIndex: null,  // Índice do membro na lista de membros atribuídos para aquele slot
    originalMemberName: null // Nome do membro que está sendo substituído
};

document.addEventListener('DOMContentLoaded', () => {
    // --- Configuração Inicial da Interface (ao carregar a página) ---
    setupInitialView();

    // --- Navegação Principal (Dashboard, Escalas, Histórico, Configurações) ---
    document.querySelectorAll('.main-nav .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSectionId = e.target.dataset.section;
            switchMainSection(targetSectionId);
        });
    });

    // --- Sub-navegação da seção "Configurações" ---
    document.querySelectorAll('.sub-nav .sub-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSubSectionId = e.target.dataset.subSection;
            switchSubSection(targetSubSectionId);
        });
    });

    // --- Event Listeners para Formulários e Botões (dentro de cada seção) ---

    // Gerenciar Ministérios
    const ministryForm = document.getElementById('ministry-form');
    if (ministryForm) {
        ministryForm.addEventListener('submit', addOrUpdateMinistry);
        document.getElementById('cancel-ministry-edit').addEventListener('click', () => {
            ministryForm.reset();
            document.getElementById('ministry-id').value = ''; // Limpa ID oculto
            document.getElementById('cancel-ministry-edit').style.display = 'none';
            document.querySelector('#ministry-form button[type="submit"]').textContent = 'Salvar Ministério';
        });
    }

    // Gerenciar Membros
    const memberForm = document.getElementById('member-form');
    if (memberForm) {
        memberForm.addEventListener('submit', addOrUpdateMember);
        document.getElementById('cancel-member-edit').addEventListener('click', () => {
            memberForm.reset();
            document.getElementById('member-id').value = ''; // Limpa ID oculto
            document.getElementById('member-available-for-scale').checked = true; // Reseta para true
            populateMemberMinistryCheckboxes(); // Repopula para limpar estados de checked/roles
            document.getElementById('cancel-member-edit').style.display = 'none';
            document.querySelector('#member-form button[type="submit"]').textContent = 'Salvar Membro';
        });
    }

    // Gerenciar Eventos
    const eventForm = document.getElementById('event-form');
    if (eventForm) {
        eventForm.addEventListener('submit', addOrUpdateEvent);
        document.getElementById('cancel-event-edit').addEventListener('click', () => {
            eventForm.reset();
            document.getElementById('event-edit-id').value = ''; // Limpa ID oculto
            populateEventMinistriesCheckboxes(); // Repopula para limpar estados de checked
            document.getElementById('save-event-btn').textContent = 'Salvar Evento';
            document.getElementById('cancel-event-edit').style.display = 'none';
        });
    }

    // Listener para o botão de Importar Calendário (JSON/CSV/XLSX)
    const importCalendarBtn = document.getElementById('import-calendar-btn');
    if (importCalendarBtn) {
        importCalendarBtn.addEventListener('click', importCalendarFromFile);
    }

    // Listener para o botão de Processar Texto Colado
    const pasteCalendarBtn = document.getElementById('paste-calendar-btn');
    if (pasteCalendarBtn) {
        pasteCalendarBtn.addEventListener('click', processPastedCalendarText);
    }

    // Gerar Escalas
    const generateScaleForm = document.getElementById('generate-scale-form');
    if (generateScaleForm) {
        generateScaleForm.addEventListener('submit', (e) => {
            e.preventDefault();
            generateScale();
        });
    }

    // --- Modal de Troca de Membro (Event Listeners) ---
    const swapModal = document.getElementById('member-swap-modal');
    const closeButton = swapModal.querySelector('.close-button');
    const cancelSwapBtn = document.getElementById('cancel-swap-btn');
    const confirmSwapBtn = document.getElementById('confirm-swap-btn');

    if (swapModal) {
        closeButton.addEventListener('click', closeSwapModal);
        cancelSwapBtn.addEventListener('click', closeSwapModal);
        confirmSwapBtn.addEventListener('click', confirmMemberSwap);
        // Fechar modal ao clicar fora dele
        window.addEventListener('click', (event) => {
            if (event.target === swapModal) {
                closeSwapModal();
            }
        });
    }
});

// ================================================================
// --- FUNÇÕES DE CONTROLE DE UI/NAVEGAÇÃO ---
// ================================================================

/**
 * Configura a view inicial da aplicação, exibindo o dashboard e carregando dados.
 */
function setupInitialView() {
    // Esconde todas as seções principais
    document.querySelectorAll('.app-section').forEach(section => {
        section.style.display = 'none';
    });
    // Mostra a seção do dashboard por padrão
    const dashboardSection = document.getElementById('dashboard');
    if (dashboardSection) {
        dashboardSection.style.display = 'block';
        dashboardSection.classList.add('active-section');
    }
    // Ativa o link de navegação do dashboard
    const dashboardNavLink = document.querySelector('.main-nav .nav-link[data-section="dashboard"]');
    if (dashboardNavLink) {
        dashboardNavLink.classList.add('active');
    }
    // Renderiza o calendário do dashboard e exibe os eventos para a data atual
    renderCalendar('dashboard-calendar-grid', currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 'dashboard');
    displayUpcomingEvents(currentCalendarDate.toISOString().split('T')[0]); // Exibe eventos para o mês atual inicialmente
}

/**
 * Alterna a seção principal visível na aplicação.
 * Atualiza os links de navegação principais.
 * @param {string} targetSectionId - O ID da seção a ser exibida (e.g., 'dashboard', 'gerar-escalas').
 */
function switchMainSection(targetSectionId) {
    // Esconde todas as seções principais e remove a classe 'active-section'
    document.querySelectorAll('.app-section').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active-section');
    });
    // Remove a classe 'active' de todos os links de navegação principais
    document.querySelectorAll('.main-nav .nav-link').forEach(nav => {
        nav.classList.remove('active');
    });

    // Mostra a seção alvo e adiciona a classe 'active-section'
    const targetSection = document.getElementById(targetSectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active-section');
    }
    // Ativa o link de navegação principal clicado
    document.querySelector(`.main-nav .nav-link[data-section="${targetSectionId}"]`).classList.add('active');

    // Recarrega o conteúdo dinâmico da seção se necessário
    if (targetSectionId === 'dashboard') {
        renderCalendar('dashboard-calendar-grid', currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 'dashboard');
        displayUpcomingEvents(selectedCalendarDate ? selectedCalendarDate.toISOString().split('T')[0] : currentCalendarDate.toISOString().split('T')[0]);
    } else if (targetSectionId === 'historico') {
        displayHistoryScales();
    } else if (targetSectionId === 'configuracao') {
        // Ao entrar em configurações, por padrão, mostra a primeira sub-seção
        switchSubSection('config-ministries');
    } else if (targetSectionId === 'gerar-escalas') {
        populateMonthYearSelectors();
        // Limpa a área de saída da escala e esconde opções de compartilhamento
        document.getElementById('generated-scale-output').innerHTML = '';
        document.getElementById('share-options').style.display = 'none';
    }
}

/**
 * Alterna a sub-seção visível dentro da seção "Configurações".
 * Atualiza os links de sub-navegação.
 * @param {string} targetSubSectionId - O ID da sub-seção a ser exibida (e.g., 'config-ministries').
 */
function switchSubSection(targetSubSectionId) {
    // Esconde todas as sub-seções e remove a classe 'active-sub-section'
    document.querySelectorAll('.sub-section').forEach(subSection => {
        subSection.style.display = 'none';
        subSection.classList.remove('active-sub-section');
    });
    // Remove a classe 'active' de todos os links de sub-navegação
    document.querySelectorAll('.sub-nav .sub-nav-link').forEach(subNavLink => {
        subNavLink.classList.remove('active');
    });

    // Mostra a sub-seção alvo e adiciona a classe 'active-sub-section'
    const targetSubSection = document.getElementById(targetSubSectionId);
    if (targetSubSection) {
        targetSubSection.style.display = 'block';
        targetSubSection.classList.add('active-sub-section');
    }
    // Ativa o link de sub-navegação clicado
    document.querySelector(`.sub-nav .sub-nav-link[data-sub-section="${targetSubSectionId}"]`).classList.add('active');

    // Recarrega o conteúdo dinâmico da sub-seção
    if (targetSubSectionId === 'config-ministries') {
        displayMinistries();
    } else if (targetSubSectionId === 'config-members') {
        populateMemberMinistryCheckboxes(); // Garante que os checkboxes de ministérios estejam atualizados para o cadastro de membros
        displayMembers();
    } else if (targetSubSectionId === 'config-events') {
        // Renderiza o calendário para a seção de eventos
        renderCalendar('config-events-calendar-grid', currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 'config-events');
        populateEventMinistriesCheckboxes(); // Garante que os checkboxes de ministérios estejam atualizados para o cadastro de eventos
        displayRegisteredEvents();
        // Limpa as mensagens de status de importação/colagem e o input de arquivo/textarea
        document.getElementById('import-status-message').style.display = 'none';
        document.getElementById('import-calendar-file').value = '';
        document.getElementById('paste-status-message').style.display = 'none';
        document.getElementById('paste-calendar-text').value = '';
    }
}

// ================================================================
// --- FUNÇÕES DO CALENDÁRIO VISUAL ---
// ================================================================

/**
 * Renderiza o calendário em um grid HTML.
 * @param {string} gridId - O ID do container onde o calendário será renderizado.
 * @param {number} year - O ano a ser exibido.
 * @param {number} month - O mês a ser exibido (0-11).
 * @param {string} context - O contexto do calendário ('dashboard' ou 'config-events').
 */
function renderCalendar(gridId, year, month, context) {
    const calendarGrid = document.getElementById(gridId);
    if (!calendarGrid) return;

    const currentMonthYearHeader = calendarGrid.previousElementSibling.querySelector('#currentMonthYear');
    if (currentMonthYearHeader) {
        currentMonthYearHeader.textContent = new Date(year, month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    }

    // Adiciona event listeners para os botões de navegação do mês
    const prevMonthBtn = calendarGrid.previousElementSibling.querySelector('#prevMonth');
    const nextMonthBtn = calendarGrid.previousElementSibling.querySelector('#nextMonth');

    if (prevMonthBtn && nextMonthBtn) {
        // Remove listeners antigos para evitar duplicação
        prevMonthBtn.onclick = null;
        nextMonthBtn.onclick = null;

        prevMonthBtn.onclick = () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            renderCalendar(gridId, currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), context);
        };
        nextMonthBtn.onclick = () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            renderCalendar(gridId, currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), context);
        };
    }

    calendarGrid.innerHTML = ''; // Limpa o grid do calendário

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = Domingo, 1 = Segunda...

    // Preenche os dias do mês anterior para o início do grid
    for (let i = 0; i < firstDayOfWeek; i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day', 'inactive');
        calendarGrid.appendChild(dayElement);
    }

    // Preenche os dias do mês atual
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day');
        dayElement.textContent = day;

        const fullDate = new Date(year, month, day);
        const dateString = fullDate.toISOString().split('T')[0]; // YYYY-MM-DD

        dayElement.dataset.date = dateString; // Armazena a data completa no dataset

        // Marcar dias com eventos
        const eventsOnThisDay = loadData('churchEvents').filter(event => event.date === dateString);
        if (eventsOnThisDay.length > 0) {
            dayElement.classList.add('has-event');
            const eventDot = document.createElement('div');
            eventDot.classList.add('event-dot');
            dayElement.appendChild(eventDot);
        }

        // Marcar o dia selecionado (se houver)
        if (selectedCalendarDate && selectedCalendarDate.toISOString().split('T')[0] === dateString) {
            dayElement.classList.add('selected');
        }

        // Adiciona listener de clique
        dayElement.addEventListener('click', () => {
            // Remove seleção anterior
            const previouslySelected = calendarGrid.querySelector('.calendar-day.selected');
            if (previouslySelected) {
                previouslySelected.classList.remove('selected');
            }
            dayElement.classList.add('selected'); // Adiciona nova seleção
            selectedCalendarDate = fullDate; // Atualiza a data selecionada globalmente

            if (context === 'dashboard') {
                displayUpcomingEvents(dateString); // No dashboard, mostra eventos do dia clicado
            } else if (context === 'config-events') {
                // Na configuração de eventos, preenche o formulário com a data
                document.getElementById('event-date').value = dateString;
                // E também exibe os eventos já cadastrados para aquele dia
                displayRegisteredEvents(dateString);
            }
        });
        calendarGrid.appendChild(dayElement);
    }

    // Preenche os dias do próximo mês para o final do grid
    const totalDays = firstDayOfWeek + lastDayOfMonth.getDate();
    const remainingDays = 42 - totalDays; // Garante 6 semanas completas no calendário
    for (let i = 0; i < remainingDays; i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day', 'inactive');
        calendarGrid.appendChild(dayElement);
    }
}


// ================================================================
// --- FUNÇÕES DA SEÇÃO DASHBOARD (Exibição de Próximos Eventos) ---
// ================================================================

/**
 * Exibe os eventos no Dashboard.
 * Se uma data específica for fornecida, mostra eventos desse dia.
 * Caso contrário, mostra eventos futuros a partir da data atual do calendário.
 * @param {string} [filterDateString] - Data específica (YYYY-MM-DD) para filtrar eventos.
 */
function displayUpcomingEvents(filterDateString) {
    const eventosContainer = document.getElementById('eventos-container');
    const noEventsMessage = document.getElementById('no-events-message');

    const currentEvents = loadData('churchEvents');

    let filteredEvents = [];
    if (filterDateString) {
        // Se uma data específica foi clicada no calendário, mostra apenas eventos desse dia
        filteredEvents = currentEvents.filter(event => event.date === filterDateString);
    } else {
        // Se nenhuma data foi clicada (primeiro carregamento), mostra eventos futuros
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filteredEvents = currentEvents
            .filter(event => new Date(event.date + 'T00:00:00') >= today)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    if (!eventosContainer) return;

    eventosContainer.innerHTML = '';
    if (noEventsMessage) noEventsMessage.style.display = 'none'; // Esconde a mensagem padrão

    if (filteredEvents.length > 0) {
        filteredEvents.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.classList.add('event-card');
            eventCard.innerHTML = `
                <h3>${event.name}</h3>
                <p><strong>Data:</strong> ${formatDate(event.date)}</p>
                <p><strong>Ministérios:</strong> ${event.ministries.join(', ')}</p>
                ${event.notes ? `<p><strong>Observações:</strong> ${event.notes}</p>` : ''}
            `;
            eventosContainer.appendChild(eventCard);
        });
    } else {
        // Mensagem mais específica se não houver eventos para a data selecionada
        if (noEventsMessage) {
            noEventsMessage.textContent = filterDateString 
                ? `Nenhum evento cadastrado para ${formatDate(filterDateString).split(',')[0]}.`
                : `Nenhum evento futuro cadastrado.`;
            eventosContainer.appendChild(noEventsMessage);
            noEventsMessage.style.display = 'block';
        }
    }
}

// ================================================================
// --- FUNÇÕES DA SEÇÃO CONFIGURAÇÕES: GERENCIAR MINISTÉRIOS ---
// ================================================================

/**
 * Adiciona um novo ministério ou atualiza um existente no `allMinistries`.
 */
function addOrUpdateMinistry(e) {
    e.preventDefault(); // Impede o comportamento padrão de submit do formulário
    const ministryId = document.getElementById('ministry-id').value; // ID oculto para edição
    const ministryNameInput = document.getElementById('ministry-name');
    const ministryName = ministryNameInput.value.trim();

    if (!ministryName) {
        alert('Por favor, insira o nome do ministério.');
        return;
    }

    let currentMinistries = loadData('allMinistries'); // Carrega a lista atual de ministérios
    
    // Verifica por nomes duplicados (case-insensitive), excluindo o próprio ministério se estiver editando
    const isDuplicate = currentMinistries.some(m => 
        m.name.toLowerCase() === ministryName.toLowerCase() && m.id !== ministryId
    );

    if (isDuplicate) {
        alert('Um ministério com este nome já existe.');
        return;
    }

    if (ministryId) {
        // Lógica para ATUALIZAR um ministério existente
        const ministryIndex = currentMinistries.findIndex(m => m.id === ministryId);
        if (ministryIndex !== -1) {
            const oldName = currentMinistries[ministryIndex].name;
            currentMinistries[ministryIndex].name = ministryName; // Atualiza o nome
            // É crucial atualizar o nome do ministério em todos os dados dependentes (membros, eventos)
            updateMinistryNameInDependentData(ministryId, oldName, ministryName);
            alert('Ministério atualizado com sucesso!');
        }
    } else {
        // Lógica para ADICIONAR um novo ministério
        const newMinistry = { id: generateUniqueId(), name: ministryName };
        currentMinistries.push(newMinistry);
        alert('Ministério adicionado com sucesso!');
    }

    saveData('allMinistries', currentMinistries); // Salva a lista de ministérios atualizada
    
    // Limpa o formulário e reseta o estado de edição
    ministryNameInput.value = '';
    document.getElementById('ministry-id').value = '';
    document.getElementById('cancel-ministry-edit').style.display = 'none';
    document.querySelector('#ministry-form button[type="submit"]').textContent = 'Salvar Ministério';

    // Atualiza as listas de exibição e os checkboxes de outras seções
    displayMinistries();
    populateMemberMinistryCheckboxes(); // Para garantir que o formulário de membro esteja atualizado
    populateEventMinistriesCheckboxes(); // Para garantir que o formulário de evento esteja atualizado
}

/**
 * Exibe a lista de ministérios cadastrados na sub-seção "Gerenciar Ministérios".
 */
function displayMinistries() {
    const ministriesListContainer = document.getElementById('ministries-list');
    const noMinistriesMessage = document.getElementById('no-ministries-message');

    // Carrega e ordena os ministérios por nome
    let currentMinistries = loadData('allMinistries').sort((a, b) => a.name.localeCompare(b.name));

    if (!ministriesListContainer) return;

    ministriesListContainer.innerHTML = ''; // Limpa a lista existente
    if (noMinistriesMessage) noMinistriesMessage.style.display = 'none';

    if (currentMinistries.length > 0) {
        currentMinistries.forEach(ministry => {
            const ministryItem = document.createElement('div');
            ministryItem.classList.add('registered-item'); // Classe CSS para estilo de cartão
            ministryItem.innerHTML = `
                <h3>${ministry.name}</h3>
                <div class="item-actions">
                    <button class="btn btn-secondary btn-sm" onclick="editMinistry('${ministry.id}')">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteMinistry('${ministry.id}')">Excluir</button>
                </div>
            `;
            ministriesListContainer.appendChild(ministryItem);
        });
    } else {
        // Se não houver ministérios, exibe a mensagem apropriada
        if (noMinistriesMessage) {
            ministriesListContainer.appendChild(noMinistriesMessage);
            noMinistriesMessage.style.display = 'block';
        }
    }
}

/**
 * Carrega os dados de um ministério para o formulário de edição.
 * @param {string} ministryId - O ID do ministério a ser editado.
 */
function editMinistry(ministryId) {
    let currentMinistries = loadData('allMinistries');
    const ministry = currentMinistries.find(m => m.id === ministryId);

    if (ministry) {
        document.getElementById('ministry-id').value = ministry.id;
        document.getElementById('ministry-name').value = ministry.name;
        document.querySelector('#ministry-form button[type="submit"]').textContent = 'Atualizar Ministério';
        document.getElementById('cancel-ministry-edit').style.display = 'inline-block';
    }
}

/**
 * Exclui um ministério e atualiza todas as referências a ele em membros e eventos.
 * @param {string} ministryId - O ID do ministério a ser excluído.
 */
function deleteMinistry(ministryId) {
    if (!confirm('Tem certeza que deseja excluir este ministério? Esta ação removerá o ministério e desassociará de todos os membros e eventos. É irreversível.')) {
        return;
    }

    let currentMinistries = loadData('allMinistries');
    const ministryToDelete = currentMinistries.find(m => m.id === ministryId);
    if (!ministryToDelete) return; // Ministérios não encontrado

    // 1. Remove o ministério da lista principal de ministérios
    currentMinistries = currentMinistries.filter(m => m.id !== ministryId);
    saveData('allMinistries', currentMinistries);

    // 2. Atualiza membros: remove o ministério excluído da lista de ministérios de CADA membro
    let currentMembers = loadData('allMembers');
    currentMembers.forEach(member => {
        member.ministries = member.ministries.filter(m => m.ministryId !== ministryId);
    });
    saveData('allMembers', currentMembers);

    // 3. Atualiza eventos: remove o ministério excluído da lista de ministérios de CADA evento.
    // Importante: Eventos armazenam o `name` do ministério, não o `id`.
    let currentEvents = loadData('churchEvents');
    currentEvents.forEach(event => {
        event.ministries = event.ministries.filter(mName => mName !== ministryToDelete.name);
    });
    saveData('churchEvents', currentEvents);

    alert(`Ministério "${ministryToDelete.name}" e suas associações foram excluídos com sucesso!`);
    
    // Atualiza todas as interfaces que dependem desses dados
    displayMinistries();
    displayMembers(); // A lista de membros precisa ser atualizada
    displayUpcomingEvents(); // O dashboard pode ser afetado por eventos atualizados
    populateMemberMinistryCheckboxes(); // Checkboxes do form de membro precisam ser recarregados
    populateEventMinistriesCheckboxes(); // Checkboxes do form de evento precisam ser recarregados
}

/**
 * Atualiza o nome de um ministério em todas as estruturas de dados dependentes (membros, eventos).
 * Chamada apenas ao editar um ministério.
 * @param {string} ministryId - ID do ministério que teve o nome alterado.
 * @param {string} oldName - Nome antigo do ministério.
 * @param {string} newName - Novo nome do ministério.
 */
function updateMinistryNameInDependentData(ministryId, oldName, newName) {
    // 1. Atualiza em `allMembers`: o nome do ministério associado a cada membro
    let currentMembers = loadData('allMembers');
    currentMembers.forEach(member => {
        member.ministries.forEach(m => {
            if (m.ministryId === ministryId) {
                m.ministryName = newName; // Atualiza o nome do ministério na associação do membro
            }
        });
    });
    saveData('allMembers', currentMembers);

    // 2. Atualiza em `churchEvents`: o nome do ministério na lista de ministérios envolvidos no evento
    let currentEvents = loadData('churchEvents');
    currentEvents.forEach(event => {
        // Mapeia a array de nomes de ministérios, substituindo o nome antigo pelo novo
        event.ministries = event.ministries.map(name => name === oldName ? newName : name);
    });
    saveData('churchEvents', currentEvents);
}

// ================================================================
// --- FUNÇÕES DA SEÇÃO CONFIGURAÇÕES: GERENCIAR MEMBROS ---
// ================================================================

/**
 * Popula dinamicamente os checkboxes de ministérios para o formulário de cadastro de membros.
 * Inclui um input para a "função" de cada membro no ministério.
 * @param {Array} [memberMinistries=[]] - Opcional: lista de ministérios já associados ao membro (para edição).
 * Formato esperado para `memberMinistries`: `[{ ministryId, ministryName, role }]`
 */
function populateMemberMinistryCheckboxes(memberMinistries = []) {
    const checkboxesContainer = document.getElementById('member-ministries-roles');
    const noMinistriesMessage = document.getElementById('no-ministries-for-members-message');
    const allRegisteredMinistries = loadData('allMinistries').sort((a, b) => a.name.localeCompare(b.name));

    if (!checkboxesContainer) return;

    checkboxesContainer.innerHTML = ''; // Limpa quaisquer inputs existentes
    if (noMinistriesMessage) noMinistriesMessage.style.display = 'none';

    if (allRegisteredMinistries.length === 0) {
        // Se não há ministérios cadastrados, exibe uma mensagem
        if (noMinistriesMessage) {
            checkboxesContainer.appendChild(noMinistriesMessage);
            noMinistriesMessage.style.display = 'block';
        }
        return;
    }

    allRegisteredMinistries.forEach(ministry => {
        // Verifica se este ministério já está associado ao membro (útil para edição)
        const isChecked = memberMinistries.some(m => m.ministryId === ministry.id);
        const memberRole = isChecked ? memberMinistries.find(m => m.ministryId === ministry.id).role : '';

        const div = document.createElement('div');
        div.classList.add('role-input-group'); // Classe CSS para estilização do grupo
        if (isChecked) div.classList.add('checked-ministry'); // Adiciona classe se estiver marcado para estilo visual

        div.innerHTML = `
            <label>
                <input type="checkbox" name="member-ministry" value="${ministry.id}" data-ministry-name="${ministry.name}" ${isChecked ? 'checked' : ''}>
                ${ministry.name}
            </label>
            <input type="text" name="member-role-${ministry.id}" placeholder="Função (ex: Vocalista, Auxiliar)" value="${memberRole}">
        `;
        checkboxesContainer.appendChild(div);

        // Adiciona event listener para controlar a visibilidade/estilo do input de função
        const checkbox = div.querySelector('input[type="checkbox"]');
        const roleInput = div.querySelector('input[type="text"]');

        roleInput.style.display = isChecked ? 'block' : 'none'; // Estado inicial do input de função

        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                roleInput.style.display = 'block'; // Mostra o input
                div.classList.add('checked-ministry'); // Adiciona classe para estilo de fundo
            } else {
                roleInput.style.display = 'none'; // Esconde o input
                roleInput.value = ''; // Limpa o valor da função
                div.classList.remove('checked-ministry'); // Remove classe de estilo de fundo
            }
        });
    });
}

/**
 * Adiciona um novo membro ou atualiza um existente no `allMembers`.
 */
function addOrUpdateMember(e) {
    e.preventDefault();
    const memberId = document.getElementById('member-id').value;
    const memberNameInput = document.getElementById('member-name');
    const memberName = memberNameInput.value.trim();
    const memberAvailableForScale = document.getElementById('member-available-for-scale').checked; // Captura o status de disponibilidade

    if (!memberName) {
        alert('Por favor, insira o nome do membro.');
        return;
    }

    // Coleta os ministérios e funções selecionados para o membro
    const selectedMinistriesRoles = [];
    document.querySelectorAll('#member-ministries-roles input[name="member-ministry"]:checked').forEach(checkbox => {
        const ministryId = checkbox.value;
        const ministryName = checkbox.dataset.ministryName; // Pega o nome do ministério do atributo data-
        const role = document.querySelector(`input[name="member-role-${ministryId}"]`).value.trim();
        selectedMinistriesRoles.push({ ministryId, ministryName, role });
    });

    if (selectedMinistriesRoles.length === 0) {
        alert('Por favor, associe o membro a pelo menos um ministério.');
        return;
    }

    let currentMembers = loadData('allMembers');

    // Verifica por nomes duplicados de membros (case-insensitive), excluindo o próprio membro se estiver editando
    const isDuplicate = currentMembers.some(m => 
        m.name.toLowerCase() === memberName.toLowerCase() && m.id !== memberId
    );

    if (isDuplicate) {
        alert('Já existe um membro com este nome.');
        return;
    }

    if (memberId) {
        // Lógica para ATUALIZAR um membro existente
        const memberIndex = currentMembers.findIndex(m => m.id === memberId);
        if (memberIndex !== -1) {
            currentMembers[memberIndex].name = memberName;
            currentMembers[memberIndex].ministries = selectedMinistriesRoles;
            currentMembers[memberIndex].availableForScale = memberAvailableForScale; // Atualiza o status de disponibilidade
            alert('Membro atualizado com sucesso!');
        }
    } else {
        // Lógica para ADICIONAR um novo membro
        const newMember = { 
            id: generateUniqueId(), 
            name: memberName, 
            ministries: selectedMinistriesRoles,
            availableForScale: memberAvailableForScale // Salva o status de disponibilidade
        };
        currentMembers.push(newMember);
        alert('Membro adicionado com sucesso!');
    }

    saveData('allMembers', currentMembers); // Salva a lista de membros atualizada
    
    // Limpa o formulário e reseta o estado de edição
    memberNameInput.value = '';
    document.getElementById('member-id').value = '';
    document.getElementById('member-available-for-scale').checked = true; // Reseta o checkbox de disponibilidade para true por padrão
    populateMemberMinistryCheckboxes(); // Reset e repopula os checkboxes
    document.getElementById('cancel-member-edit').style.display = 'none';
    document.querySelector('#member-form button[type="submit"]').textContent = 'Salvar Membro';
    
    displayMembers(); // Atualiza a lista de membros exibida
}

/**
 * Exibe a lista de membros cadastrados na sub-seção "Gerenciar Membros".
 */
function displayMembers() {
    const membersListContainer = document.getElementById('members-list');
    const noMembersMessage = document.getElementById('no-members-message');

    // Carrega e ordena os membros por nome
    let currentMembers = loadData('allMembers').sort((a, b) => a.name.localeCompare(b.name));

    if (!membersListContainer) return;

    membersListContainer.innerHTML = ''; // Limpa a lista existente
    if (noMembersMessage) noMembersMessage.style.display = 'none';

    if (currentMembers.length > 0) {
        currentMembers.forEach(member => {
            const memberItem = document.createElement('div');
            memberItem.classList.add('registered-item'); // Classe CSS para estilo de cartão

            // Cria uma lista de ministérios e funções para exibição no cartão do membro
            const ministryRolesHtml = member.ministries.length > 0
                ? member.ministries.map(m => `<li>${m.ministryName} ${m.role ? `(${m.role})` : ''}</li>`).join('')
                : '<li>Nenhum ministério associado.</li>';

            const availabilityStatus = member.availableForScale ? 'Sim' : 'Não'; // Texto de status

            memberItem.innerHTML = `
                <h3>${member.name}</h3>
                <p><strong>Disponível para Escala:</strong> ${availabilityStatus}</p>
                <p><strong>Ministérios:</strong></p>
                <ul class="member-ministries-display">${ministryRolesHtml}</ul>
                <div class="item-actions">
                    <button class="btn btn-secondary btn-sm" onclick="editMember('${member.id}')">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteMember('${member.id}')">Excluir</button>
                </div>
            `;
            membersListContainer.appendChild(memberItem);
        });
    } else {
        // Se não houver membros, exibe a mensagem apropriada
        if (noMembersMessage) {
            membersListContainer.appendChild(noMembersMessage);
            noMembersMessage.style.display = 'block';
        }
    }
}

/**
 * Carrega os dados de um membro para o formulário de edição.
 * @param {string} memberId - O ID do membro a ser editado.
 */
function editMember(memberId) {
    let currentMembers = loadData('allMembers');
    const member = currentMembers.find(m => m.id === memberId);

    if (member) {
        document.getElementById('member-id').value = member.id;
        document.getElementById('member-name').value = member.name;
        document.getElementById('member-available-for-scale').checked = member.availableForScale || false; // Carrega o status de disponibilidade
        // Popula os checkboxes e inputs de função com os dados do membro
        populateMemberMinistryCheckboxes(member.ministries); 
        document.querySelector('#member-form button[type="submit"]').textContent = 'Atualizar Membro';
        document.getElementById('cancel-member-edit').style.display = 'inline-block';
    }
}

/**
 * Exclui um membro do `allMembers`.
 * @param {string} memberId - O ID do membro a ser excluído.
 */
function deleteMember(memberId) {
    if (!confirm('Tem certeza que deseja excluir este membro?')) {
        return;
    }

    let currentMembers = loadData('allMembers');
    currentMembers = currentMembers.filter(m => m.id !== memberId); // Remove o membro
    saveData('allMembers', currentMembers); // Salva a lista atualizada

    alert('Membro excluído com sucesso!');
    displayMembers(); // Atualiza a lista exibida
}


// ================================================================
// --- FUNÇÕES DA SEÇÃO CONFIGURAÇÕES: GERENCIAR EVENTOS ---
// ================================================================

/**
 * Popula dinamicamente os checkboxes de ministérios para o formulário de evento.
 * Os ministérios são carregados da lista dinâmica `allMinistries`.
 * @param {Array} [eventMinistries=[]] - Opcional: lista de nomes de ministérios já envolvidos no evento (para edição).
 */
function populateEventMinistriesCheckboxes(eventMinistries = []) {
    const checkboxesContainer = document.getElementById('event-ministries-checkboxes');
    const noMinistriesMessage = document.getElementById('no-ministries-for-events-message');
    // Carrega a lista de ministérios atualmente cadastrados e os ordena por nome
    const allRegisteredMinistries = loadData('allMinistries').sort((a, b) => a.name.localeCompare(b.name));

    if (!checkboxesContainer) return;

    checkboxesContainer.innerHTML = ''; // Limpa opções existentes
    if (noMinistriesMessage) noMinistriesMessage.style.display = 'none';

    if (allRegisteredMinistries.length === 0) {
        // Se não há ministérios cadastrados, exibe uma mensagem
        if (noMinistriesMessage) {
            checkboxesContainer.appendChild(noMinistriesMessage);
            noMinistriesMessage.style.display = 'block';
        }
        return;
    }

    allRegisteredMinistries.forEach(ministry => {
        const label = document.createElement('label');
        // Verifica se o nome do ministério está na lista de ministérios do evento (para pré-marcar)
        const isChecked = eventMinistries.includes(ministry.name); 
        label.innerHTML = `
            <input type="checkbox" name="event-ministries" value="${ministry.name}" ${isChecked ? 'checked' : ''}>
            ${ministry.name}
        `;
        checkboxesContainer.appendChild(label);
    });
}

/**
 * Adiciona um novo evento ou atualiza um existente no `churchEvents`.
 */
function addOrUpdateEvent(e) {
    e.preventDefault();
    const eventId = document.getElementById('event-edit-id').value; // ID oculto para edição
    const eventNameInput = document.getElementById('event-name');
    const eventDateInput = document.getElementById('event-date');
    const eventNotesInput = document.getElementById('event-notes');

    if (!eventNameInput || !eventDateInput || !eventNotesInput) {
        console.error('Um ou mais elementos do formulário de evento não encontrados.');
        return;
    }

    const eventName = eventNameInput.value.trim();
    const eventDate = eventDateInput.value;
    const selectedMinistries = Array.from(document.querySelectorAll('#event-ministries-checkboxes input[name="event-ministries"]:checked'))
                                .map(checkbox => checkbox.value);
    const eventNotes = eventNotesInput.value.trim();

    // Validação
    if (!eventName || !eventDate || selectedMinistries.length === 0) {
        alert('Por favor, preencha o nome do evento, a data e selecione pelo menos um ministério.');
        return;
    }

    let currentEvents = loadData('churchEvents');

    if (eventId) {
        // Lógica para ATUALIZAR um evento existente
        const eventIndex = currentEvents.findIndex(event => event.id === eventId);
        if (eventIndex !== -1) {
            currentEvents[eventIndex].name = eventName;
            currentEvents[eventIndex].date = eventDate;
            currentEvents[eventIndex].ministries = selectedMinistries;
            currentEvents[eventIndex].notes = eventNotes;
            alert('Evento atualizado com sucesso!');
        }
    } else {
        // Lógica para ADICIONAR um novo evento
        const newEvent = {
            id: generateUniqueId(),
            name: eventName,
            date: eventDate,
            ministries: selectedMinistries,
            notes: eventNotes
        };
        currentEvents.push(newEvent);
        alert('Evento adicionado com sucesso!');
    }

    saveData('churchEvents', currentEvents); // Salva a lista de eventos atualizada
    
    // Limpa o formulário e reseta o estado de edição
    document.getElementById('event-form').reset();
    document.getElementById('event-edit-id').value = '';
    populateEventMinistriesCheckboxes(); // Reseta os checkboxes
    document.getElementById('save-event-btn').textContent = 'Salvar Evento';
    document.getElementById('cancel-event-edit').style.display = 'none';

    displayRegisteredEvents(); // Atualiza a lista de eventos exibida
    displayUpcomingEvents();   // Atualiza o dashboard
    renderCalendar('dashboard-calendar-grid', currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 'dashboard'); // Atualiza o calendário do dashboard
    renderCalendar('config-events-calendar-grid', currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 'config-events'); // Atualiza o calendário da config
}

/**
 * Exclui um evento.
 * @param {string} eventId - O ID do evento a ser excluído.
 */
function deleteEvent(eventId) {
    if (confirm('Tem certeza que deseja excluir este evento?')) {
        churchEvents = churchEvents.filter(event => event.id !== eventId); // Remove o evento
        saveData('churchEvents', churchEvents); // Salva a lista atualizada

        alert('Evento excluído com sucesso!');
        displayRegisteredEvents(); // Atualiza a lista exibida
        displayUpcomingEvents();   // Atualiza o dashboard
        renderCalendar('dashboard-calendar-grid', currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 'dashboard'); // Atualiza o calendário do dashboard
        renderCalendar('config-events-calendar-grid', currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 'config-events'); // Atualiza o calendário da config
    }
}

/**
 * Função para importar eventos de um arquivo JSON, CSV ou XLSX.
 */
function importCalendarFromFile() {
    const fileInput = document.getElementById('import-calendar-file');
    const statusMessageElement = document.getElementById('import-status-message');
    statusMessageElement.style.display = 'none'; // Esconde mensagem anterior
    statusMessageElement.classList.remove('error-message', 'success-message'); // Limpa classes de estilo

    const file = fileInput.files[0];
    if (!file) {
        statusMessageElement.textContent = 'Por favor, selecione um arquivo para importar.';
        statusMessageElement.style.color = 'var(--error-color)';
        statusMessageElement.style.display = 'block';
        return;
    }

    const fileExtension = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();

    reader.onload = (event) => {
        let importedEvents = [];
        let parsingError = false;

        try {
            if (fileExtension === 'json') {
                importedEvents = JSON.parse(event.target.result);
            } else if (fileExtension === 'csv') {
                importedEvents = parseCsvToEvents(event.target.result);
            } else if (fileExtension === 'xlsx') {
                if (typeof XLSX === 'undefined') {
                    throw new Error('A biblioteca SheetJS (xlsx.full.min.js) não foi carregada. Certifique-se de incluí-la no index.html ANTES do escala.js.');
                }
                const data = new Uint8Array(event.target.result); // Dados binários para XLSX
                const workbook = XLSX.read(data, { type: 'array', cellDates: true }); // cellDates para tentar ler datas corretamente
                const sheetName = workbook.SheetNames[0]; // Pega a primeira aba
                const worksheet = workbook.Sheets[sheetName];
                // Converte para JSON. `raw: false` tenta formatar valores, `dateNF` para formato de data
                importedEvents = XLSX.utils.sheet_to_json(worksheet, { 
                    header: 1, 
                    raw: false, // Tenta converter tipos (datas, números)
                    dateNF: 'YYYY-MM-DD' // Formato desejado para datas
                }); 
                importedEvents = mapXlsxDataToEvents(importedEvents); // Mapeia array de arrays para objetos de evento
            } else {
                statusMessageElement.textContent = 'Formato de arquivo não suportado. Use .json, .csv ou .xlsx.';
                statusMessageElement.style.color = 'var(--error-color)';
                statusMessageElement.style.display = 'block';
                return;
            }

            if (!Array.isArray(importedEvents)) {
                statusMessageElement.textContent = `Conteúdo do arquivo inválido. Esperava-se uma array de eventos.`;
                statusMessageElement.style.color = 'var(--error-color)';
                statusMessageElement.style.display = 'block';
                return;
            }

            let currentEvents = loadData('churchEvents');
            let importedCount = 0;
            let skippedCount = 0; // Para eventos duplicados ou inválidos

            // Para cada evento importado, valida e adiciona se for novo
            importedEvents.forEach(newEventData => {
                // Validação mínima da estrutura do evento
                const isValidEvent = newEventData.name && newEventData.date && Array.isArray(newEventData.ministries);
                
                if (isValidEvent) {
                    // Opcional: verificar se o evento (nome e data) já existe para evitar duplicatas
                    const exists = currentEvents.some(existingEvent => 
                        existingEvent.name === newEventData.name && existingEvent.date === newEventData.date
                    );
                    
                    if (!exists) {
                        // Adiciona o evento, gerando um novo ID
                        currentEvents.push({
                            id: generateUniqueId(),
                            name: newEventData.name,
                            date: newEventData.date,
                            ministries: newEventData.ministries,
                            notes: newEventData.notes || '' // Garante que 'notes' existe, mesmo que vazio
                        });
                        importedCount++;
                    } else {
                        skippedCount++;
                    }
                } else {
                    console.warn(`Evento ignorado (inválido ou incompleto) do arquivo ${fileExtension}:`, newEventData);
                    skippedCount++;
                }
            });

            saveData('churchEvents', currentEvents); // Salva a lista de eventos (existentes + importados)

            statusMessageElement.textContent = `Importação concluída! ${importedCount} evento(s) adicionado(s). ${skippedCount} evento(s) ignorado(s) (duplicado ou formato inválido).`;
            statusMessageElement.style.color = 'var(--success-color)';
            statusMessageElement.style.display = 'block';
            
            // Atualiza as interfaces que exibem eventos
            displayRegisteredEvents();
            displayUpcomingEvents();
            renderCalendar('dashboard-calendar-grid', currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 'dashboard');
            renderCalendar('config-events-calendar-grid', currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 'config-events');

        } catch (e) {
            console.error('Erro ao processar arquivo:', e);
            statusMessageElement.textContent = `Erro ao ler ou processar o arquivo (${fileExtension}). Verifique o formato e conteúdo. Detalhes: ${e.message}`;
            statusMessageElement.style.color = 'var(--error-color)';
            statusMessageElement.style.display = 'block';
            parsingError = true;
        } finally {
            fileInput.value = ''; // Limpa o input de arquivo após a importação (sucesso ou falha)
        }
    };

    reader.onerror = () => {
        statusMessageElement.textContent = 'Erro ao ler o arquivo. Tente novamente.';
        statusMessageElement.style.color = 'var(--error-color)';
        statusMessageElement.style.display = 'block';
    };

    // Lê o conteúdo do arquivo de acordo com a extensão
    if (fileExtension === 'xlsx') {
        reader.readAsArrayBuffer(file); // XLSX precisa ser lido como ArrayBuffer
    } else {
        reader.readAsText(file); // JSON e CSV podem ser lidos como texto
    }
}

/**
 * Converte dados de uma planilha XLSX (array de arrays) para o formato de eventos.
 * Espera que a primeira linha sejam os cabeçalhos.
 * Mapeia os cabeçalhos para as chaves do objeto de evento.
 * @param {Array<Array<any>>} data - Dados da planilha XLSX, onde cada sub-array é uma linha.
 * @returns {Array<Object>} Array de objetos de evento.
 */
function mapXlsxDataToEvents(data) {
    // Se a planilha estiver vazia ou tiver apenas o cabeçalho, retorna array vazia
    if (!data || data.length < 2) return [];

    const headers = data[0].map(h => h ? h.toString().trim() : ''); // Pega cabeçalhos da primeira linha
    const events = [];

    // Mapeamento de cabeçalhos do Excel para chaves do objeto de evento
    // Normalizado para minúsculas e sem acentos/caracteres especiais para robustez
    const headerMap = {
        'nome do evento': 'name',
        'data': 'date',
        'ministerios': 'ministries', 
        'observacoes': 'notes',     
        'ministérios': 'ministries', 
        'observações': 'notes'       
    };

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const event = {};
        
        for (let j = 0; j < headers.length; j++) {
            const header = headers[j];
            const normalizedHeader = header.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Normaliza para comparação
            const key = headerMap[normalizedHeader]; // Pega a chave correspondente (ex: 'name')
            let value = row[j]; // Valor da célula

            if (key) { // Se o cabeçalho é reconhecido no headerMap
                if (key === 'date') {
                    // SheetJS com cellDates:true e dateNF:YYYY-MM-DD já deve entregar no formato certo
                    // Apenas garantir que é uma string YYYY-MM-DD
                    event[key] = value ? String(value).split('T')[0] : '';
                } else if (key === 'ministries') {
                    // Assume que os ministérios estão em uma string separada por ';' ou ','
                    // Filtra para remover entradas vazias após o split
                    event[key] = value ? String(value).split(/;|,/).map(m => m.trim()).filter(m => m) : [];
                } else {
                    event[key] = value ? String(value).trim() : '';
                }
            }
        }
        
        // Validação mínima para garantir que o objeto de evento é válido
        // Um evento precisa ter nome, data e pelo menos um ministério
        if (event.name && event.date && Array.isArray(event.ministries) && event.ministries.length > 0) {
            events.push(event);
        } else {
            console.warn('Linha XLSX ignorada (dados incompletos ou inválidos para evento):', row);
        }
    }
    return events;
}

/**
 * Converte uma string CSV para o formato de array de objetos de evento.
 * Espera que a primeira linha sejam os cabeçalhos.
 * Assume vírgula (`,`) como delimitador de coluna e ponto e vírgula (`;`) para ministérios.
 * Este parser CSV é básico e não lida com todas as complexidades do formato CSV (ex: vírgulas dentro de campos entre aspas, quebras de linha internas).
 * @param {string} csvString - O conteúdo do arquivo CSV como string.
 * @returns {Array<Object>} Array de objetos de evento.
 */
function parseCsvToEvents(csvString) {
    const lines = csvString.split('\n');
    if (lines.length < 2) return []; // Precisa de cabeçalho e pelo menos uma linha de dados

    const headers = lines[0].split(',').map(h => h.trim());
    const events = [];

    // Mapeamento de cabeçalhos do CSV para chaves do objeto de evento
    const headerMap = {
        'nome do evento': 'name',
        'data': 'date',
        'ministerios': 'ministries',
        'observacoes': 'notes',
        'ministérios': 'ministries',
        'observações': 'notes'
    };

    for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].trim();
        if (currentLine === '') continue; // Ignora linhas vazias

        // Um regex simples para tentar separar campos. Não é 100% robusto para todos os CSVs.
        // O ideal para CSV seria usar uma biblioteca de parsing CSV dedicada.
        const data = currentLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/) // Tenta dividir por vírgula fora de aspas
                                .map(field => field.replace(/^"|"$/g, '').trim()); // Remove aspas e trim

        if (data.length !== headers.length) {
            console.warn('Linha CSV ignorada (número de colunas incompatível com o cabeçalho):', currentLine);
            continue;
        }

        const event = {};
        for (let j = 0; j < headers.length; j++) {
            const header = headers[j];
            const normalizedHeader = header.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const key = headerMap[normalizedHeader];
            let value = data[j] ? data[j].trim() : '';

            if (key) {
                if (key === 'date') {
                    // Tentar converter DD/MM/YYYY para YYYY-MM-DD para compatibilidade
                    const parts = value.split('/');
                    if (parts.length === 3) {
                        value = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }
                    event[key] = value; 
                } else if (key === 'ministries') {
                    event[key] = value ? value.split(/;|,/).map(m => m.trim()).filter(m => m) : [];
                } else {
                    event[key] = value;
                }
            }
        }
        // Validação mínima antes de adicionar
        if (event.name && event.date && Array.isArray(event.ministries) && event.ministries.length > 0) {
            events.push(event);
        } else {
            console.warn('Linha CSV ignorada (dados incompletos ou inválidos para evento):', currentLine);
        }
    }
    return events;
}

/**
 * Processa texto colado na textarea, tentando extrair eventos.
 * Espera um formato simples por linha: "DD/MM/YYYY - Nome do Evento - Ministério1; Ministério2 - Observações"
 * ou "DD/MM/YYYY - Nome do Evento"
 */
function processPastedCalendarText() {
    const pasteTextArea = document.getElementById('paste-calendar-text');
    const statusMessageElement = document.getElementById('paste-status-message');
    statusMessageElement.style.display = 'none';
    statusMessageElement.classList.remove('error-message', 'success-message');

    const pastedText = pasteTextArea.value.trim();
    if (!pastedText) {
        statusMessageElement.textContent = 'Por favor, cole o texto do calendário na caixa acima.';
        statusMessageElement.style.color = 'var(--error-color)';
        statusMessageElement.style.display = 'block';
        return;
    }

    const lines = pastedText.split('\n').map(line => line.trim()).filter(line => line);
    let importedEvents = [];
    let importedCount = 0;
    let skippedCount = 0;
    let currentEvents = loadData('churchEvents');

    // Regex para tentar capturar data, nome do evento, ministérios e observações
    // Formato esperado: DD/MM/YYYY - Nome do Evento - Min1; Min2 - Observações
    // Ou: DD/MM/YYYY - Nome do Evento
    const eventRegex = /^(\d{2}\/\d{2}\/\d{4})\s*-\s*(.+?)(?:\s*-\s*([^-]+?))?(?:\s*-\s*(.+))?$/;

    lines.forEach(line => {
        const match = line.match(eventRegex);
        if (match) {
            const dateParts = match[1].split('/');
            const dateYYYYMMDD = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
            const eventName = match[2].trim();
            const ministriesText = match[3] ? match[3].trim() : '';
            const notes = match[4] ? match[4].trim() : '';

            const ministries = ministriesText ? ministriesText.split(/;|,/).map(m => m.trim()).filter(m => m) : [];

            const newEventData = {
                name: eventName,
                date: dateYYYYMMDD,
                ministries: ministries,
                notes: notes
            };

            // Validação e adição similar à importação de arquivo
            const isValidEvent = newEventData.name && newEventData.date && Array.isArray(newEventData.ministries);
            if (isValidEvent) {
                const exists = currentEvents.some(existingEvent => 
                    existingEvent.name === newEventData.name && existingEvent.date === newEventData.date
                );
                if (!exists) {
                    currentEvents.push({ ...newEventData, id: generateUniqueId() });
                    importedCount++;
                } else {
                    skippedCount++;
                }
            } else {
                console.warn('Linha de texto colado ignorada (formato inválido ou dados incompletos):', line);
                skippedCount++;
            }
        } else {
            console.warn('Linha de texto colado não corresponde ao formato esperado e foi ignorada:', line);
            skippedCount++;
        }
    });

    saveData('churchEvents', currentEvents);

    statusMessageElement.textContent = `Processamento concluído! ${importedCount} evento(s) adicionado(s). ${skippedCount} evento(s) ignorado(s).`;
    statusMessageElement.style.color = 'var(--success-color)';
    statusMessageElement.style.display = 'block';

    displayRegisteredEvents();
    displayUpcomingEvents();
    renderCalendar('dashboard-calendar-grid', currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 'dashboard');
    renderCalendar('config-events-calendar-grid', currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 'config-events');
    pasteTextArea.value = ''; // Limpa a textarea após processar
}


// ================================================================
// --- FUNÇÕES DA SEÇÃO GERAR ESCALAS ---
// ================================================================

/**
 * Preenche os seletores de mês e ano na seção de "Gerar Escalas".
 */
function populateMonthYearSelectors() {
    const monthSelect = document.getElementById('scale-month');
    const yearInput = document.getElementById('scale-year');
    const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    if (!monthSelect || !yearInput) return;

    monthSelect.innerHTML = ''; // Limpa opções existentes
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1; // Mês 1-12
        option.textContent = month;
        monthSelect.appendChild(option);
    });

    // Define o mês e ano atuais para facilitar o teste inicial
    const currentMonth = new Date().getMonth(); // Mês atual (0-indexed)
    const currentYear = new Date().getFullYear();
    
    monthSelect.value = currentMonth + 1; 
    yearInput.value = currentYear;
}

/**
 * Gera a escala mensal para o mês e ano selecionados.
 * A lógica de atribuição é um rodízio simples entre os membros DISPONÍVEIS de cada ministério,
 * tentando atribuir múltiplos membros por vez.
 * Agora, utiliza os dados dinâmicos de `allMinistries` e `allMembers`.
 */
function generateScale() {
    const month = parseInt(document.getElementById('scale-month').value);
    const year = parseInt(document.getElementById('scale-year').value);
    const outputDiv = document.getElementById('generated-scale-output');
    const shareOptionsDiv = document.getElementById('share-options');

    if (!outputDiv || !shareOptionsDiv) return;

    outputDiv.innerHTML = ''; // Limpa a saída anterior
    shareOptionsDiv.style.display = 'none'; // Esconde opções de compartilhamento

    // Carrega os dados mais recentes de ministérios e membros
    const currentMinistries = loadData('allMinistries').sort((a, b) => a.name.localeCompare(b.name)); // Garante ordem alfabética para display
    const currentMembers = loadData('allMembers');
    const currentEvents = loadData('churchEvents');

    // Validação: precisa ter ministérios e membros cadastrados para gerar escala
    if (currentMinistries.length === 0) {
        outputDiv.innerHTML = `<p class="info-message">Por favor, cadastre Ministérios na seção "Configurações > Gerenciar Ministérios" antes de gerar uma escala.</p>`;
        return;
    }
    if (currentMembers.length === 0) {
        outputDiv.innerHTML = `<p class="info-message">Por favor, cadastre Membros na seção "Configurações > Gerenciar Membros" antes de gerar uma escala.</p>`;
        return;
    }

    const scaleTitle = `Escala Mensal - ${new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`;
    let scaleHtml = `<h3 style="text-align: center;">${scaleTitle}</h3>`;
    let scaleTextForShare = `${scaleTitle}\n\n`;

    const daysInMonth = new Date(year, month, 0).getDate();
    const daysOfMonth = [];
    for (let i = 1; i <= daysInMonth; i++) {
        daysOfMonth.push(new Date(year, month - 1, i));
    }

    // Filtra domingos e eventos específicos para o mês/ano
    const sundayDates = daysOfMonth.filter(date => date.getDay() === 0).map(d => d.toISOString().split('T')[0]);
    
    const customEvents = currentEvents.filter(event => {
        const eventDate = new Date(event.date + 'T00:00:00');
        return eventDate.getMonth() + 1 === month && eventDate.getFullYear() === year;
    }).map(e => ({ date: e.date, name: e.name, ministries: e.ministries }));

    // Consolidar todas as datas que precisam de escala, remover duplicatas e ordenar
    const relevantDateStrings = [...new Set([...sundayDates, ...customEvents.map(e => e.date)])];
    const relevantDates = relevantDateStrings
        .map(dateStr => new Date(dateStr + 'T00:00:00'))
        .sort((a, b) => a - b);

    if (relevantDates.length === 0) {
        outputDiv.innerHTML = `<p class="info-message">Não há domingos ou eventos especiais cadastrados para o mês de ${new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long' })}.</p>`;
        return;
    }

    // Objeto para controlar o índice do próximo membro a ser escalado para cada ministério
    const assignedMembersIndex = {};
    // Inicializa o índice para todos os ministérios cadastrados
    currentMinistries.forEach(min => assignedMembersIndex[min.id] = 0); 

    // Define um número padrão de pessoas por ministério (pode ser ajustado)
    // No futuro, isso poderia ser configurável por ministério ou por evento.
    const defaultPeoplePerMinistry = 3; // Exemplo: 3 pessoas por ministério por dia
    const peopleForLouvor = 5; // Exemplo específico para o ministério de Louvor

    for (const ministry of currentMinistries) {
        // Filtra os membros que pertencem a ESTE ministério E estão DISPONÍVEIS PARA ESCALA
        const availableMembersInThisMinistry = currentMembers.filter(member => 
            member.availableForScale && member.ministries.some(m => m.ministryId === ministry.id)
        );
        
        if (availableMembersInThisMinistry.length === 0) {
            scaleHtml += `<h4 style="color: var(--dark-blue); margin-top: var(--spacing-md);">${ministry.name}</h4>`;
            scaleHtml += `<p class="info-message">Nenhum membro disponível para escala automática no ministério de ${ministry.name}.</p>`;
            scaleTextForShare += `${ministry.name}: Nenhum membro disponível.\n\n`;
            continue;
        }

        scaleHtml += `<h4 style="color: var(--dark-blue); margin-top: var(--spacing-md);">${ministry.name}</h4>`;
        scaleTextForShare += `${ministry.name}:\n`;
        scaleHtml += `<table class="scale-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Dia da Semana</th>
                                <th>Evento</th>
                                <th>Membro(s) / Função(ões)</th>
                            </tr>
                        </thead>
                        <tbody>`;

        let ministryHasAssignments = false; // Flag para verificar se alguma atribuição foi feita para este ministério no mês

        relevantDates.forEach(date => {
            const dateString = date.toISOString().split('T')[0];
            // Procura por um evento personalizado para esta data que envolve o nome atual do ministério
            const eventForThisDayAndMinistry = customEvents.find(e => 
                e.date === dateString && e.ministries.includes(ministry.name)
            );
            
            // Só gera atribuição se for domingo OU se for um evento personalizado para este ministério
            if (date.getDay() === 0 || eventForThisDayAndMinistry) {
                let eventName = eventForThisDayAndMinistry ? eventForThisDayAndMinistry.name : "Culto de Celebração";
                
                const assignedMembersForDay = [];
                const numPeopleNeeded = (ministry.name === "Louvor") ? peopleForLouvor : defaultPeoplePerMinistry;

                const startIndex = assignedMembersIndex[ministry.id];
                // Loop para atribuir o número necessário de pessoas para o dia
                for (let i = 0; i < numPeopleNeeded; i++) {
                    if (availableMembersInThisMinistry.length > 0) {
                        const memberToAssign = availableMembersInThisMinistry[(startIndex + i) % availableMembersInThisMinistry.length];
                        
                        // Garante que o mesmo membro não seja atribuído mais de uma vez no MESMO dia para o MESMO ministério
                        // (útil se numPeopleNeeded for maior que o número de membros disponíveis)
                        if (!assignedMembersForDay.some(assigned => assigned.startsWith(memberToAssign.name))) { 
                             const memberMinistryRole = memberToAssign.ministries.find(m => m.ministryId === ministry.id);
                             
                             // ============== LÓGICA DE EXIBIÇÃO DA FUNÇÃO DO MEMBRO (REVISADA) ==============
                             const roleText = memberMinistryRole?.role;
                             let memberDisplay = memberToAssign.name;
                             
                             // Converte a função para minúsculas e remove espaços para comparação consistente
                             const normalizedRole = roleText ? roleText.trim().toLowerCase() : '';
                             
                             // SE a função FOR "líder", "vice-líder" ou "pastor", então inclui a função na exibição.
                             // Qualquer outra função NÃO SERÁ exibida ao lado do nome na escala.
                             if (normalizedRole && ['líder', 'vice-líder', 'pastor'].includes(normalizedRole)) {
                                 memberDisplay += ` (${roleText})`; // Usa o roleText original (com maiúsculas/minúsculas como cadastrado)
                             }
                             assignedMembersForDay.push(memberDisplay);
                             // ============== FIM DA LÓGICA DE EXIBIÇÃO ==============

                        } else if (availableMembersInThisMinistry.length > assignedMembersForDay.length) {
                             // Lógica para tentar pegar outro membro se o atual já foi selecionado para o dia
                             // (ocorre se numPeopleNeeded > membros_disponiveis_unicos)
                             let attemptCount = 0;
                             let nextUniqueMember = null;
                             do {
                                 const nextUniqueMemberIndex = (startIndex + i + attemptCount) % availableMembersInThisMinistry.length;
                                 nextUniqueMember = availableMembersInThisMinistry[nextUniqueMemberIndex];
                                 attemptCount++;
                             } while (assignedMembersForDay.some(assigned => assigned.startsWith(nextUniqueMember.name)) && attemptCount < availableMembersInThisMinistry.length * 2); // Evita loop infinito

                             if (nextUniqueMember && !assignedMembersForDay.some(assigned => assigned.startsWith(nextUniqueMember.name))) {
                                 const nextMemberMinistryRole = nextUniqueMember.ministries.find(m => m.ministryId === ministry.id);
                                 
                                 // ============== AQUI TAMBÉM SE APLICA A MESMA LÓGICA DE EXIBIÇÃO ==============
                                 const nextRoleText = nextMemberMinistryRole?.role;
                                 let nextMemberDisplay = nextUniqueMember.name;
                                 const nextNormalizedRole = nextRoleText ? nextRoleText.trim().toLowerCase() : '';
                                 if (nextNormalizedRole && ['líder', 'vice-líder', 'pastor'].includes(nextNormalizedRole)) {
                                     nextMemberDisplay += ` (${nextRoleText})`;
                                 }
                                 assignedMembersForDay.push(nextMemberDisplay);
                                 // ============== FIM DA LÓGICA DE EXIBIÇÃO PARA O CASO DE 'ELSE IF' ==============
                             }
                        }
                    }
                }
                // Atualiza o índice para o próximo rodízio após todos os membros do dia serem selecionados
                // O índice deve avançar pelo número de pessoas que TENTAMOS atribuir, não pelo número de pessoas atribuídas de fato
                assignedMembersIndex[ministry.id] = (assignedMembersIndex[ministry.id] + numPeopleNeeded) % availableMembersInThisMinistry.length;


                const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                const dayOfWeek = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

                const assignedNames = assignedMembersForDay.length > 0 ? assignedMembersForDay.join(', ') : 'A definir';
                
                // Adiciona atributos data- para permitir a edição pós-geração
                scaleHtml += `<tr>
                                <td>${formattedDate}</td>
                                <td>${dayOfWeek}</td>
                                <td>${eventName}</td>
                                <td class="member-cell-editable" 
                                    data-scale-ministry-id="${ministry.id}" 
                                    data-scale-date="${dateString}"
                                    data-scale-members="${encodeURIComponent(JSON.stringify(assignedMembersForDay))}">
                                    ${assignedNames}
                                </td>
                            </tr>`;
                scaleTextForShare += `- ${formattedDate} (${dayOfWeek}) - ${eventName}: ${assignedNames}\n`;
                ministryHasAssignments = true;
            }
        });

        if (!ministryHasAssignments) {
            scaleHtml += `<tr><td colspan="4" class="info-message">Nenhuma atribuição para este ministério neste mês.</td></tr>`;
            scaleTextForShare += `Nenhuma atribuição para este ministério neste mês.\n`;
        }

        scaleHtml += `</tbody></table>`;
        scaleTextForShare += `\n`;
    }

    outputDiv.innerHTML = scaleHtml;
    shareOptionsDiv.style.display = 'block';

    const scaleToSave = {
        id: generateUniqueId(),
        month: month,
        year: year,
        dateGenerated: new Date().toISOString(),
        htmlContent: scaleHtml, // Salva o HTML gerado (com os data-attributes para edição)
        textContent: scaleTextForShare
    };
    // `generatedScales` é uma variável global gerenciada por `data.js`
    let currentGeneratedScales = loadData('generatedScales');
    currentGeneratedScales.push(scaleToSave);
    saveData('generatedScales', currentGeneratedScales);

    document.getElementById('share-email').onclick = () => shareScaleByEmail(scaleTextForShare);
    document.getElementById('share-whatsapp').onclick = () => shareScaleByWhatsApp(scaleTextForShare);

    // Adiciona event listeners para as células editáveis após a escala ser renderizada
    addMemberSwapListeners(scaleToSave.id); // Passa o ID da escala para o listener
}

/**
 * Adiciona event listeners às células de membro na escala gerada para permitir a troca.
 * @param {string} scaleId - O ID da escala recém-gerada/visualizada.
 */
function addMemberSwapListeners(scaleId) {
    document.querySelectorAll('.scale-table .member-cell-editable').forEach(cell => {
        cell.addEventListener('click', (e) => {
            // Evita que o clique em um botão dentro da célula dispare a troca
            if (e.target.tagName === 'BUTTON') return; 

            const ministryId = cell.dataset.scaleMinistryId;
            const dateString = cell.dataset.scaleDate;
            const currentMembersDisplay = cell.textContent.trim(); // Texto atual da célula
            
            // Abre o modal de troca
            openSwapModal(scaleId, ministryId, dateString, currentMembersDisplay, cell);
        });
    });
}

/**
 * Abre o modal para trocar um membro na escala.
 * @param {string} scaleId - ID da escala no histórico.
 * @param {string} ministryId - ID do ministério da célula clicada.
 * @param {string} dateString - Data da célula clicada (YYYY-MM-DD).
 * @param {string} currentMembersDisplay - Texto atual da célula (membros atribuídos).
 * @param {HTMLElement} targetCell - A célula HTML que foi clicada (para atualizar diretamente).
 */
function openSwapModal(scaleId, ministryId, dateString, currentMembersDisplay, targetCell) {
    const swapModal = document.getElementById('member-swap-modal');
    const swapMinistryNameElem = document.getElementById('swap-ministry-name');
    const swapEventDateElem = document.getElementById('swap-event-date');
    const swapCurrentMemberElem = document.getElementById('swap-current-member');
    const swapNewMemberSelect = document.getElementById('swap-new-member');
    const swapModalMessage = document.getElementById('swap-modal-message');

    if (!swapModal || !swapMinistryNameElem || !swapEventDateElem || !swapCurrentMemberElem || !swapNewMemberSelect || !swapModalMessage) {
        console.error("Elementos do modal de troca não encontrados.");
        return;
    }

    // Limpa mensagens anteriores
    swapModalMessage.style.display = 'none';
    swapModalMessage.classList.remove('error-message', 'success-message');

    // Armazena detalhes da troca para uso no confirmMemberSwap
    currentSwapDetails = {
        scaleId: scaleId,
        ministryId: ministryId,
        dateString: dateString,
        targetCell: targetCell // Guarda a referência da célula para atualização direta
    };

    const ministry = loadData('allMinistries').find(m => m.id === ministryId);
    if (!ministry) {
        swapModalMessage.textContent = "Ministério não encontrado.";
        swapModalMessage.style.display = 'block';
        return;
    }

    swapMinistryNameElem.textContent = ministry.name;
    swapEventDateElem.textContent = formatDate(dateString);
    swapCurrentMemberElem.textContent = currentMembersDisplay;

    // Popula o seletor com membros disponíveis para este ministério
    const availableMembers = loadData('allMembers').filter(member => 
        member.availableForScale && member.ministries.some(m => m.ministryId === ministryId)
    );

    swapNewMemberSelect.innerHTML = '<option value="">-- Selecione um membro --</option>';
    if (availableMembers.length === 0) {
        swapNewMemberSelect.innerHTML += '<option value="" disabled>Nenhum membro disponível para este ministério.</option>';
    } else {
        availableMembers.sort((a, b) => a.name.localeCompare(b.name)).forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            // Exibe o nome e a função no ministério (se houver)
            const memberMinistryRole = member.ministries.find(m => m.ministryId === ministryId);
            const roleText = memberMinistryRole?.role;
            let displayOption = member.name;
            if (roleText) { // Sempre mostra a função no modal para clareza
                displayOption += ` (${roleText})`;
            }
            option.textContent = displayOption;
            swapNewMemberSelect.appendChild(option);
        });
    }

    swapModal.style.display = 'flex'; // Exibe o modal
}

/**
 * Fecha o modal de troca de membro.
 */
function closeSwapModal() {
    document.getElementById('member-swap-modal').style.display = 'none';
    document.getElementById('swap-new-member').value = ''; // Limpa seleção
    document.getElementById('swap-modal-message').style.display = 'none'; // Esconde mensagem
}

/**
 * Confirma a troca de membro e atualiza a escala.
 */
function confirmMemberSwap() {
    const newMemberId = document.getElementById('swap-new-member').value;
    const swapModalMessage = document.getElementById('swap-modal-message');

    if (!newMemberId) {
        swapModalMessage.textContent = 'Por favor, selecione um novo membro.';
        swapModalMessage.style.color = 'var(--error-color)';
        swapModalMessage.style.display = 'block';
        return;
    }

    const allMembers = loadData('allMembers');
    const newMember = allMembers.find(m => m.id === newMemberId);
    if (!newMember) {
        swapModalMessage.textContent = 'Membro selecionado não encontrado.';
        swapModalMessage.style.color = 'var(--error-color)';
        swapModalMessage.style.display = 'block';
        return;
    }

    const { scaleId, ministryId, dateString, targetCell } = currentSwapDetails;
    if (!scaleId || !ministryId || !dateString || !targetCell) {
        swapModalMessage.textContent = 'Erro interno: dados da troca incompletos.';
        swapModalMessage.style.color = 'var(--error-color)';
        swapModalMessage.style.display = 'block';
        return;
    }

    let currentScales = loadData('generatedScales');
    const scaleIndex = currentScales.findIndex(s => s.id === scaleId);

    if (scaleIndex === -1) {
        swapModalMessage.textContent = 'Escala não encontrada no histórico.';
        swapModalMessage.style.color = 'var(--error-color)';
        swapModalMessage.style.display = 'block';
        return;
    }

    // Encontra a função do novo membro para o ministério específico
    const newMemberMinistryRole = newMember.ministries.find(m => m.ministryId === ministryId);
    const newRoleText = newMemberMinistryRole?.role;
    let newMemberDisplay = newMember.name;
    
    // Aplica a mesma lógica de formatação da escala gerada
    const normalizedNewRole = newRoleText ? newRoleText.trim().toLowerCase() : '';
    if (normalizedNewRole && ['líder', 'vice-líder', 'pastor'].includes(normalizedNewRole)) {
        newMemberDisplay += ` (${newRoleText})`;
    }

    // Atualiza o HTML da escala no histórico
    let scaleHtml = currentScales[scaleIndex].htmlContent;
    // Precisamos encontrar a célula correta no HTML salvo e substituí-la.
    // Isso é um pouco complexo pois estamos manipulando HTML como string.
    // Uma abordagem mais robusta seria reconstruir a tabela ou usar um DOMParser.
    // Para simplificar, vamos tentar uma substituição baseada em texto, mas pode ser frágil.
    // Uma forma mais segura é regenerar o HTML da escala a partir de uma estrutura de dados mais detalhada.

    // ABORDAGEM MAIS ROBUSTA: Se a escala for salva com mais detalhes, podemos reconstruir a célula.
    // Por simplicidade e para manter o foco, vamos apenas atualizar o texto da célula visível
    // e marcar a escala como "modificada" para o histórico (se fosse um sistema mais complexo).
    // Para este projeto, vamos atualizar o DOM diretamente e alertar que o histórico não é tão granular.

    // Atualiza o texto da célula visível no DOM
    targetCell.textContent = newMemberDisplay;
    targetCell.dataset.scaleMembers = encodeURIComponent(JSON.stringify([newMemberDisplay])); // Atualiza o dataset para refletir a mudança

    // Para o histórico, a forma mais simples e segura é marcar a escala como "editada manualmente"
    // ou, se a escala fosse salva de forma mais granular (array de objetos por dia/ministério),
    // poderíamos atualizar esse objeto e regenerar o HTML.
    // Por enquanto, vamos apenas atualizar o texto da célula no DOM.
    // A atualização no `currentScales[scaleIndex].htmlContent` seria mais complexa aqui.
    // Uma alternativa é salvar a escala como um array de objetos por dia/ministério/membro,
    // e reconstruir o HTML sempre que for visualizado ou editado.

    // Para o propósito deste projeto, a troca é visível na tela e persistirá se a página não for recarregada
    // sem salvar a escala novamente. Para persistir no histórico, precisaríamos de uma estrutura de dados
    // da escala mais detalhada no `generatedScales`.
    
    // Para fins de demonstração, vamos apenas atualizar o texto na escala visível.
    // Se a escala for salva no histórico e depois reaberta, ela mostrará a versão original
    // a menos que a estrutura de `scaleHtml` seja mais inteligente ou a escala seja regenerada.

    // Para realmente persistir a mudança no HISTÓRICO, precisaríamos de uma estrutura assim:
    // scaleToSave = {
    //    id: ...,
    //    month: ...,
    //    year: ...,
    //    assignments: [ // Nova array de atribuições detalhadas
    //        { date: 'YYYY-MM-DD', ministryId: 'min-id', members: [{ memberId, memberName, role }] },
    //        ...
    //    ]
    // }
    // E então, ao visualizar, gerar o HTML da tabela a partir de `assignments`.
    // Isso é um refatoramento maior da estrutura de `generatedScales`.

    // Por enquanto, a troca é apenas visual no display atual da escala.
    // Para que a troca persista no histórico, a escala precisaria ser salva de forma mais granular.
    // Vamos adicionar um aviso sobre isso.

    swapModalMessage.textContent = `Membro ${currentSwapDetails.originalMemberName} trocado por ${newMember.name}! (Nota: Para persistir no histórico, a escala deve ser gerada novamente ou a estrutura de dados da escala deve ser mais granular.)`;
    swapModalMessage.style.color = 'var(--warning-color)';
    swapModalMessage.style.display = 'block';
    
    // Fechar modal após um pequeno atraso para o usuário ler a mensagem
    setTimeout(() => {
        closeSwapModal();
    }, 2000);
}


// ================================================================
// --- FUNÇÕES DA SEÇÃO GERAR ESCALAS ---
// ================================================================

/**
 * Preenche os seletores de mês e ano na seção de "Gerar Escalas".
 */
function populateMonthYearSelectors() {
    const monthSelect = document.getElementById('scale-month');
    const yearInput = document.getElementById('scale-year');
    const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    if (!monthSelect || !yearInput) return;

    monthSelect.innerHTML = ''; // Limpa opções existentes
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1; // Mês 1-12
        option.textContent = month;
        monthSelect.appendChild(option);
    });

    // Define o mês e ano atuais para facilitar o teste inicial
    const currentMonth = new Date().getMonth(); // Mês atual (0-indexed)
    const currentYear = new Date().getFullYear();
    
    monthSelect.value = currentMonth + 1; 
    yearInput.value = currentYear;
}

/**
 * Gera a escala mensal para o mês e ano selecionados.
 * A lógica de atribuição é um rodízio simples entre os membros DISPONÍVEIS de cada ministério,
 * tentando atribuir múltiplos membros por vez.
 * Agora, utiliza os dados dinâmicos de `allMinistries` e `allMembers`.
 */
function generateScale() {
    const month = parseInt(document.getElementById('scale-month').value);
    const year = parseInt(document.getElementById('scale-year').value);
    const outputDiv = document.getElementById('generated-scale-output');
    const shareOptionsDiv = document.getElementById('share-options');

    if (!outputDiv || !shareOptionsDiv) return;

    outputDiv.innerHTML = ''; // Limpa a saída anterior
    shareOptionsDiv.style.display = 'none'; // Esconde opções de compartilhamento

    // Carrega os dados mais recentes de ministérios e membros
    const currentMinistries = loadData('allMinistries').sort((a, b) => a.name.localeCompare(b.name)); // Garante ordem alfabética para display
    const currentMembers = loadData('allMembers');
    const currentEvents = loadData('churchEvents');

    // Validação: precisa ter ministérios e membros cadastrados para gerar escala
    if (currentMinistries.length === 0) {
        outputDiv.innerHTML = `<p class="info-message">Por favor, cadastre Ministérios na seção "Configurações > Gerenciar Ministérios" antes de gerar uma escala.</p>`;
        return;
    }
    if (currentMembers.length === 0) {
        outputDiv.innerHTML = `<p class="info-message">Por favor, cadastre Membros na seção "Configurações > Gerenciar Membros" antes de gerar uma escala.</p>`;
        return;
    }

    const scaleTitle = `Escala Mensal - ${new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`;
    let scaleHtml = `<h3 style="text-align: center;">${scaleTitle}</h3>`;
    let scaleTextForShare = `${scaleTitle}\n\n`;

    const daysInMonth = new Date(year, month, 0).getDate();
    const daysOfMonth = [];
    for (let i = 1; i <= daysInMonth; i++) {
        daysOfMonth.push(new Date(year, month - 1, i));
    }

    // Filtra domingos e eventos específicos para o mês/ano
    const sundayDates = daysOfMonth.filter(date => date.getDay() === 0).map(d => d.toISOString().split('T')[0]);
    
    const customEvents = currentEvents.filter(event => {
        const eventDate = new Date(event.date + 'T00:00:00');
        return eventDate.getMonth() + 1 === month && eventDate.getFullYear() === year;
    }).map(e => ({ date: e.date, name: e.name, ministries: e.ministries }));

    // Consolidar todas as datas que precisam de escala, remover duplicatas e ordenar
    const relevantDateStrings = [...new Set([...sundayDates, ...customEvents.map(e => e.date)])];
    const relevantDates = relevantDateStrings
        .map(dateStr => new Date(dateStr + 'T00:00:00'))
        .sort((a, b) => a - b);

    if (relevantDates.length === 0) {
        outputDiv.innerHTML = `<p class="info-message">Não há domingos ou eventos especiais cadastrados para o mês de ${new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long' })}.</p>`;
        return;
    }

    // Objeto para controlar o índice do próximo membro a ser escalado para cada ministério
    const assignedMembersIndex = {};
    // Inicializa o índice para todos os ministérios cadastrados
    currentMinistries.forEach(min => assignedMembersIndex[min.id] = 0); 

    // Define um número padrão de pessoas por ministério (pode ser ajustado)
    // No futuro, isso poderia ser configurável por ministério ou por evento.
    const defaultPeoplePerMinistry = 3; // Exemplo: 3 pessoas por ministério por dia
    const peopleForLouvor = 5; // Exemplo específico para o ministério de Louvor

    for (const ministry of currentMinistries) {
        // Filtra os membros que pertencem a ESTE ministério E estão DISPONÍVEIS PARA ESCALA
        const availableMembersInThisMinistry = currentMembers.filter(member => 
            member.availableForScale && member.ministries.some(m => m.ministryId === ministry.id)
        );
        
        if (availableMembersInThisMinistry.length === 0) {
            scaleHtml += `<h4 style="color: var(--dark-blue); margin-top: var(--spacing-md);">${ministry.name}</h4>`;
            scaleHtml += `<p class="info-message">Nenhum membro disponível para escala automática no ministério de ${ministry.name}.</p>`;
            scaleTextForShare += `${ministry.name}: Nenhum membro disponível.\n\n`;
            continue;
        }

        scaleHtml += `<h4 style="color: var(--dark-blue); margin-top: var(--spacing-md);">${ministry.name}</h4>`;
        scaleTextForShare += `${ministry.name}:\n`;
        scaleHtml += `<table class="scale-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Dia da Semana</th>
                                <th>Evento</th>
                                <th>Membro(s) / Função(ões)</th>
                            </tr>
                        </thead>
                        <tbody>`;

        let ministryHasAssignments = false; // Flag para verificar se alguma atribuição foi feita para este ministério no mês

        relevantDates.forEach(date => {
            const dateString = date.toISOString().split('T')[0];
            // Procura por um evento personalizado para esta data que envolve o nome atual do ministério
            const eventForThisDayAndMinistry = customEvents.find(e => 
                e.date === dateString && e.ministries.includes(ministry.name)
            );
            
            // Só gera atribuição se for domingo OU se for um evento personalizado para este ministério
            if (date.getDay() === 0 || eventForThisDayAndMinistry) {
                let eventName = eventForThisDayAndMinistry ? eventForThisDayAndMinistry.name : "Culto de Celebração";
                
                const assignedMembersForDay = [];
                const numPeopleNeeded = (ministry.name === "Louvor") ? peopleForLouvor : defaultPeoplePerMinistry;

                const startIndex = assignedMembersIndex[ministry.id];
                // Loop para atribuir o número necessário de pessoas para o dia
                for (let i = 0; i < numPeopleNeeded; i++) {
                    if (availableMembersInThisMinistry.length > 0) {
                        const memberToAssign = availableMembersInThisMinistry[(startIndex + i) % availableMembersInThisMinistry.length];
                        
                        // Garante que o mesmo membro não seja atribuído mais de uma vez no MESMO dia para o MESMO ministério
                        // (útil se numPeopleNeeded for maior que o número de membros disponíveis)
                        if (!assignedMembersForDay.some(assigned => assigned.startsWith(memberToAssign.name))) { 
                             const memberMinistryRole = memberToAssign.ministries.find(m => m.ministryId === ministry.id);
                             
                             // ============== LÓGICA DE EXIBIÇÃO DA FUNÇÃO DO MEMBRO (REVISADA) ==============
                             const roleText = memberMinistryRole?.role;
                             let memberDisplay = memberToAssign.name;
                             
                             // Converte a função para minúsculas e remove espaços para comparação consistente
                             const normalizedRole = roleText ? roleText.trim().toLowerCase() : '';
                             
                             // SE a função FOR "líder", "vice-líder" ou "pastor", então inclui a função na exibição.
                             // Qualquer outra função NÃO SERÁ exibida ao lado do nome na escala.
                             if (normalizedRole && ['líder', 'vice-líder', 'pastor'].includes(normalizedRole)) {
                                 memberDisplay += ` (${roleText})`; // Usa o roleText original (com maiúsculas/minúsculas como cadastrado)
                             }
                             assignedMembersForDay.push(memberDisplay);
                             // ============== FIM DA LÓGICA DE EXIBIÇÃO ==============

                        } else if (availableMembersInThisMinistry.length > assignedMembersForDay.length) {
                             // Lógica para tentar pegar outro membro se o atual já foi selecionado para o dia
                             // (ocorre se numPeopleNeeded > membros_disponiveis_unicos)
                             let attemptCount = 0;
                             let nextUniqueMember = null;
                             do {
                                 const nextUniqueMemberIndex = (startIndex + i + attemptCount) % availableMembersInThisMinistry.length;
                                 nextUniqueMember = availableMembersInThisMinistry[nextUniqueMemberIndex];
                                 attemptCount++;
                             } while (assignedMembersForDay.some(assigned => assigned.startsWith(nextUniqueMember.name)) && attemptCount < availableMembersInThisMinistry.length * 2); // Evita loop infinito

                             if (nextUniqueMember && !assignedMembersForDay.some(assigned => assigned.startsWith(nextUniqueMember.name))) {
                                 const nextMemberMinistryRole = nextUniqueMember.ministries.find(m => m.ministryId === ministry.id);
                                 
                                 // ============== AQUI TAMBÉM SE APLICA A MESMA LÓGICA DE EXIBIÇÃO ==============
                                 const nextRoleText = nextMemberMinistryRole?.role;
                                 let nextMemberDisplay = nextUniqueMember.name;
                                 const nextNormalizedRole = nextRoleText ? nextRoleText.trim().toLowerCase() : '';
                                 if (nextNormalizedRole && ['líder', 'vice-líder', 'pastor'].includes(nextNormalizedRole)) {
                                     nextMemberDisplay += ` (${nextRoleText})`;
                                 }
                                 assignedMembersForDay.push(nextMemberDisplay);
                                 // ============== FIM DA LÓGICA DE EXIBIÇÃO PARA O CASO DE 'ELSE IF' ==============
                             }
                        }
                    }
                }
                // Atualiza o índice para o próximo rodízio após todos os membros do dia serem selecionados
                // O índice deve avançar pelo número de pessoas que TENTAMOS atribuir, não pelo número de pessoas atribuídas de fato
                assignedMembersIndex[ministry.id] = (assignedMembersIndex[ministry.id] + numPeopleNeeded) % availableMembersInThisMinistry.length;


                const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                const dayOfWeek = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

                const assignedNames = assignedMembersForDay.length > 0 ? assignedMembersForDay.join(', ') : 'A definir';
                
                // Adiciona atributos data- para permitir a edição pós-geração
                // data-scale-full-date para a data completa da escala
                // data-scale-ministry-id para o ministério da célula
                // data-scale-members-data para os dados dos membros atribuídos (JSON stringificado e URI-encoded)
                scaleHtml += `<tr>
                                <td>${formattedDate}</td>
                                <td>${dayOfWeek}</td>
                                <td>${eventName}</td>
                                <td class="member-cell-editable" 
                                    data-scale-full-date="${dateString}"
                                    data-scale-ministry-id="${ministry.id}" 
                                    data-scale-members-data="${encodeURIComponent(JSON.stringify(assignedMembersForDay))}">
                                    ${assignedNames}
                                </td>
                            </tr>`;
                scaleTextForShare += `- ${formattedDate} (${dayOfWeek}) - ${eventName}: ${assignedNames}\n`;
                ministryHasAssignments = true;
            }
        });

        if (!ministryHasAssignments) {
            scaleHtml += `<tr><td colspan="4" class="info-message">Nenhuma atribuição para este ministério neste mês.</td></tr>`;
            scaleTextForShare += `Nenhuma atribuição para este ministério neste mês.\n`;
        }

        scaleHtml += `</tbody></table>`;
        scaleTextForShare += `\n`;
    }

    outputDiv.innerHTML = scaleHtml;
    shareOptionsDiv.style.display = 'block';

    const scaleToSave = {
        id: generateUniqueId(),
        month: month,
        year: year,
        dateGenerated: new Date().toISOString(),
        htmlContent: scaleHtml, // Salva o HTML gerado (com os data-attributes para edição)
        textContent: scaleTextForShare
    };
    // `generatedScales` é uma variável global gerenciada por `data.js`
    let currentGeneratedScales = loadData('generatedScales');
    currentGeneratedScales.push(scaleToSave);
    saveData('generatedScales', currentGeneratedScales);

    document.getElementById('share-email').onclick = () => shareScaleByEmail(scaleTextForShare);
    document.getElementById('share-whatsapp').onclick = () => shareScaleByWhatsApp(scaleTextForShare);

    // Adiciona event listeners para as células editáveis após a escala ser renderizada
    addMemberSwapListeners(scaleToSave.id); // Passa o ID da escala para o listener
}

/**
 * Adiciona event listeners às células de membro na escala gerada para permitir a troca.
 * @param {string} scaleId - O ID da escala recém-gerada/visualizada.
 */
function addMemberSwapListeners(scaleId) {
    document.querySelectorAll('.scale-table .member-cell-editable').forEach(cell => {
        cell.addEventListener('click', (e) => {
            // Evita que o clique em um botão dentro da célula dispare a troca
            if (e.target.tagName === 'BUTTON') return; 

            const ministryId = cell.dataset.scaleMinistryId;
            const dateString = cell.dataset.scaleFullDate; // Usar data completa
            const currentMembersDisplay = decodeURIComponent(cell.dataset.scaleMembersData); // Pega a string JSON dos membros
            
            // Abre o modal de troca
            openSwapModal(scaleId, ministryId, dateString, currentMembersDisplay, cell);
        });
    });
}

/**
 * Abre o modal para trocar um membro na escala.
 * @param {string} scaleId - ID da escala no histórico.
 * @param {string} ministryId - ID do ministério da célula clicada.
 * @param {string} dateString - Data da célula clicada (YYYY-MM-DD).
 * @param {string} currentMembersDisplayJson - String JSON dos membros atualmente atribuídos.
 * @param {HTMLElement} targetCell - A célula HTML que foi clicada (para atualizar diretamente).
 */
function openSwapModal(scaleId, ministryId, dateString, currentMembersDisplayJson, targetCell) {
    const swapModal = document.getElementById('member-swap-modal');
    const swapMinistryNameElem = document.getElementById('swap-ministry-name');
    const swapEventDateElem = document.getElementById('swap-event-date');
    const swapCurrentMemberElem = document.getElementById('swap-current-member');
    const swapNewMemberSelect = document.getElementById('swap-new-member');
    const swapModalMessage = document.getElementById('swap-modal-message');

    if (!swapModal || !swapMinistryNameElem || !swapEventDateElem || !swapCurrentMemberElem || !swapNewMemberSelect || !swapModalMessage) {
        console.error("Elementos do modal de troca não encontrados.");
        return;
    }

    // Limpa mensagens anteriores
    swapModalMessage.style.display = 'none';
    swapModalMessage.classList.remove('error-message', 'success-message', 'info-message');

    // Armazena detalhes da troca para uso no confirmMemberSwap
    currentSwapDetails = {
        scaleId: scaleId,
        ministryId: ministryId,
        dateString: dateString,
        targetCell: targetCell, // Guarda a referência da célula para atualização direta
        originalMembersData: JSON.parse(currentMembersDisplayJson) // Array de strings de nomes formatados
    };

    const ministry = loadData('allMinistries').find(m => m.id === ministryId);
    if (!ministry) {
        swapModalMessage.textContent = "Ministério não encontrado.";
        swapModalMessage.style.color = 'var(--error-color)';
        swapModalMessage.style.display = 'block';
        return;
    }

    swapMinistryNameElem.textContent = ministry.name;
    swapEventDateElem.textContent = formatDate(dateString);
    swapCurrentMemberElem.innerHTML = currentSwapDetails.originalMembersData.join('<br>'); // Exibe múltiplos membros

    // Popula o seletor com membros disponíveis para este ministério
    const availableMembers = loadData('allMembers').filter(member => 
        member.availableForScale && member.ministries.some(m => m.ministryId === ministryId)
    );

    swapNewMemberSelect.innerHTML = '<option value="">-- Selecione um membro --</option>';
    if (availableMembers.length === 0) {
        swapNewMemberSelect.innerHTML += '<option value="" disabled>Nenhum membro disponível para este ministério.</option>';
    } else {
        availableMembers.sort((a, b) => a.name.localeCompare(b.name)).forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            // Exibe o nome e a função no ministério (se houver)
            const memberMinistryRole = member.ministries.find(m => m.ministryId === ministryId);
            const roleText = memberMinistryRole?.role;
            let displayOption = member.name;
            if (roleText) { // Sempre mostra a função no modal para clareza
                displayOption += ` (${roleText})`;
            }
            option.textContent = displayOption;
            option.dataset.memberName = member.name; // Armazena o nome puro
            option.dataset.memberRole = roleText || ''; // Armazena a função pura
            swapNewMemberSelect.appendChild(option);
        });
    }

    swapModal.style.display = 'flex'; // Exibe o modal
}

/**
 * Fecha o modal de troca de membro.
 */
function closeSwapModal() {
    document.getElementById('member-swap-modal').style.display = 'none';
    document.getElementById('swap-new-member').value = ''; // Limpa seleção
    document.getElementById('swap-modal-message').style.display = 'none'; // Esconde mensagem
}

/**
 * Confirma a troca de membro e atualiza a escala visível e no histórico.
 */
function confirmMemberSwap() {
    const newMemberSelect = document.getElementById('swap-new-member');
    const newMemberId = newMemberSelect.value;
    const swapModalMessage = document.getElementById('swap-modal-message');

    if (!newMemberId) {
        swapModalMessage.textContent = 'Por favor, selecione um novo membro.';
        swapModalMessage.style.color = 'var(--error-color)';
        swapModalMessage.style.display = 'block';
        return;
    }

    const { scaleId, ministryId, dateString, targetCell, originalMembersData } = currentSwapDetails;
    if (!scaleId || !ministryId || !dateString || !targetCell || !originalMembersData) {
        swapModalMessage.textContent = 'Erro interno: dados da troca incompletos.';
        swapModalMessage.style.color = 'var(--error-color)';
        swapModalMessage.style.display = 'block';
        return;
    }

    const newMemberOption = newMemberSelect.options[newMemberSelect.selectedIndex];
    const newMemberName = newMemberOption.dataset.memberName;
    const newMemberRole = newMemberOption.dataset.memberRole;

    // Formata o novo membro conforme a lógica de exibição da escala
    let newMemberFormattedDisplay = newMemberName;
    const normalizedNewRole = newMemberRole ? newMemberRole.trim().toLowerCase() : '';
    if (normalizedNewRole && ['líder', 'vice-líder', 'pastor'].includes(normalizedNewRole)) {
        newMemberFormattedDisplay += ` (${newMemberRole})`;
    }

    // Lógica para substituir o primeiro membro ou adicionar se houver espaço
    let updatedMembersForDay = [...originalMembersData]; // Copia a array original
    
    // Se a célula tinha "A definir", substitui. Senão, substitui o primeiro ou adiciona.
    if (updatedMembersForDay.length === 1 && updatedMembersForDay[0] === 'A definir') {
        updatedMembersForDay[0] = newMemberFormattedDisplay;
    } else {
        // Se já tem o novo membro, não adiciona de novo
        if (!updatedMembersForDay.includes(newMemberFormattedDisplay)) {
            // Se o número de membros é menor que o padrão, adiciona.
            // Caso contrário, substitui o primeiro membro (ou o que for mais lógico para sua regra)
            // Por simplicidade, vamos substituir o primeiro membro da lista atual.
            if (updatedMembersForDay.length < (ministryId === loadData('allMinistries').find(m => m.name === "Louvor")?.id ? 5 : 3)) { // Verifica se ainda cabe mais
                 updatedMembersForDay.push(newMemberFormattedDisplay);
            } else {
                 // Se já está cheio, substitui o primeiro membro da lista
                 updatedMembersForDay[0] = newMemberFormattedDisplay;
            }
        } else {
            swapModalMessage.textContent = 'Este membro já está atribuído para este dia.';
            swapModalMessage.style.color = 'var(--info-color)';
            swapModalMessage.style.display = 'block';
            return;
        }
    }

    // Atualiza o texto da célula visível no DOM
    targetCell.textContent = updatedMembersForDay.join(', ');
    targetCell.dataset.scaleMembersData = encodeURIComponent(JSON.stringify(updatedMembersForDay)); // Atualiza o dataset

    // --- Atualização no Histórico (Mais Robusto) ---
    // Para persistir a mudança no histórico, precisamos encontrar a escala e atualizar seu htmlContent.
    // Isso é um pouco mais complexo porque o htmlContent é uma string.
    // A melhor forma é ter uma estrutura de dados mais granular para a escala no `generatedScales`.
    // Por exemplo:
    // scaleToSave = {
    //    id: ...,
    //    assignments: [ { date: 'YYYY-MM-DD', ministryId: 'id', assigned: ['Nome (Função)', 'Nome2'] }, ... ]
    // }
    // E então, o `htmlContent` seria gerado DINAMICAMENTE ao visualizar a escala.
    //
    // Para o escopo atual, vamos fazer uma atualização "direta" no HTML salvo, mas isso pode ser frágil
    // se o HTML gerado for muito complexo ou se a célula não for facilmente identificável via regex.
    //
    // A forma mais segura para este projeto é:
    // 1. Encontrar a escala no `generatedScales`.
    // 2. Modificar a string `htmlContent` dela para refletir a mudança.

    let currentScales = loadData('generatedScales');
    const scaleToUpdateIndex = currentScales.findIndex(s => s.id === scaleId);

    if (scaleToUpdateIndex !== -1) {
        // Recria uma versão simplificada da célula para encontrar e substituir no HTML
        const oldContentRegex = new RegExp(
            `(<td[^>]*data-scale-full-date="${dateString}"[^>]*data-scale-ministry-id="${ministryId}"[^>]*data-scale-members-data="[^"]*")[^>]*>(.*?)<\/td>`, 's'
        );
        const newCellContent = updatedMembersForDay.join(', ');
        const newCellData = encodeURIComponent(JSON.stringify(updatedMembersForDay));

        // Tenta substituir a célula no HTML salvo. Isso é frágil, mas é uma solução direta.
        currentScales[scaleToUpdateIndex].htmlContent = currentScales[scaleToUpdateIndex].htmlContent.replace(
            oldContentRegex,
            `$1" data-scale-members-data="${newCellData}">${newCellContent}</td>`
        );
        // Atualiza também o textContent para compartilhamento
        currentScales[scaleToUpdateIndex].textContent = currentScales[scaleToUpdateIndex].textContent.replace(
            originalMembersData.join(', '), // Tenta encontrar a string original
            newCellContent
        );

        saveData('generatedScales', currentScales); // Salva a escala atualizada no histórico
        console.log(`Escala ${scaleId} atualizada no histórico.`);
        swapModalMessage.textContent = `Membro(s) atualizado(s) com sucesso!`;
        swapModalMessage.style.color = 'var(--success-color)';
        swapModalMessage.style.display = 'block';
    } else {
        swapModalMessage.textContent = 'Erro: Escala não encontrada no histórico para atualização.';
        swapModalMessage.style.color = 'var(--error-color)';
        swapModalMessage.style.display = 'block';
    }
    
    // Fechar modal após um pequeno atraso para o usuário ler a mensagem
    setTimeout(() => {
        closeSwapModal();
    }, 1500);
}


// ================================================================
// --- FUNÇÕES DA SEÇÃO HISTÓRICO ---
// ================================================================

/**
 * Exibe a lista de escalas geradas anteriormente na seção "Histórico".
 * As escalas são exibidas como cartões e podem ser visualizadas ou excluídas.
 */
function displayHistoryScales() {
    const historyListContainer = document.getElementById('history-list');
    const noHistoryMessage = document.getElementById('no-history-message');
    const historicalScaleView = document.getElementById('historical-scale-view');

    if (!historyListContainer) return;

    historyListContainer.innerHTML = '';
    historicalScaleView.style.display = 'none';
    if (noHistoryMessage) noHistoryMessage.style.display = 'none';

    // Carrega e ordena as escalas: as mais recentes primeiro (por data de geração)
    const currentScales = loadData('generatedScales').sort((a, b) => {
        const dateGenA = new Date(a.dateGenerated);
        const dateGenB = new Date(b.dateGenerated);
        if (dateGenB.getTime() !== dateGenA.getTime()) {
            return dateGenB - dateGenA;
        }
        const dateScaleA = new Date(a.year, a.month - 1);
        const dateScaleB = new Date(b.year, b.month - 1);
        return dateScaleB - dateScaleA;
    });

    if (currentScales.length > 0) {
        currentScales.forEach(scale => {
            const scaleCard = document.createElement('div');
            scaleCard.classList.add('history-card');
            const scaleDate = new Date(scale.year, scale.month - 1, 1);
            const formattedMonthYear = scaleDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
            
            scaleCard.innerHTML = `
                <h3>Escala de ${formattedMonthYear}</h3>
                <p>Gerada em: ${new Date(scale.dateGenerated).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                <div class="item-actions">
                    <button class="btn btn-secondary btn-sm" onclick="viewHistoricalScale('${scale.id}')">Ver Escala</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteHistoricalScale('${scale.id}')">Excluir</button>
                </div>
            `;
            historyListContainer.appendChild(scaleCard);
        });
    } else {
        if (noHistoryMessage) {
            historyListContainer.appendChild(noHistoryMessage);
            noHistoryMessage.style.display = 'block';
        }
    }
}

/**
 * Exibe o conteúdo HTML detalhado de uma escala histórica selecionada.
 * @param {string} scaleId - O ID da escala histórica a ser visualizada.
 */
function viewHistoricalScale(scaleId) {
    const currentScales = loadData('generatedScales');
    const scale = currentScales.find(s => s.id === scaleId);
    const historyListContainer = document.getElementById('history-list');
    const historicalScaleView = document.getElementById('historical-scale-view');

    if (!scale || !historyListContainer || !historicalScaleView) {
        alert('Escala não encontrada ou elementos da interface ausentes.');
        return;
    }

    historyListContainer.style.display = 'none';
    historicalScaleView.style.display = 'block';

    historicalScaleView.innerHTML = `
        ${scale.htmlContent}
        <div class="share-options" style="display: block; margin-top: var(--spacing-lg);">
            <h3>Compartilhar Escala</h3>
            <button class="btn btn-success" id="share-email-history">Enviar por Email</button>
            <button class="btn btn-success" id="share-whatsapp-history">Enviar por WhatsApp</button>
        </div>
        <button class="btn btn-secondary back-to-history" style="margin-top: var(--spacing-lg);">Voltar ao Histórico</button>
    `;

    historicalScaleView.querySelector('#share-email-history').onclick = () => shareScaleByEmail(scale.textContent);
    historicalScaleView.querySelector('#share-whatsapp-history').onclick = () => shareScaleByWhatsApp(scale.textContent);
    
    historicalScaleView.querySelector('.back-to-history').onclick = () => {
        historicalScaleView.style.display = 'none';
        historyListContainer.style.display = 'grid';
        displayHistoryScales();
    };

    // Adiciona listeners de troca de membro também para escalas visualizadas do histórico
    addMemberSwapListeners(scale.id);
}

/**
 * Exclui uma escala do histórico.
 * @param {string} scaleId - O ID da escala a ser excluída.
 */
function deleteHistoricalScale(scaleId) {
    if (confirm('Tem certeza que deseja excluir esta escala do histórico? Esta ação é irreversível.')) {
        let currentGeneratedScales = loadData('generatedScales');
        currentGeneratedScales = currentGeneratedScales.filter(scale => scale.id !== scaleId);
        saveData('generatedScales', currentGeneratedScales);

        alert('Escala excluída do histórico!');
        displayHistoryScales();
    }
}