import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyDdRfbb1z3uAmkQRwK0xLO0i7ouR-yaxEA",
  authDomain: "marketing-464cc.firebaseapp.com",
  projectId: "marketing-464cc",
  storageBucket: "marketing-464cc.firebasestorage.app",
  messagingSenderId: "644925828873",
  appId: "1:644925828873:web:c136cad9daf6f66f942dd8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function initializeAppData() {
  try {
    await loadEsteiraCardsFromFirestore();     // Carrega os cards da esteira
    initializeCalendar();                      // Inicializa o calendário

    // Adicione aqui outros event listeners ou inicializações, por exemplo:
    const leftButton = document.getElementById("esquerta");
    const rightButton = document.getElementById("direita");

    leftButton.removeEventListener("click", () => changeMonth(-1));
    rightButton.removeEventListener("click", () => changeMonth(1));

    leftButton.addEventListener("click", () => changeMonth(-1));
    rightButton.addEventListener("click", () => changeMonth(1));

    console.log("Aplicação inicializada com sucesso!");
  } catch (error) {
    console.error("Erro durante a inicialização:", error);
  }

  loadEventsFromFirestore();
}

document.addEventListener("DOMContentLoaded", initializeAppData);



// Funções Firebase

async function addEventToFirestore(date, title, description, type) {
  try {
    const { icon, color } = eventTypes[type] || { icon: "event", color: "#000000" };

    const docRef = await addDoc(collection(db, "events"), {
      date,
      title,
      description,
      type,
      color // Salva a cor no Firestore
    });

    console.log("Evento adicionado ao Firestore com ID:", docRef.id);
  } catch (error) {
    console.error("Erro ao adicionar evento ao Firestore:", error);
  }
}


async function deleteEventFromFirestore(eventId) {
  try {
    await deleteDoc(doc(db, "events", eventId));
    console.log("Evento excluído com sucesso:", eventId);
  } catch (error) {
    console.error("Erro ao excluir evento do Firestore:", error);
  }
}


async function loadEventsFromFirestore() {
  try {
    // Limpar os eventos previamente carregados
    Object.keys(events).forEach(key => delete events[key]);

    const querySnapshot = await getDocs(collection(db, "events"));
    querySnapshot.forEach((doc) => {
      const eventData = doc.data();
      const { date, title, description, type } = eventData;

      if (!events[date]) events[date] = [];
      const { icon, color } = eventTypes[type] || {};
      events[date].push({
        id: doc.id,
        title,
        description,
        type,
        icon: icon || "event",
        color: color || "#000000",
      });
    });

    generateCalendar(currentMonth, currentYear);
  } catch (error) {
    console.error("Erro ao carregar eventos do Firestore:", error);
  }
  
}

document.addEventListener("DOMContentLoaded", () => {
  // Mapeamento dos links do menu para as respectivas seções
  const menuLinks = {
    "dashboard-link": "Calendario-section",
    "despesas-link": "assinaturas-section",
    "esteira-link": "esteira-section", // Adicionado para a sessão Esteira
    "configuracoes-link": "configuracoes-section",
  };

  // Adiciona evento de clique para cada link do menu
  Object.keys(menuLinks).forEach((linkId) => {
    const linkElement = document.getElementById(linkId);
    if (linkElement) {
      linkElement.addEventListener("click", (e) => {
        e.preventDefault();

        // Esconde todas as seções
        document.querySelectorAll(".tab-content").forEach((section) => {
          section.style.display = "none";
        });

        // Mostra a seção correspondente ao link clicado
        const sectionToShow = document.getElementById(menuLinks[linkId]);
        if (sectionToShow) {
          sectionToShow.style.display = "block";
        }

        // Atualiza a classe ativa no menu
        document.querySelectorAll(".sidebar a").forEach((link) => {
          link.classList.remove("active");
        });
        linkElement.classList.add("active");
      });
    }
  });
});


// ----------------------
// FUNÇÃO: Abrir modal de adicionar card na Esteira
// ----------------------
document.querySelectorAll('.esteira-column').forEach(column => {
  column.addEventListener('dragover', (e) => {
    e.preventDefault();
    column.classList.add('drag-over');
  });
  column.addEventListener('dragleave', () => {
    column.classList.remove('drag-over');
  });
});


