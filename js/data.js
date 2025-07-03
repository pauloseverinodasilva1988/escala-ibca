// js/data.js

// === Funções de persistência para Eventos, Escalas, Ministérios e Membros ===
// Todos os dados são armazenados no localStorage do navegador.
// localStorage é um armazenamento de dados local e persistente no navegador do usuário.
// ATENÇÃO: Não é um banco de dados em nuvem. Os dados são específicos para cada navegador/dispositivo.

/**
 * Carrega dados de uma chave específica do localStorage.
 * @param {string} key - A chave (nome) do item no localStorage (ex: 'churchEvents').
 * @returns {Array} Uma array de objetos, ou uma array vazia se a chave não existir ou o JSON for inválido.
 */
function loadData(key) {
    try {
        const json = localStorage.getItem(key);
        return json ? JSON.parse(json) : [];
    } catch (e) {
        console.error(`Erro ao carregar dados da chave "${key}" do localStorage:`, e);
        return []; // Retorna array vazia em caso de erro para evitar quebrar a aplicação
    }
}

/**
 * Salva dados em uma chave específica do localStorage.
 * @param {string} key - A chave (nome) para o item no localStorage.
 * @param {Array} data - A array de objetos a ser salva.
 */
function saveData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Erro ao salvar dados na chave "${key}" no localStorage:`, e);
    }
}

// === Variáveis Globais para os Dados ===

// Eventos da igreja: array de objetos de evento.
// Cada evento pode ser { id, name, date, ministries[], notes }
let churchEvents = loadData('churchEvents');

// Se não houver eventos salvos no localStorage, tenta carregar do arquivo JSON padrão.
// Esta parte é crucial para o carregamento inicial de eventos.
if (churchEvents.length === 0) {
    console.log("Nenhum evento no localStorage. Tentando carregar eventos de 'calendario_anual_2025.json'...");
    
    // Usa fetch para carregar o arquivo JSON de forma assíncrona.
    // O caminho 'calendario_anual_2025.json' assume que o arquivo está na pasta raiz do projeto,
    // ao lado do index.html.
    fetch('calendario_anual_2025.json')
        .then(response => {
            // Verifica se a requisição foi bem-sucedida (status 200-299)
            if (!response.ok) {
                throw new Error(`Erro HTTP! Status: ${response.status} ao carregar o calendário JSON.`);
            }
            return response.json(); // Converte a resposta para JSON
        })
        .then(data => {
            // 'data' agora contém os eventos do seu arquivo JSON
            if (Array.isArray(data) && data.length > 0) {
                // Adiciona um ID único a cada evento importado. Isso é fundamental para edição/exclusão.
                churchEvents = data.map(event => ({ ...event, id: generateUniqueId() }));
                saveData('churchEvents', churchEvents); // Salva os eventos no localStorage
                console.log(`Sucesso: ${churchEvents.length} eventos carregados de 'calendario_anual_2025.json' e salvos no localStorage.`);
                
                // IMPORTANTE: Agora que os eventos foram carregados e salvos,
                // precisamos atualizar a UI (Dashboard, lista de eventos na Configuração).
                // As funções `displayUpcomingEvents` e `displayRegisteredEvents` estão em `escala.js`.
                // A linha abaixo chama essas funções APENAS SE elas já tiverem sido definidas.
                // Isso lida com a assincronicidade e a ordem de carregamento dos scripts.
                if (typeof displayUpcomingEvents === 'function') {
                    displayUpcomingEvents(); // Atualiza o Dashboard
                }
                if (typeof displayRegisteredEvents === 'function') {
                    displayRegisteredEvents(); // Atualiza a lista de eventos na Configuração
                }
                // Também atualiza os calendários
                if (typeof renderCalendar === 'function') {
                    renderCalendar('dashboard-calendar-grid', new Date().getFullYear(), new Date().getMonth(), 'dashboard');
                    renderCalendar('config-events-calendar-grid', new Date().getFullYear(), new Date().getMonth(), 'config-events');
                }

            } else {
                console.warn("O arquivo 'calendario_anual_2025.json' está vazio ou o formato JSON dentro dele é inválido (não é uma array).");
            }
        })
        .catch(error => {
            console.error("ERRO: Não foi possível carregar 'calendario_anual_2025.json'. Verifique o caminho ou o formato do arquivo.", error);
            console.warn("A aplicação iniciará sem eventos padrão do arquivo. Você pode cadastrar manualmente ou importar via botão.");
            // Opcional: Você pode colocar alguns eventos de fallback AQUI se o carregamento do JSON FALHAR.
            // Exemplo de fallback (se quiser ter algum evento caso o JSON não carregue)
            // churchEvents = [
            //     { id: generateUniqueId(), name: "Culto de Exemplo (Fallback)", date: "2025-07-07", ministries: ["Todos"], notes: "Evento padrão de fallback." }
            // ];
            // saveData('churchEvents', churchEvents);
            // if (typeof displayUpcomingEvents === 'function') { displayUpcomingEvents(); }
            // if (typeof displayRegisteredEvents === 'function') { displayRegisteredEvents(); }
            // if (typeof renderCalendar === 'function') { // Garante que o calendário renderize vazio
            //    renderCalendar('dashboard-calendar-grid', new Date().getFullYear(), new Date().getMonth(), 'dashboard');
            //    renderCalendar('config-events-calendar-grid', new Date().getFullYear(), new Date().getMonth(), 'config-events');
            // }
        });
}

// Escalas geradas: array de objetos de escala.
// Cada escala pode ser { id, month, year, dateGenerated, htmlContent, textContent }
let generatedScales = loadData('generatedScales');

// Ministérios: array de objetos de ministério.
// Cada ministério é: { id: 'min-abc', name: 'Nome do Ministério' }
// Será preenchida e gerenciada via interface do usuário.
let allMinistries = loadData('allMinistries');
// Se não houver ministérios (primeiro uso), preenche com alguns exemplos sugeridos.
// Estes são apenas para facilitar o primeiro uso, o usuário pode excluí-los e adicionar os seus.
if (allMinistries.length === 0) {
    const initialMinistries = [
        "Acolhimento", "Apoio à Comunidade", "Casais", "Homens", "Infantil",
        "Intercessão", "Introdução", "Louvor", "Mídia e Som", "Mulheres"
    ].map(name => ({ id: generateUniqueId(), name: name }));
    allMinistries = initialMinistries.sort((a,b) => a.name.localeCompare(b.name));
    saveData('allMinistries', allMinistries);
}

// Membros: array de objetos de membro.
// Cada membro é: { id: 'mem-xyz', name: 'Nome do Membro', availableForScale: true/false, ministries: [{ ministryId, ministryName, role }] }
// Será preenchida e gerenciada via interface do usuário.
let allMembers = loadData('allMembers');
// Exemplo de dados iniciais para membros (opcional, remova se quiser começar 100% do zero)
// Populamos apenas se não houver membros E se já houver ministérios para associar.
if (allMembers.length === 0 && allMinistries.length > 0) {
    // Tenta encontrar IDs de ministérios de exemplo para associar os membros
    const findMinistryId = (name) => allMinistries.find(m => m.name === name)?.id;

    const louvorId = findMinistryId("Louvor");
    const acolhimentoId = findMinistryId("Acolhimento");
    const midiaId = findMinistryId("Mídia e Som");

    if (louvorId && acolhimentoId && midiaId) {
        allMembers = [
            {
                id: generateUniqueId(),
                name: "João Silva",
                availableForScale: true, // Disponível para escala
                ministries: [{ ministryId: louvorId, ministryName: "Louvor", role: "Vocalista" }]
            },
            {
                id: generateUniqueId(),
                name: "Maria Santos",
                availableForScale: true,
                ministries: [{ ministryId: louvorId, ministryName: "Louvor", role: "Tecladista" }]
            },
            {
                id: generateUniqueId(),
                name: "Pedro Alves",
                availableForScale: true,
                ministries: [{ ministryId: acolhimentoId, ministryName: "Acolhimento", role: "Recepcionista" }]
            },
            {
                id: generateUniqueId(),
                name: "Ana Costa",
                availableForScale: true,
                ministries: [
                    { ministryId: louvorId, ministryName: "Louvor", role: "Backing Vocal" },
                    { ministryId: acolhimentoId, ministryName: "Acolhimento", role: "Auxiliar" }
                ]
            },
            {
                id: generateUniqueId(),
                name: "Pr. Ricardo", // Exemplo de pastor/líder indisponível para escala automática
                availableForScale: false, 
                ministries: [{ ministryId: louvorId, ministryName: "Louvor", role: "Líder/Pregador" }]
            },
            {
                id: generateUniqueId(),
                name: "Operador de Mídia 1",
                availableForScale: true,
                ministries: [{ ministryId: midiaId, ministryName: "Mídia e Som", role: "Operador de Áudio" }]
            }
        ];
        saveData('allMembers', allMembers);
    }
}


// --- Funções de Ajuda Comuns (exportadas para serem usadas por escala.js) ---

/**
 * Formata uma string de data (YYYY-MM-DD) para um formato legível em português.
 * Ex: "2025-07-06" -> "domingo, 6 de julho de 2025"
 * @param {string} dateString - A data no formato ISO
 * @returns {string} A data formatada.
 */
function formatDate(dateString) {
    // Adiciona 'T00:00:00' para garantir que a data seja interpretada em UTC ou no fuso horário local
    // de forma consistente, evitando problemas com fusos horários que podem alterar o dia.
    const date = new Date(dateString + 'T00:00:00');
    // Para garantir que o dia da semana esteja correto mesmo se o fuso horário impactar a meia-noite
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('pt-BR', options);
}

/**
 * Gera um ID único simples.
 * Usado para eventos, escalas, ministérios e membros para facilitar a manipulação.
 * @returns {string} Um ID único.
 */
function generateUniqueId() {
    return 'id-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}