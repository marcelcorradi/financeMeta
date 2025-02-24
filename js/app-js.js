// Inicialização do aplicativo
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

// Função para inicializar o aplicativo
function initializeApp() {
  // Inicializar componentes do Materialize
  initializeMaterialize();
  
  // Inicializar banco de dados
  initDB().then(() => {
    // Carregar dados
    loadDashboard();
    loadGoals();
    
    // Registrar event listeners
    registerEventListeners();
  }).catch(err => {
    console.error('Erro ao inicializar o banco de dados:', err);
    M.toast({html: 'Erro ao inicializar o aplicativo. Tente novamente.', classes: 'red'});
  });
  
  // Registrar o service worker para PWA
  registerServiceWorker();
}

// Inicializar componentes do Materialize
function initializeMaterialize() {
  // Inicializar sidenav
  const sidenav = document.querySelectorAll('.sidenav');
  M.Sidenav.init(sidenav);
  
  // Inicializar selects
  const selects = document.querySelectorAll('select');
  M.FormSelect.init(selects);
  
  // Inicializar modals
  const modals = document.querySelectorAll('.modal');
  M.Modal.init(modals);
  
  // Inicializar tooltips
  const tooltips = document.querySelectorAll('.tooltipped');
  M.Tooltip.init(tooltips);
}

// Registrar o service worker para PWA
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('Service Worker registrado com sucesso:', reg);
      }).catch(err => {
        console.log('Registro do Service Worker falhou:', err);
      });
  }
}

// Registrar event listeners
function registerEventListeners() {
  // Event listener para adicionar nova meta
  const addGoalForm = document.getElementById('add-goal-form');
  if (addGoalForm) {
    addGoalForm.addEventListener('submit', handleAddGoal);
  }
  
  // Event listeners para filtros
  const filterCategory = document.getElementById('filter-category');
  const filterPriority = document.getElementById('filter-priority');
  const filterStatus = document.getElementById('filter-status');
  
  if (filterCategory) {
    filterCategory.addEventListener('change', applyFilters);
  }
  
  if (filterPriority) {
    filterPriority.addEventListener('change', applyFilters);
  }
  
  if (filterStatus) {
    filterStatus.addEventListener('change', applyFilters);
  }
  
  // Event listener para salvar depósito
  const saveDepositBtn = document.getElementById('save-deposit');
  if (saveDepositBtn) {
    saveDepositBtn.addEventListener('click', handleSaveDeposit);
  }
}

// Função para adicionar nova meta
function handleAddGoal(e) {
  e.preventDefault();
  
  // Obter valores do formulário
  const name = document.getElementById('goal_name').value;
  const category = document.getElementById('goal_category').value;
  const amount = parseFloat(document.getElementById('goal_amount').value);
  const date = document.getElementById('goal_date').value;
  const initialAmount = parseFloat(document.getElementById('initial_amount').value) || 0;
  const priority = document.getElementById('goal_priority').value;
  const color = document.getElementById('goal_color').value;
  const notes = document.getElementById('goal_notes').value;
  
  // Validar campos obrigatórios
  if (!name || !category || !amount) {
    M.toast({html: 'Por favor, preencha todos os campos obrigatórios.', classes: 'red'});
    return;
  }
  
  // Criar objeto da meta
  const goal = {
    id: generateId(),
    name,
    category,
    amount,
    deadline: date || null,
    initialAmount,
    currentAmount: initialAmount,
    priority,
    color,
    notes,
    createdAt: new Date().toISOString(),
    isCompleted: false,
    deposits: initialAmount > 0 ? [{
      id: generateId(),
      date: new Date().toISOString(),
      amount: initialAmount,
      notes: 'Valor inicial'
    }] : []
  };
  
  // Salvar meta no banco de dados
  saveGoal(goal).then(() => {
    M.toast({html: 'Meta adicionada com sucesso!', classes: 'green'});
    // Redirecionar para página de metas
    window.location.href = 'goals.html';
  }).catch(err => {
    console.error('Erro ao salvar meta:', err);
    M.toast({html: 'Erro ao salvar meta. Tente novamente.', classes: 'red'});
  });
}

// Função para salvar depósito
function handleSaveDeposit() {
  // Obter valores do formulário
  const goalId = document.getElementById('deposit-goal-id').value;
  const amount = parseFloat(document.getElementById('deposit-amount').value);
  const date = document.getElementById('deposit-date').value;
  const notes = document.getElementById('deposit-notes').value;
  
  // Validar campos obrigatórios
  if (!goalId || !amount || !date) {
    M.toast({html: 'Por favor, preencha todos os campos obrigatórios.', classes: 'red'});
    return;
  }
  
  // Criar objeto do depósito
  const deposit = {
    id: generateId(),
    date: new Date(date).toISOString(),
    amount,
    notes
  };
  
  // Adicionar depósito à meta
  addDeposit(goalId, deposit).then(() => {
    M.toast({html: 'Depósito adicionado com sucesso!', classes: 'green'});
    // Fechar modal
    const modal = M.Modal.getInstance(document.getElementById('deposit-modal'));
    modal.close();
    // Recarregar dados
    loadGoals();
    loadDashboard();
  }).catch(err => {
    console.error('Erro ao adicionar depósito:', err);
    M.toast({html: 'Erro ao adicionar depósito. Tente novamente.', classes: 'red'});
  });
}

// Função para aplicar filtros
function applyFilters() {
  const categoryFilter = document.getElementById('filter-category').value;
  const priorityFilter = document.getElementById('filter-priority').value;
  const statusFilter = document.getElementById('filter-status').value;
  
  // Recarregar metas com filtros
  loadGoals(categoryFilter, priorityFilter, statusFilter);
}

// Função para gerar ID único
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Função para formatar moeda
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Função para formatar data
function formatDate(dateString) {
  if (!dateString) return 'Sem data';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

// Função para calcular progresso
function calculateProgress(current, target) {
  return Math.min(Math.round((current / target) * 100), 100);
}

// Função para calcular valor mensal necessário
function calculateMonthlyNeeded(goal) {
  if (!goal.deadline) return null;
  
  const today = new Date();
  const deadline = new Date(goal.deadline);
  const monthsLeft = Math.max(
    0,
    (deadline.getFullYear() - today.getFullYear()) * 12 + 
    (deadline.getMonth() - today.getMonth())
  );
  
  if (monthsLeft === 0) return goal.amount - goal.currentAmount;
  
  return (goal.amount - goal.currentAmount) / monthsLeft;
}

// Função para calcular dias restantes
function calculateDaysLeft(deadline) {
  if (!deadline) return null;
  
  const today = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}