// ----------------------
// FUNÇÃO: Fechar modal de adicionar card
// ----------------------
document.getElementById('close-add-card-modal').addEventListener('click', () => {
  document.getElementById('add-card-modal').classList.remove('show');
});

// ----------------------
// FUNÇÃO: Submeter novo card via modal
// ----------------------

// ----------------------
// FUNÇÕES: Drag & Drop dos Cards
// ----------------------
function handleDragStart(e) {
  e.dataTransfer.setData('text/plain', e.target.id);
  e.dataTransfer.effectAllowed = 'move';
  e.target.classList.add('dragging');
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
}



// Adiciona eventos de dragover, dragleave e drop para cada coluna da esteira
document.querySelectorAll('.esteira-column').forEach(column => {
  column.addEventListener('drop', async (e) => {
    e.preventDefault();
    column.classList.remove('drag-over');
    // Obtém o ID do elemento (usado para identificar o card no DOM)
    const elementId = e.dataTransfer.getData('text/plain');
    const card = document.getElementById(elementId);
    if (card) {
      // Move o card para o container .cards da coluna alvo
      const cardsContainer = column.querySelector('.cards');
      cardsContainer.appendChild(card);
      
      // Obtém o nome da nova coluna a partir do header da coluna
      const newColumn = column.querySelector('header').textContent.trim();
      
      // Se quiser salvar também a ordem (posição) do card dentro da coluna:
      const order = Array.from(cardsContainer.children).indexOf(card);
      
      // Use o Firestore ID armazenado no dataset do card
      const firestoreId = card.dataset.cardId;
      if (firestoreId) {
        await updateCardInFirestore(firestoreId, { column: newColumn, order });
      } else {
        console.error("Firestore ID não encontrado no dataset do card", card);
      }
    }
  });
});


// Função para abrir o modal de edição de card
function openEditCardModal(card) {
  const modal = document.getElementById('edit-card-modal');
  // Use o Firestore ID armazenado no dataset do card
  modal.dataset.cardId = card.dataset.cardId;
  // Extrai o título e a descrição do card (assumindo que o título esteja em <strong> e a descrição em <p>)
  const title = card.querySelector('strong') ? card.querySelector('strong').textContent : '';
  const description = card.querySelector('p') ? card.querySelector('p').textContent : '';
  document.getElementById('edit-card-title').value = title;
  document.getElementById('edit-card-description').value = description;
  modal.classList.add('show');
}


// Event listener para fechar o modal de edição de card
document.getElementById('close-edit-card-modal').addEventListener('click', () => {
  document.getElementById('edit-card-modal').classList.remove('show');
});

// Event listener para o formulário de edição de card
document.getElementById('edit-card-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const modal = document.getElementById('edit-card-modal');
  const cardId = modal.dataset.cardId;
  const title = document.getElementById('edit-card-title').value;
  const description = document.getElementById('edit-card-description').value;

  // Atualiza o conteúdo do card na interface
  const card = document.querySelector(`[data-card-id="${cardId}"]`);

  if (card) {
    card.innerHTML = `<strong>${title}</strong>${description ? `<p>${description}</p>` : ''}`;
    // Reanexa os event listeners para drag & drop e clique
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    card.addEventListener('click', (e) => {
      if (!card.classList.contains('dragging')) {
        openEditCardModal(card);
      }
    });
  }
  
  // Atualiza os dados no Firestore
  await updateCardInFirestore(cardId, { title, description });
  
  modal.classList.remove('show');
});


// Adiciona um novo card na coleção "esteiraCards"
async function addCardToFirestore(column, title, description) {
  try {
    // Usamos o timestamp para gerar uma ordem (você pode ajustar conforme necessário)
    const order = Date.now();
    const docRef = await addDoc(collection(db, "esteiraCards"), {
      column, title, description,
      order,
      createdAt: new Date()
    });
    console.log("Card adicionado ao Firestore com ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Erro ao adicionar card ao Firestore:", error);
  }
}

// Atualiza os dados de um card (quando editado ou movido)
async function updateCardInFirestore(cardId, newData) {
  try {
    const cardRef = doc(db, "esteiraCards", cardId);
    await updateDoc(cardRef, newData);
    console.log("Card atualizado:", cardId);
  } catch (error) {
    console.error("Erro ao atualizar card no Firestore:", error);
  }
}

