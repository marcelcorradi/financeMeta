// Carregar o dashboard
function loadDashboard() {
  // Verificar se estamos na página do dashboard
  const totalGoalsAmountEl = document.getElementById('total-goals-amount');
  const totalSavedAmountEl = document.getElementById('total-saved-amount');
  const totalRemainingAmountEl = document.getElementById('total-remaining-amount');
  const goalsHighlightsEl = document.getElementById('goals-highlights');
  
  if (!totalGoalsAmountEl || !totalSavedAmountEl || !totalRemainingAmountEl) {
    return; // Não estamos na página do dashboard
  }
  
  // Obter resumo das metas
  getGoalsSummary().then(summary => {
    // Atualizar valores no dashboard
    totalGoalsAmountEl.textContent = formatCurrency(summary.totalGoalsAmount);
    totalSavedAmountEl.textContent = formatCurrency(summary.totalSavedAmount);
    totalRemainingAmountEl.textContent = formatCurrency(summary.totalRemainingAmount);
    
    // Limpar área de destaques
    if (goalsHighlightsEl) {
      goalsHighlightsEl.innerHTML = '';
      
      // Obter todas as metas
      return getAllGoals();
    }
  }).then(goals => {
    if (!goals || !goalsHighlightsEl) return;
    
    // Ordenar metas: primeiro as não concluídas, depois por prioridade e data de criação
    goals.sort((a, b) => {
      // Primeiro as não concluídas
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      
      // Depois por prioridade (alta > média > baixa)
      const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      
      // Por último, por data de criação (mais recente primeiro)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    // Limitar a 3 metas para exibir no dashboard
    const highlightGoals = goals.slice(0, 3);
    
    if (highlightGoals.length === 0) {
      // Nenhuma meta encontrada
      goalsHighlightsEl.innerHTML = `
        <div class="card hoverable">
          <div class="card-content">
            <span class="card-title">Nenhuma meta encontrada</span>
            <p>Clique em "Nova Meta" para começar a planejar seu futuro financeiro.</p>
          </div>
          <div class="card-action">
            <a href="add-goal.html" class="blue-text">Criar primeira meta</a>
          </div>
        </div>
      `;
      return;
    }
    
    // Exibir metas em destaque
    highlightGoals.forEach(goal => {
      const progress = calculateProgress(goal.currentAmount, goal.amount);
      const goalCard = document.createElement('div');
      goalCard.className = 'card hoverable';
      
      goalCard.innerHTML = `
        <div class="card-content">
          <span class="card-title">${goal.name}</span>
          <div class="row">
            <div class="col s12">
              <div class="progress">
                <div class="determinate ${goal.category}" style="width: ${progress}%"></div>
              </div>
              <p class="goal-progress-text">
                ${formatCurrency(goal.currentAmount)} de ${formatCurrency(goal.amount)} (${progress}%)
              </p>
            </div>
          </div>
          <div class="row goal-details">
            <div class="col s12">
              <p>
                <i class="material-icons tiny">category</i> ${getCategoryLabel(goal.category)} | 
                <i class="material-icons tiny priority-${goal.priority}">priority_high</i> ${getPriorityLabel(goal.priority)}
                ${goal.deadline ? ` | <i class="material-icons tiny">date_range</i> ${formatDate(goal.deadline)}` : ''}
              </p>
            </div>
          </div>
        </div>
        <div class="card-action">
          <a href="goals.html" class="blue-text">Ver detalhes</a>
        </div>
      `;
      
      goalsHighlightsEl.appendChild(goalCard);
    });
  }).catch(err => {
    console.error('Erro ao carregar dashboard:', err);
    M.toast({html: 'Erro ao carregar dashboard. Tente novamente.', classes: 'red'});
  });
}

// Carregar lista de metas
function loadGoals(categoryFilter = '', priorityFilter = '', statusFilter = '') {
  // Verificar se estamos na página de metas
  const goalsContainer = document.getElementById('goals-container');
  if (!goalsContainer) {
    return; // Não estamos na página de metas
  }
  
  // Limpar o container
  goalsContainer.innerHTML = '';
  
  // Placeholder para quando não houver metas
  const goalPlaceholder = document.createElement('div');
  goalPlaceholder.className = 'card hoverable goal-placeholder';
  goalPlaceholder.innerHTML = `
    <div class="card-content">
      <span class="card-title">Nenhuma meta encontrada</span>
      <p>Você ainda não tem metas cadastradas ou nenhuma meta corresponde aos filtros selecionados.</p>
    </div>
    <div class="card-action">
      <a href="add-goal.html" class="blue-text">Criar primeira meta</a>
    </div>
  `;
  
  // Obter metas filtradas
  getFilteredGoals(categoryFilter, priorityFilter, statusFilter).then(goals => {
    if (goals.length === 0) {
      // Nenhuma meta encontrada
      goalsContainer.appendChild(goalPlaceholder);
      return;
    }
    
    // Ordenar metas: primeiro as não concluídas, depois por prioridade e data de criação
    goals.sort((a, b) => {
      // Primeiro as não concluídas
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      
      // Depois por prioridade (alta > média > baixa)
      const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      
      // Por último, por data de criação (mais recente primeiro)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    // Exibir cada meta
    goals.forEach(goal => {
      const progress = calculateProgress(goal.currentAmount, goal.amount);
      const goalCard = document.createElement('div');
      goalCard.className = 'card hoverable goal-card';
      goalCard.dataset.goalId = goal.id;
      
      goalCard.innerHTML = `
        <div class="card-content">
          <span class="card-title">${goal.name}${goal.isCompleted ? ' <i class="material-icons green-text small">check_circle</i>' : ''}</span>
          <div class="row">
            <div class="col s12">
              <div class="progress">
                <div class="determinate ${goal.category}" style="width: ${progress}%"></div>
              </div>
              <p class="goal-progress-text">
                ${formatCurrency(goal.currentAmount)} de ${formatCurrency(goal.amount)} (${progress}%)
              </p>
            </div>
          </div>
          <div class="row goal-details">
            <div class="col s6">
              <p><i class="material-icons tiny">category</i> ${getCategoryLabel(goal.category)}</p>
              <p><i class="material-icons tiny priority-${goal.priority}">priority_high</i> ${getPriorityLabel(goal.priority)}</p>
            </div>
            <div class="col s6">
              <p><i class="material-icons tiny">date_range</i> ${goal.deadline ? formatDate(goal.deadline) : 'Sem data'}</p>
              <p><i class="material-icons tiny">trending_up</i> ${getMonthlyNeededText(goal)}</p>
            </div>
          </div>
        </div>
        <div class="card-action">
          <a href="#deposit-modal" class="modal-trigger blue-text btn-deposit" data-goal-id="${goal.id}">Depositar</a>
          <a href="#goal-details-modal" class="modal-trigger green-text btn-details" data-goal-id="${goal.id}">Detalhes</a>
          <a href="#edit-goal-modal" class="modal-trigger amber-text text-darken-2 btn-edit" data-goal-id="${goal.id}">Editar</a>
        </div>
      `;
      
      goalsContainer.appendChild(goalCard);
      
      // Adicionar event listeners aos botões
      const depositBtn = goalCard.querySelector('.btn-deposit');
      const detailsBtn = goalCard.querySelector('.btn-details');
      const editBtn = goalCard.querySelector('.btn-edit');
      
      if (depositBtn) {
        depositBtn.addEventListener('click', function() {
          openDepositModal(goal.id);
        });
      }
      
      if (detailsBtn) {
        detailsBtn.addEventListener('click', function() {
          openGoalDetailsModal(goal.id);
        });
      }
      
      if (editBtn) {
        editBtn.addEventListener('click', function() {
          openEditGoalModal(goal.id);
        });
      }
    });
  }).catch(err => {
    console.error('Erro ao carregar metas:', err);
    M.toast({html: 'Erro ao carregar metas. Tente novamente.', classes: 'red'});
    goalsContainer.appendChild(goalPlaceholder);
  });
}

// Abrir modal de depósito
function openDepositModal(goalId) {
  // Limpar formulário
  const depositForm = document.getElementById('deposit-form');
  if (depositForm) {
    depositForm.reset();
  }
  
  // Definir ID da meta no campo oculto
  const depositGoalIdInput = document.getElementById('deposit-goal-id');
  if (depositGoalIdInput) {
    depositGoalIdInput.value = goalId;
  }
  
  // Definir a data atual como padrão
  const depositDateInput = document.getElementById('deposit-date');
  if (depositDateInput) {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    depositDateInput.value = formattedDate;
  }
  
  // Atualizar labels para estado ativo
  M.updateTextFields();
}

// Abrir modal de detalhes da meta
function openGoalDetailsModal(goalId) {
  // Obter a meta
  getGoal(goalId).then(goal => {
    if (!goal) {
      M.toast({html: 'Meta não encontrada.', classes: 'red'});
      return;
    }
    
    // Atualizar informações no modal
    document.getElementById('detail-goal-name').textContent = goal.name;
    
    // Progresso
    const progress = calculateProgress(goal.currentAmount, goal.amount);
    document.getElementById('detail-goal-progress').style.width = progress + '%';
    document.getElementById('detail-goal-progress').className = `determinate ${goal.category}`;
    document.getElementById('detail-goal-progress-text').textContent = 
      `${formatCurrency(goal.currentAmount)} de ${formatCurrency(goal.amount)} (${progress}%)`;
    
    // Informações da meta
    document.getElementById('detail-goal-category').textContent = getCategoryLabel(goal.category);
    document.getElementById('detail-goal-priority').textContent = getPriorityLabel(goal.priority);
    document.getElementById('detail-goal-deadline').textContent = goal.deadline ? formatDate(goal.deadline) : 'Sem data';
    document.getElementById('detail-goal-created').textContent = formatDate(goal.createdAt);
    document.getElementById('detail-goal-notes').textContent = goal.notes || 'Nenhuma';
    
    // Estatísticas
    document.getElementById('detail-goal-remaining').textContent = formatCurrency(goal.amount - goal.currentAmount);
    
    const daysLeft = goal.deadline ? calculateDaysLeft(goal.deadline) : null;
    document.getElementById('detail-goal-days-left').textContent = daysLeft !== null ? `${daysLeft} dias` : 'Sem prazo';
    
    const monthlyNeeded = goal.deadline ? calculateMonthlyNeeded(goal) : null;
    document.getElementById('detail-goal-monthly-needed').textContent = 
      monthlyNeeded !== null ? formatCurrency(monthlyNeeded) + '/mês' : 'Sem prazo';
    
    // Calcular média mensal economizada
    const firstDepositDate = goal.deposits.length > 0 ? 
      new Date(goal.deposits.sort((a, b) => new Date(a.date) - new Date(b.date))[0].date) : 
      new Date(goal.createdAt);
    
    const monthsPassed = calculateMonthsPassed(firstDepositDate);
    const monthlyAvg = monthsPassed > 0 ? goal.currentAmount / monthsPassed : goal.currentAmount;
    
    document.getElementById('detail-goal-monthly-avg').textContent = formatCurrency(monthlyAvg) + '/mês';
    
    // Histórico de depósitos
    const depositsList = document.getElementById('deposits-list');
    depositsList.innerHTML = '';
    
    if (goal.deposits.length === 0) {
      depositsList.innerHTML = `
        <tr class="no-deposits-row">
          <td colspan="4" class="center-align">Nenhum depósito registrado</td>
        </tr>
      `;
    } else {
      // Ordenar depósitos por data (mais recentes primeiro)
      const sortedDeposits = goal.deposits.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      sortedDeposits.forEach(deposit => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${formatDate(deposit.date)}</td>
          <td>${formatCurrency(deposit.amount)}</td>
          <td>${deposit.notes || '-'}</td>
          <td>
            <button class="btn-small red lighten-2 waves-effect waves-light btn-remove-deposit" 
              data-deposit-id="${deposit.id}" data-goal-id="${goal.id}">
              <i class="material-icons">delete</i>
            </button>
          </td>
        `;
        
        depositsList.appendChild(row);
        
        // Adicionar event listener ao botão de remover depósito
        const removeBtn = row.querySelector('.btn-remove-deposit');
        if (removeBtn) {
          removeBtn.addEventListener('click', function() {
            if (confirm('Tem certeza que deseja remover este depósito?')) {
              const depositId = this.dataset.depositId;
              const goalId = this.dataset.goalId;
              
              removeDeposit(goalId, depositId).then(() => {
                M.toast({html: 'Depósito removido com sucesso!', classes: 'green'});
                // Recarregar modal
                openGoalDetailsModal(goalId);
                // Recarregar dados
                loadGoals();
                loadDashboard();
              }).catch(err => {
                console.error('Erro ao remover depósito:', err);
                M.toast({html: 'Erro ao remover depósito. Tente novamente.', classes: 'red'});
              });
            }
          });
        }
      });
    }
  }).catch(err => {
    console.error('Erro ao carregar detalhes da meta:', err);
    M.toast({html: 'Erro ao carregar detalhes. Tente novamente.', classes: 'red'});
  });
}

// Abrir modal de edição de meta
function openEditGoalModal(goalId) {
  // TODO: Implementar edição de meta
  M.toast({html: 'Funcionalidade de edição será implementada em breve!', classes: 'blue'});
}

// Obter label da categoria
function getCategoryLabel(category) {
  const categories = {
    'emergency': 'Emergência',
    'travel': 'Viagem',
    'education': 'Educação',
    'retirement': 'Aposentadoria',
    'house': 'Casa',
    'car': 'Carro',
    'other': 'Outro'
  };
  
  return categories[category] || category;
}

// Obter label da prioridade
function getPriorityLabel(priority) {
  const priorities = {
    'high': 'Alta',
    'medium': 'Média',
    'low': 'Baixa'
  };
  
  return priorities[priority] || priority;
}

// Obter texto de valor mensal necessário
function getMonthlyNeededText(goal) {
  if (!goal.deadline) return 'Sem prazo';
  
  const monthlyNeeded = calculateMonthlyNeeded(goal);
  if (monthlyNeeded === null) return 'Sem prazo';
  
  return formatCurrency(monthlyNeeded) + '/mês';
}

// Calcular meses passados desde uma data
function calculateMonthsPassed(date) {
  const today = new Date();
  const startDate = new Date(date);
  
  const monthsPassed = 
    (today.getFullYear() - startDate.getFullYear()) * 12 + 
    (today.getMonth() - startDate.getMonth()) +
    (today.getDate() >= startDate.getDate() ? 0 : -1);
  
  return Math.max(1, monthsPassed); // Pelo menos 1 mês
}