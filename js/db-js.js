// Definição do banco de dados e versão
const DB_NAME = 'financemeta-db';
const DB_VERSION = 1;
const GOAL_STORE = 'goals';

// Variável global para a instância do banco de dados
let db;

// Inicializar o banco de dados
function initDB() {
  return new Promise((resolve, reject) => {
    // Abrir conexão com o banco de dados
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    // Evento disparado quando a versão do banco de dados for atualizada
    request.onupgradeneeded = event => {
      db = event.target.result;
      
      // Criar object store para as metas
      if (!db.objectStoreNames.contains(GOAL_STORE)) {
        const goalsStore = db.createObjectStore(GOAL_STORE, { keyPath: 'id' });
        
        // Criar índices para facilitar consultas
        goalsStore.createIndex('category', 'category', { unique: false });
        goalsStore.createIndex('priority', 'priority', { unique: false });
        goalsStore.createIndex('isCompleted', 'isCompleted', { unique: false });
        goalsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    
    // Evento disparado quando a conexão for estabelecida com sucesso
    request.onsuccess = event => {
      db = event.target.result;
      console.log('Banco de dados inicializado com sucesso');
      resolve();
    };
    
    // Evento disparado quando ocorrer um erro na conexão
    request.onerror = event => {
      console.error('Erro ao inicializar banco de dados:', event.target.error);
      reject('Erro ao inicializar banco de dados: ' + event.target.error);
    };
  });
}

// Salvar uma meta no banco de dados
function saveGoal(goal) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([GOAL_STORE], 'readwrite');
    const store = transaction.objectStore(GOAL_STORE);
    const request = store.put(goal);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = event => {
      reject('Erro ao salvar meta: ' + event.target.error);
    };
  });
}

// Obter todas as metas
function getAllGoals() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([GOAL_STORE], 'readonly');
    const store = transaction.objectStore(GOAL_STORE);
    const request = store.getAll();
    
    request.onsuccess = event => {
      resolve(event.target.result);
    };
    
    request.onerror = event => {
      reject('Erro ao obter metas: ' + event.target.error);
    };
  });
}

// Obter metas filtradas
function getFilteredGoals(categoryFilter, priorityFilter, statusFilter) {
  return new Promise((resolve, reject) => {
    getAllGoals().then(goals => {
      let filteredGoals = goals;
      
      // Aplicar filtro de categoria
      if (categoryFilter) {
        filteredGoals = filteredGoals.filter(goal => goal.category === categoryFilter);
      }
      
      // Aplicar filtro de prioridade
      if (priorityFilter) {
        filteredGoals = filteredGoals.filter(goal => goal.priority === priorityFilter);
      }
      
      // Aplicar filtro de status
      if (statusFilter) {
        if (statusFilter === 'active') {
          filteredGoals = filteredGoals.filter(goal => !goal.isCompleted);
        } else if (statusFilter === 'completed') {
          filteredGoals = filteredGoals.filter(goal => goal.isCompleted);
        }
      }
      
      resolve(filteredGoals);
    }).catch(err => {
      reject(err);
    });
  });
}

// Obter uma meta específica pelo ID
function getGoal(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([GOAL_STORE], 'readonly');
    const store = transaction.objectStore(GOAL_STORE);
    const request = store.get(id);
    
    request.onsuccess = event => {
      resolve(event.target.result);
    };
    
    request.onerror = event => {
      reject('Erro ao obter meta: ' + event.target.error);
    };
  });
}

// Excluir uma meta
function deleteGoal(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([GOAL_STORE], 'readwrite');
    const store = transaction.objectStore(GOAL_STORE);
    const request = store.delete(id);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = event => {
      reject('Erro ao excluir meta: ' + event.target.error);
    };
  });
}

// Adicionar um depósito a uma meta existente
function addDeposit(goalId, deposit) {
  return new Promise((resolve, reject) => {
    // Obter a meta atual
    getGoal(goalId).then(goal => {
      if (!goal) {
        reject('Meta não encontrada');
        return;
      }
      
      // Adicionar o depósito à lista de depósitos
      goal.deposits.push(deposit);
      
      // Atualizar o valor atual da meta
      goal.currentAmount += deposit.amount;
      
      // Verificar se a meta foi concluída
      if (goal.currentAmount >= goal.amount) {
        goal.isCompleted = true;
      }
      
      // Salvar a meta atualizada
      return saveGoal(goal);
    }).then(() => {
      resolve();
    }).catch(err => {
      reject(err);
    });
  });
}

// Remover um depósito de uma meta
function removeDeposit(goalId, depositId) {
  return new Promise((resolve, reject) => {
    // Obter a meta atual
    getGoal(goalId).then(goal => {
      if (!goal) {
        reject('Meta não encontrada');
        return;
      }
      
      // Encontrar o depósito a ser removido
      const depositIndex = goal.deposits.findIndex(d => d.id === depositId);
      
      if (depositIndex === -1) {
        reject('Depósito não encontrado');
        return;
      }
      
      // Obter o valor do depósito
      const depositAmount = goal.deposits[depositIndex].amount;
      
      // Remover o depósito da lista
      goal.deposits.splice(depositIndex, 1);
      
      // Atualizar o valor atual da meta
      goal.currentAmount -= depositAmount;
      
      // Verificar se a meta ainda está concluída
      if (goal.currentAmount < goal.amount) {
        goal.isCompleted = false;
      }
      
      // Salvar a meta atualizada
      return saveGoal(goal);
    }).then(() => {
      resolve();
    }).catch(err => {
      reject(err);
    });
  });
}

// Obter resumo das metas para o dashboard
function getGoalsSummary() {
  return new Promise((resolve, reject) => {
    getAllGoals().then(goals => {
      const totalGoalsAmount = goals.reduce((total, goal) => total + goal.amount, 0);
      const totalSavedAmount = goals.reduce((total, goal) => total + goal.currentAmount, 0);
      const totalRemainingAmount = totalGoalsAmount - totalSavedAmount;
      
      const activeGoals = goals.filter(goal => !goal.isCompleted);
      const completedGoals = goals.filter(goal => goal.isCompleted);
      
      // Calcular metas por categoria
      const categoryCounts = {};
      goals.forEach(goal => {
        if (!categoryCounts[goal.category]) {
          categoryCounts[goal.category] = 0;
        }
        categoryCounts[goal.category]++;
      });
      
      const summary = {
        totalGoalsAmount,
        totalSavedAmount,
        totalRemainingAmount,
        totalGoals: goals.length,
        activeGoals: activeGoals.length,
        completedGoals: completedGoals.length,
        categoryCounts
      };
      
      resolve(summary);
    }).catch(err => {
      reject(err);
    });
  });
}