document.querySelectorAll('.esteira-column .add-card').forEach(button => {
  button.addEventListener('click', (e) => {
    // Obtém o container da coluna (pai do botão)
    const columnElement = e.target.closest('.esteira-column');
    if (!columnElement) return;
    // Pega o texto do header que indica o nome da coluna
    const columnHeader = columnElement.querySelector('header').textContent.trim();
    // Seleciona o modal de adicionar card e seta o dataset com a coluna
    const modal = document.getElementById('add-card-modal');
    modal.dataset.column = columnHeader;
    modal.classList.add('show');
  });
});


// Carrega os cards da coleção "esteiraCards" e os insere nas respectivas colunas
async function loadEsteiraCardsFromFirestore() {
  try {
    // Limpa os cards atuais nas colunas
    document.querySelectorAll('.esteira-column .cards').forEach(cardsContainer => {
      cardsContainer.innerHTML = "";
    });

    const querySnapshot = await getDocs(collection(db, "esteiraCards"));
    querySnapshot.forEach((docSnap) => {
      const cardData = docSnap.data();
      // Cria um card com os dados carregados e define o Firestore ID no dataset
      const card = createCardElement(cardData.title, cardData.description);
      card.dataset.cardId = docSnap.id;
      // Insere o card na coluna correspondente
      document.querySelectorAll('.esteira-column').forEach(col => {
        if (col.querySelector('header').textContent.trim() === cardData.column) {
          col.querySelector('.cards').appendChild(card);
        }
      });
    });
  } catch (error) {
    console.error("Erro ao carregar cards da esteira do Firestore:", error);
  }
}


// Exemplo de como adicionar o event listener de duplo clique ao criar um novo card
function createCardElement(title, description) {
  const card = document.createElement('div');
  card.classList.add('card');
  card.draggable = true;
  card.id = 'card-' + Date.now(); // Gera um ID único para o DOM (o Firestore ID virá do dataset)

  // Cria um container para o conteúdo do card
  const cardContent = document.createElement('div');
  cardContent.classList.add('card-content');
  cardContent.innerHTML = `<strong>${title}</strong>${description ? `<p>${description}</p>` : ''}`;

  // Adiciona somente o conteúdo ao card
  card.appendChild(cardContent);

  // Adiciona os event listeners para drag & drop
  card.addEventListener('dragstart', handleDragStart);
  card.addEventListener('dragend', handleDragEnd);

  // Ao clicar, abre o modal de edição (caso não esteja sendo arrastado)
  card.addEventListener('click', (e) => {
    if (!card.classList.contains('dragging')) {
      openEditCardModal(card);
    }
  });

  return card;
}


async function removeCard(card) {
  const firestoreId = card.dataset.cardId;
  if (!firestoreId) {
    console.error("Firestore ID não encontrado para remoção.");
    return;
  }
  try {
    await deleteCardFromFirestore(firestoreId);
    card.remove();
  } catch (error) {
    console.error("Erro ao remover card:", error);
  }
}

async function deleteCardFromFirestore(cardId) {
  try {
    await deleteDoc(doc(db, "esteiraCards", cardId));
    console.log("Card removido com sucesso:", cardId);
  } catch (error) {
    console.error("Erro ao remover card do Firestore:", error);
  }
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.card:not(.dragging):not(.placeholder)')];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - (box.top + box.height / 2);
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

document.querySelectorAll('.esteira-column').forEach(column => {
  column.addEventListener('dragover', handleColumnDragOver);
  column.addEventListener('dragleave', handleColumnDragLeave);
  column.addEventListener('drop', handleColumnDrop);
});

function handleColumnDragOver(e) {
  e.preventDefault();
  const column = e.currentTarget;
  const container = column.querySelector('.cards');

  let placeholder = container.querySelector('.placeholder');
  const draggingCard = document.querySelector('.card.dragging');

  if (!placeholder && draggingCard) {
    placeholder = document.createElement('div');
    placeholder.classList.add('placeholder');
    placeholder.style.height = draggingCard.offsetHeight + 'px';
    container.appendChild(placeholder);
  }

  // Obtenha as dimensões do container
  const containerRect = container.getBoundingClientRect();

  if (e.clientY < containerRect.top) {
    container.insertBefore(placeholder, container.firstChild);
  } else if (e.clientY > containerRect.bottom) {
    container.appendChild(placeholder);
  } else {
    const afterElement = getDragAfterElement(container, e.clientY);
    if (!afterElement) {
      container.appendChild(placeholder);
    } else {
      container.insertBefore(placeholder, afterElement);
    }
  }
}

function handleColumnDragLeave(e) {
  // Verifica se o cursor ainda está na coluna
  const relatedTarget = e.relatedTarget;
  const column = e.currentTarget;
  if (relatedTarget && column.contains(relatedTarget)) {
    return;
  }

  const container = column.querySelector('.cards');
  const placeholder = container.querySelector('.placeholder');
  if (placeholder) {
    placeholder.remove();
  }
}

function handleColumnDrop(e) {
  e.preventDefault();
  const column = e.currentTarget;
  const container = column.querySelector('.cards');

  const placeholder = container.querySelector('.placeholder');
  const elementId = e.dataTransfer.getData('text/plain');
  const card = document.getElementById(elementId);

  if (card) {
    if (placeholder) {
      container.insertBefore(card, placeholder);
      placeholder.remove();
    } else {
      container.appendChild(card);
    }
  }

  // Atualize a ordem do card no Firestore (opcional)
  const order = Array.from(container.children).indexOf(card);
  const firestoreId = card.dataset.cardId;
  if (firestoreId) {
    updateCardInFirestore(firestoreId, { order });
  }
}


// Handler para o dragover no container (.cards)
function handleDragOverContainer(e) {
  e.preventDefault();
  const container = e.currentTarget;
  let placeholder = container.querySelector('.placeholder');

  // Se não existir um placeholder, crie-o e defina sua altura igual ao do card sendo arrastado
  const draggingCard = document.querySelector('.card.dragging');
  if (!placeholder && draggingCard) {
    placeholder = document.createElement('div');
    placeholder.classList.add('placeholder');
    placeholder.style.height = draggingCard.offsetHeight + 'px';
  }

  // Calcula onde inserir o placeholder com base na posição vertical do cursor
  const afterElement = getDragAfterElement(container, e.clientY);
  if (!afterElement) {
    container.appendChild(placeholder);
  } else {
    container.insertBefore(placeholder, afterElement);
  }
}

// Handler para remover o placeholder ao sair do container
function handleDragLeaveContainer(e) {
  const container = e.currentTarget;
  const placeholder = container.querySelector('.placeholder');
  if (placeholder) {
    placeholder.remove();
  }
}

// Registre os event listeners nos containers de cards
document.querySelectorAll('.cards').forEach(container => {
  container.addEventListener('dragover', handleDragOverContainer);
  container.addEventListener('dragleave', handleDragLeaveContainer);
  
  container.addEventListener('drop', async (e) => {
    e.preventDefault();
    const container = e.currentTarget;
    const placeholder = container.querySelector('.placeholder');
    
    // Remove o placeholder e insere o card no local dele
    if (placeholder) {
      placeholder.remove();
    }
    
    const elementId = e.dataTransfer.getData('text/plain');
    const card = document.getElementById(elementId);
    if (card) {
      // Se houver um placeholder (caso ainda exista), insira o card antes dele;
      // Caso contrário, insira no final
      if (placeholder && container.contains(placeholder)) {
        container.insertBefore(card, placeholder);
      } else {
        container.appendChild(card);
      }
      
      // Atualize a posição (order) se necessário
      const order = Array.from(container.children).indexOf(card);
      const firestoreId = card.dataset.cardId;
      if (firestoreId) {
        await updateCardInFirestore(firestoreId, { order });
      }
    }
  });
});


// Exemplo de utilização no formulário de adicionar card
document.getElementById('add-card-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const modal = document.getElementById('add-card-modal');
  const column = modal.dataset.column; // Nome da coluna selecionada (ex: "A Fazer", "Em Andamento", "Concluído")
  const title = document.getElementById('card-title').value;
  const description = document.getElementById('card-description').value;
  
  // Adiciona o card ao Firestore e obtém o ID
  const cardId = await addCardToFirestore(column, title, description);
  
  // Cria o novo card utilizando a função criada e atribui o Firestore ID
  const card = createCardElement(title, description);
  card.dataset.cardId = cardId;
  
  // Insere o card na coluna correta
  document.querySelectorAll('.esteira-column').forEach(col => {
    if (col.querySelector('header').textContent.trim() === column) {
      col.querySelector('.cards').appendChild(card);
    }
  });
  
  // Limpa o formulário e fecha o modal
  document.getElementById('add-card-form').reset();
  modal.classList.remove('show');
});



// Objeto para armazenar os eventos
const events = {};

const eventTypes = {
  meeting: { icon: "groups", color: "#007bff" }, // Azul
  recording: { icon: "videocam", color: "#6f42c1" }, // Roxo
  event: { icon: "event", color: "#dc3545" }, // Vermelho
  training: { icon: "school", color: "#28a745" }, // Verde
  birthday: { icon: "cake", color: "#ffc107" }, // Amarelo
  special_day: { icon: "star", color: "#17a2b8" }, // Ciano
};


// Variáveis globais para o mês e ano atualmente exibidos
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function changeMonth(direction) {
  // Ajusta o mês atual
  currentMonth += direction;

  // Corrige valores fora do intervalo 0-11
  if (currentMonth < 0) {
    currentMonth = 11; // Dezembro
    currentYear -= 1;  // Reduz o ano
  } else if (currentMonth > 11) {
    currentMonth = 0;  // Janeiro
    currentYear += 1;  // Incrementa o ano
  }

  console.log(`Mês atual: ${currentMonth}, Ano atual: ${currentYear}`);

  // Atualiza o texto do campo de data
  updateDateInput(currentMonth, currentYear);

  // Recarrega os eventos e rege o calendário
  loadEventsFromFirestore().then(() => {
    generateCalendar(currentMonth, currentYear);
  });
}

function updateDateInput(month, year) {
  const dateInput = document.getElementById("dashboard-date-range-1");
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  dateInput.value = `${monthNames[month]} ${year}`;
}

function initializeCalendar() {
  const dateInput = document.getElementById("dashboard-date-range-1");

  // Define o valor inicial do campo de data para o mês e ano atuais
  const today = new Date();
  currentMonth = today.getMonth();
  currentYear = today.getFullYear();
  updateDateInput(currentMonth, currentYear);

  flatpickr(dateInput, {
    locale: "pt",
    plugins: [
      new monthSelectPlugin({
        shorthand: true,
        dateFormat: "F Y",
        altFormat: "F Y",
      }),
    ],
    onChange: async (selectedDates) => {
      if (selectedDates.length > 0) {
        const selectedDate = selectedDates[0];
        currentMonth = selectedDate.getMonth(); // Atualiza o mês atual
        currentYear = selectedDate.getFullYear(); // Atualiza o ano atual

        await loadEventsFromFirestore(); // Recarrega eventos do Firestore
        generateCalendar(currentMonth, currentYear); // Regera o calendário
      }
    },
  });

  generateCalendar(currentMonth, currentYear);
}

function generateCalendar(month, year) {
  const calendarTable = document.querySelector("#calendario-section table");
  calendarTable.innerHTML = "";

  const diasDaSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  diasDaSemana.forEach((dia) => {
    const th = document.createElement("th");
    th.textContent = dia;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  calendarTable.appendChild(thead);

  const tbody = document.createElement("tbody");
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let day = 1;

  const today = new Date();

  for (let i = 0; i < 6; i++) {
    const row = document.createElement("tr");

    for (let j = 0; j < 7; j++) {
      const cell = document.createElement("td");

      if (i === 0 && j < firstDay) {
        cell.textContent = "";
      } else if (day > daysInMonth) {
        cell.textContent = "";
      } else {
        const currentDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const dayText = document.createElement("span");
        dayText.textContent = day;
        cell.appendChild(dayText);

        const eventList = document.createElement("ul");
        eventList.classList.add("event-list");

        // Verificar se há eventos na data atual
        if (events[currentDate]) {
          events[currentDate].forEach((event, index) => {
            const listItem = document.createElement("li");
            listItem.style.backgroundColor = event.color; // Aplica cor do evento
        
            // Adicionar ícone e título ao item
            const icon = document.createElement("span");
            icon.className = "material-icons";
            icon.textContent = event.icon;
            icon.style.marginRight = "5px";
        
            listItem.appendChild(icon);
            listItem.appendChild(document.createTextNode(event.title));
        
            // **Impede que abrir evento acione o modal de adicionar evento**
            listItem.addEventListener("click", (e) => {
              e.stopPropagation(); // Bloqueia a propagação do clique no dia
              console.log("Editando evento:", event.title);
              openEditEventModal(currentDate, index);
            });

            eventList.appendChild(listItem);
          });
        }

        cell.appendChild(eventList);

        // Verificar se o dia é o dia atual
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
          cell.classList.add("current-day");
        }

        // Evento de clique no dia para adicionar evento (Somente se não clicar em um evento)
        cell.addEventListener("click", ((currentDay, currentMonth, currentYear) => (e) => {
          if (!e.target.classList.contains("event-list")) { // Verifica se não está clicando em um evento
            openAddEventModal(currentDay, currentMonth, currentYear);
          }
        })(day, month, year));

        day++;
      }

      row.appendChild(cell);
    }

    tbody.appendChild(row);

    if (day > daysInMonth) break;
  }

  calendarTable.appendChild(tbody);
}


document.addEventListener('DOMContentLoaded', () => {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth(); // Janeiro é 0!
  const year = today.getFullYear();

  document.querySelectorAll('#calendario-section table tbody td').forEach(td => {
    if (td.classList.contains("current-day")) {
      console.log("Dia atual destacado com classe 'current-day':", td);
    }
  });
  
});


function openAddEventModal(day, month, year) {
  const modal = document.getElementById("add-event-modal");
  const eventListContainer = document.getElementById("event-list-container");
  const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  modal.dataset.selectedDate = date;
  modal.classList.add("show");

  // Limpa a lista de eventos anteriores no modal
  eventListContainer.innerHTML = "";
}

function openEditEventModal(date, index) {
  const event = events[date] ? events[date][index] : null;

  if (!event) {
    console.error("Erro: Evento não encontrado.");
    return;
  }

  // Buscar elementos do modal de edição
  const modal = document.getElementById("edit-event-modal");
  const titleInput = document.getElementById("edit-event-title");
  const descriptionInput = document.getElementById("edit-event-description");
  const typeInput = document.getElementById("edit-event-type");
  const eventIdInput = document.getElementById("edit-event-id");
  const eventDateInput = document.getElementById("edit-event-date");
  const deleteButton = document.getElementById("delete-event-button");

  if (!modal || !titleInput || !descriptionInput || !typeInput || !eventIdInput || !eventDateInput || !deleteButton) {
    console.error("Erro: Um ou mais elementos do modal de edição não foram encontrados.");
    return;
  }

  // Preencher os campos do modal de edição
  titleInput.value = event.title || "";
  descriptionInput.value = event.description || "";
  typeInput.value = event.type || "";
  eventIdInput.value = event.id || "";
  eventDateInput.value = date || "";

  // Adiciona evento ao botão de exclusão
  deleteButton.onclick = () => deleteEvent(date, index);

  // Exibir o modal de edição
  modal.classList.add("show");
}

async function deleteEvent(date, index) {
  const eventId = events[date][index].id; // Obtém o ID do evento do Firestore

  if (!eventId) {
    console.error("Erro: ID do evento não encontrado.");
    return;
  }

  try {
    // Exclui do Firestore
    await deleteDoc(doc(db, "events", eventId));

    console.log("Evento excluído:", eventId);

    // Remove localmente
    events[date].splice(index, 1);
    if (events[date].length === 0) {
      delete events[date];
    }

    // Fecha o modal de edição
    document.getElementById("edit-event-modal").classList.remove("show");

    // Atualiza o calendário
    const [year, month] = date.split("-").map(Number);
    generateCalendar(month - 1, year);

  } catch (error) {
    console.error("Erro ao excluir evento:", error);
  }
}

document.getElementById("edit-event-form").addEventListener("submit", async (e) => {
  e.preventDefault(); // Impede o comportamento padrão do formulário

  const modal = document.getElementById("edit-event-modal");
  const eventId = document.getElementById("edit-event-id").value;
  const date = document.getElementById("edit-event-date").value;
  const title = document.getElementById("edit-event-title").value;
  const description = document.getElementById("edit-event-description").value;
  const type = document.getElementById("edit-event-type").value;

  if (!eventId || !date || !title || !type) {
    console.error("Erro: ID, Data, Título e Tipo são obrigatórios.");
    return;
  }

  // Recupera a cor e ícone do evento atualizado
  const { icon, color } = eventTypes[type] || { icon: "event", color: "#000000" };

  try {
    // Atualiza o evento no Firestore
    const eventRef = doc(db, "events", eventId);
    await updateDoc(eventRef, { title, description, type, color });

    console.log("Evento atualizado:", eventId);

    // Atualiza os dados localmente
    const eventIndex = events[date].findIndex(event => event.id === eventId);
    if (eventIndex !== -1) {
      events[date][eventIndex] = { id: eventId, title, description, type, icon, color };
    }

    // Fecha modal e reseta formulário
    modal.classList.remove("show");
    e.target.reset();

    // Atualiza o calendário sem apagar eventos antigos
    generateCalendar(currentMonth, currentYear);

  } catch (error) {
    console.error("Erro ao atualizar evento:", error);
  }
});

document.getElementById("close-edit-event-modal").addEventListener("click", () => {
  document.getElementById("edit-event-modal").classList.remove("show");
});


// Fecha o modal
document.getElementById("close-event-modal").addEventListener("click", () => {
  document.getElementById("add-event-modal").classList.remove("show");
});

// Adiciona evento ao dia selecionado
document.getElementById("add-event-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const modal = document.getElementById("add-event-modal");
  const date = modal.dataset.selectedDate; // Obtém a data do modal
  const title = document.getElementById("event-title").value;
  const description = document.getElementById("event-description").value;
  const type = document.getElementById("event-type").value;

  if (!date || !title || !type) {
    console.error("Erro: Data, título e tipo são obrigatórios.");
    return;
  }

  // Recupera a cor e ícone do evento
  const { icon, color } = eventTypes[type] || { icon: "event", color: "#000000" };

  try {
    // Adiciona evento ao Firestore
    const docRef = await addDoc(collection(db, "events"), {
      date,
      title,
      description,
      type,
      color
    });

    console.log("Evento adicionado ao Firestore com ID:", docRef.id);

    // Atualiza eventos localmente
    if (!events[date]) events[date] = [];
    events[date].push({
      id: docRef.id,
      title,
      description,
      type,
      icon,
      color
    });

    // Fecha modal e reseta formulário
    modal.classList.remove("show");
    e.target.reset();

    // Atualizar calendário sem apagar eventos antigos
    loadEventsFromFirestore().then(() => {
      generateCalendar(currentMonth, currentYear);
    });

  } catch (error) {
    console.error("Erro ao adicionar evento:", error);
  }
});


// ASSINATURAS

const assinaturas = [
  { titulo: "Assinatura Padrão", img: "/images/DANILO (2).png" },
  { titulo: "Assinatura Premium", img: "/images/PREMIUM.png" },
  { titulo: "Assinatura VIP", img: "/images/VIP.png" }
];

let assinaturaIndex = 0;

const titulo = document.getElementById("assinatura-titulo");
const imagem = document.getElementById("assinatura-img");

document.getElementById("prev-assinatura").addEventListener("click", () => {
  assinaturaIndex = (assinaturaIndex - 1 + assinaturas.length) % assinaturas.length;
  atualizarAssinatura();
});

document.getElementById("next-assinatura").addEventListener("click", () => {
  assinaturaIndex = (assinaturaIndex + 1) % assinaturas.length;
  atualizarAssinatura();
});

function atualizarAssinatura() {
  titulo.textContent = assinaturas[assinaturaIndex].titulo;
  imagem.src = assinaturas[assinaturaIndex].img;
}

document.getElementById('delete-card-button').addEventListener('click', async (e) => {
  const modal = document.getElementById('edit-card-modal');
  const firestoreId = modal.dataset.cardId;
  if (!firestoreId) {
    console.error("ID do card não encontrado.");
    return;
  }
  try {
    // Remove o documento do Firestore
    await deleteCardFromFirestore(firestoreId);
    // Remove o card da interface usando o atributo data-card-id
    const card = document.querySelector(`[data-card-id="${firestoreId}"]`);
    if (card) {
      card.remove();
    }
    // Fecha o modal
    modal.classList.remove('show');
  } catch (error) {
    console.error("Erro ao excluir card:", error);
  }
});

