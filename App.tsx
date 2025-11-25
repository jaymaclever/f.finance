
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, UserRole, Transaction, SavingsGoal, TransactionType, BackupConfig, BudgetLimit, GoalTransaction, ExchangeRates, FamilyTask, FamilyEvent, RateProvider, UserStatus, SavedSimulation, LoanSimulation, Notification as AppNotification } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Goals from './components/Goals';
import FamilyMode from './components/FamilyMode';
import AdminPanel from './components/AdminPanel';
import BudgetControl from './components/BudgetControl';
import InflationControl from './components/InflationControl';
import Simulations from './components/Simulations';
import Login from './components/Login';
import AIAssistant from './components/AIAssistant'; 
import NotificationsMenu from './components/NotificationsMenu';
import { Menu, Moon, Sun, Globe } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getExchangeRates } from './services/marketData';

// Dados Iniciais Atualizados com Hierarquia Familiar
const INITIAL_USERS: User[] = [
  {
    id: 'u0',
    username: 'admin',
    password: 'admin',
    name: 'Super Admin',
    role: UserRole.SUPER_ADMIN,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Super',
    status: UserStatus.APPROVED,
    securityQuestion: { question: 'Nome do primeiro animal', answer: 'rex' }
  },
  {
    id: 'u1',
    username: 'carlos',
    password: '123',
    name: 'Carlos Silva',
    role: UserRole.MANAGER,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
    status: UserStatus.APPROVED,
    createdBy: 'u0',
    familyId: 'fam_1',
    securityQuestion: { question: 'Cidade natal', answer: 'luanda' }
  },
  {
    id: 'u2',
    username: 'ana',
    password: '123',
    name: 'Ana Silva',
    role: UserRole.MEMBER,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana',
    status: UserStatus.APPROVED,
    createdBy: 'u1', 
    familyId: 'fam_1',
    birthDate: '1985-05-12',
    allowParentView: true 
  },
  {
    id: 'u3',
    username: 'joao',
    password: '123',
    name: 'Joãozinho Silva',
    role: UserRole.MEMBER,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Joao',
    status: UserStatus.APPROVED,
    createdBy: 'u1',
    familyId: 'fam_1',
    birthDate: '2015-08-20', 
    allowParentView: false 
  }
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 't1', userId: 'u1', description: 'Supermercado Mensal', amount: 85000.00, date: '2023-10-15', category: 'Alimentação', type: TransactionType.EXPENSE, isRecurring: false },
  { id: 't2', userId: 'u1', description: 'Salário', amount: 450000.00, date: '2023-10-05', category: 'Salário', type: TransactionType.INCOME, isRecurring: true, frequency: 'monthly' },
  { id: 't3', userId: 'u1', description: 'Netflix', amount: 3500.00, date: '2023-10-10', category: 'Lazer', type: TransactionType.EXPENSE, isRecurring: true, frequency: 'monthly' },
  { id: 't4', userId: 'u1', description: 'Aluguel', amount: 150000.00, date: '2023-10-01', category: 'Moradia', type: TransactionType.EXPENSE, isRecurring: true, frequency: 'monthly' },
];

const INITIAL_GOALS: SavingsGoal[] = [
  { 
    id: 'g1', 
    name: 'Carro Novo', 
    targetAmount: 2000000, 
    currentAmount: 350000, 
    deadline: '2024-12-31', 
    color: '#10b981',
    interestRate: 5,
    history: [
      { id: 'gh1', userId: 'u1', date: '2023-08-01', amount: 100000, note: 'Depósito inicial' },
    ]
  },
];

// Helper para carregar dados com segurança
const safeLoad = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (e) {
    console.warn(`Dados corrompidos em ${key}. Resetando para padrão.`);
    return fallback;
  }
};

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });
  
  const [appName, setAppName] = useState(() => {
    return localStorage.getItem('appName') || 'Finanças Família';
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currency, setCurrency] = useState('AOA'); 
  const [rateProvider, setRateProvider] = useState<RateProvider>('BNA');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'PDF' | 'CSV' | null>(null);
  const [exportStartDate, setExportStartDate] = useState(new Date().toISOString().split('T')[0].substring(0, 8) + '01');
  const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().split('T')[0]);

  // State initialization with robust error handling
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = safeLoad<User[]>('users', INITIAL_USERS);
    // Integrity Check
    if (Array.isArray(saved) && saved.length > 0 && saved[0].username) {
        const hasAdmin = saved.some(u => u.role === UserRole.SUPER_ADMIN || u.role === UserRole.ADMIN);
        if (hasAdmin) return saved;
    }
    return INITIAL_USERS;
  });
  
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);
  
  const [transactions, setTransactions] = useState<Transaction[]>(() => safeLoad('transactions', INITIAL_TRANSACTIONS));
  const [goals, setGoals] = useState<SavingsGoal[]>(() => safeLoad('goals', INITIAL_GOALS));
  const [budgets, setBudgets] = useState<BudgetLimit[]>(() => safeLoad('budgets', []));
  
  const [backupConfig, setBackupConfig] = useState<BackupConfig>({
    networkPath: '',
    rootDataFolder: '',
    frequency: 'manual',
    lastBackup: null
  });

  const [familyTasks, setFamilyTasks] = useState<FamilyTask[]>(() => safeLoad('familyTasks', []));
  const [familyEvents, setFamilyEvents] = useState<FamilyEvent[]>(() => safeLoad('familyEvents', []));
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>(() => safeLoad('savedSimulations', []));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => safeLoad('notifications', []));

  useEffect(() => {
    const loadRates = async () => {
      try {
        const rates = await getExchangeRates(rateProvider);
        setExchangeRates(rates);
      } catch (error) {
        console.error("Erro ao carregar taxas", error);
      }
    };
    loadRates();
    const interval = setInterval(loadRates, 300000); 
    return () => clearInterval(interval);
  }, [rateProvider]); 

  const audioContextRef = useRef<AudioContext | null>(null);
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const playClickSound = () => {
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.1);
    } catch (e) {
      // Ignore audio errors
    }
  };

  const playSuccessSound = () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.value = 523.25; 
      gain1.gain.setValueAtTime(0.05, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1).connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);
    } catch (e) {
      // Ignore audio errors
    }
  };

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest('button');
      if (button) {
        const text = (button.innerText || '').toLowerCase();
        const successKeywords = ['confirmar', 'salvar', 'criar', 'atualizar', 'adicionar', 'concluir', 'calcular', 'exportar', 'aprovar', 'entrar', 'redefinir'];
        if (successKeywords.some(keyword => text.includes(keyword))) {
          playSuccessSound();
        } else {
          playClickSound();
        }
        return;
      }
      if (target.closest('a') || target.closest('input[type="checkbox"]')) {
        playClickSound();
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => { localStorage.setItem('appName', appName); }, [appName]);
  useEffect(() => { localStorage.setItem('transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('users', JSON.stringify(allUsers)); }, [allUsers]);
  useEffect(() => { localStorage.setItem('goals', JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem('budgets', JSON.stringify(budgets)); }, [budgets]);
  useEffect(() => { localStorage.setItem('familyTasks', JSON.stringify(familyTasks)); }, [familyTasks]);
  useEffect(() => { localStorage.setItem('familyEvents', JSON.stringify(familyEvents)); }, [familyEvents]);
  useEffect(() => { localStorage.setItem('savedSimulations', JSON.stringify(savedSimulations)); }, [savedSimulations]);
  useEffect(() => { localStorage.setItem('notifications', JSON.stringify(notifications)); }, [notifications]);

  // --- Notification Logic ---
  const addNotification = useCallback((title: string, message: string, idPrefix: string) => {
    setNotifications(prev => {
      // Check if similar notification exists
      if (prev.some(n => n.id.startsWith(idPrefix) && !n.read)) return prev;
      
      const newNotif: AppNotification = {
        id: `${idPrefix}-${Date.now()}`,
        title,
        message,
        read: false,
        date: new Date().toISOString()
      };
      // Keep max 20 notifications
      return [newNotif, ...prev].slice(0, 20);
    });
  }, []);

  const checkAutomaticNotifications = useCallback(() => {
    if (!isLoggedIn) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    
    // 1. Check Budget Overflow
    budgets.forEach(budget => {
      const spent = transactions
        .filter(t => t.type === TransactionType.EXPENSE && t.category === budget.category)
        .filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === currentMonth && d.getFullYear() === now.getFullYear();
        })
        .reduce((acc, t) => acc + t.amount, 0);
      
      if (spent > budget.limit) {
        addNotification(
          'Orçamento Excedido', 
          `Atenção! Você ultrapassou o limite de gastos em ${budget.category}.`, 
          `budget-${budget.category}-${currentMonth}`
        );
      } else if (spent > budget.limit * 0.9) {
        addNotification(
          'Alerta de Orçamento', 
          `Você já consumiu 90% do orçamento de ${budget.category}.`, 
          `budget-warn-${budget.category}-${currentMonth}`
        );
      }
    });

    // 2. Check Goals Achievement
    goals.forEach(goal => {
      if (goal.targetAmount > 0 && goal.currentAmount >= goal.targetAmount) {
        addNotification(
          'Meta Atingida! 🎉', 
          `Parabéns! Você atingiu o objetivo: ${goal.name}.`, 
          `goal-${goal.id}`
        );
      }
    });

    // 3. Check Tasks
    const myTasks = familyTasks.filter(t => t.assignedTo === currentUser.id && !t.isCompleted);
    if (myTasks.length > 0) {
      addNotification(
        'Tarefas Pendentes', 
        `Você tem ${myTasks.length} tarefas familiares pendentes.`, 
        `tasks-${currentUser.id}-${myTasks.length}`
      );
    }

  }, [isLoggedIn, transactions, budgets, goals, familyTasks, currentUser.id, addNotification]);

  useEffect(() => {
    checkAutomaticNotifications();
  }, [transactions, checkAutomaticNotifications]); // Run when transactions update

  const markNotificationRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const formatCurrency = (valueInAOA: number) => {
    if (!exchangeRates) return `${valueInAOA.toFixed(2)} Kz`;
    if (currency === 'AOA') {
      return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(valueInAOA);
    }
    const rate = exchangeRates[currency];
    if (typeof rate === 'number') {
      const convertedValue = valueInAOA / rate;
      let locale = 'pt-AO';
      switch (currency) {
        case 'BRL': locale = 'pt-BR'; break;
        case 'USD': locale = 'en-US'; break;
        case 'EUR': locale = 'de-DE'; break;
        case 'GBP': locale = 'en-GB'; break;
        case 'CNY': locale = 'zh-CN'; break;
        case 'ZAR': locale = 'en-ZA'; break;
        case 'JPY': locale = 'ja-JP'; break;
        default: locale = 'en-US';
      }
      return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(convertedValue);
    }
    return `${valueInAOA.toFixed(2)} Kz`;
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentView('dashboard');
  };

  const handleAddUser = (user: Omit<User, 'id'>) => {
    const newUser = { ...user, id: Date.now().toString() };
    setAllUsers([...allUsers, newUser]);
  };

  const handleRegister = (user: Omit<User, 'id'>) => {
     handleAddUser(user);
  };

  const handleUpdateUser = (updatedUser: User) => {
    const newUsers = allUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
    setAllUsers(newUsers);
    if (currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser.id && allUsers.length > 1) {
      alert("Não é possível remover a si mesmo.");
      return;
    }
    setAllUsers(allUsers.filter(u => u.id !== userId));
  };

  const handleRestoreBackup = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) throw new Error("Arquivo vazio");
        
        const json = JSON.parse(content);
        
        if (!json || typeof json !== 'object') throw new Error("Arquivo inválido.");

        setAppName(json.appName || 'Finanças Família');
        setAllUsers(json.users || []);
        setTransactions(json.transactions || []);
        setGoals(json.goals || []);
        setBudgets(json.budgets || []);
        setBackupConfig(json.config || backupConfig);
        setFamilyTasks(json.tasks || []);
        setFamilyEvents(json.events || []);
        setSavedSimulations(json.savedSimulations || []);
        
        alert("Backup restaurado com sucesso! Por segurança, faça login novamente.");
        setIsLoggedIn(false);
      } catch (error) {
        alert("Erro ao restaurar backup: " + error);
      }
    };
    reader.readAsText(file);
  };

  const canViewData = (viewer: User, targetUser: User) => {
    if (viewer.id === targetUser.id) return true;
    if (viewer.role === UserRole.SUPER_ADMIN) return true;
    if (viewer.role === UserRole.ADMIN && targetUser.role !== UserRole.SUPER_ADMIN) return true;
    
    // Check if viewer is creator/parent of target
    if (targetUser.createdBy === viewer.id) {
       if (!targetUser.birthDate) return true; 
       const diff = Date.now() - new Date(targetUser.birthDate).getTime();
       const age = diff / (1000 * 60 * 60 * 24 * 365.25);
       
       if (age < 18) return true; 
       return !!targetUser.allowParentView; 
    }
    return false;
  };

  const addTransaction = (t: Omit<Transaction, 'id'>) => setTransactions([{ ...t, id: Date.now().toString() }, ...transactions]);
  const updateTransaction = (u: Transaction) => setTransactions(transactions.map(t => t.id === u.id ? u : t));
  const deleteTransaction = (id: string) => setTransactions(transactions.filter(t => t.id !== id));
  const addGoal = (g: Omit<SavingsGoal, 'id'>) => setGoals([...goals, { ...g, id: Date.now().toString(), history: g.currentAmount > 0 ? [{id: Date.now()+'init', userId: currentUser.id, date: new Date().toISOString().split('T')[0], amount: g.currentAmount, note: 'Inicial'}] : [] }]);
  const deleteGoal = (id: string) => setGoals(goals.filter(g => g.id !== id));
  const addGoalContribution = (id: string, amount: number, note: string) => setGoals(goals.map(g => g.id === id ? { ...g, currentAmount: g.currentAmount + amount, history: [...g.history, { id: Date.now().toString(), userId: currentUser.id, date: new Date().toISOString().split('T')[0], amount, note }] } : g));
  const editGoalContribution = (gid: string, c: GoalTransaction) => setGoals(goals.map(g => g.id === gid ? { ...g, history: g.history.map(h => h.id === c.id ? c : h), currentAmount: g.history.map(h => h.id === c.id ? c : h).reduce((a,b)=>a+b.amount,0) } : g));
  const deleteGoalContribution = (gid: string, cid: string) => setGoals(goals.map(g => g.id === gid ? { ...g, history: g.history.filter(h => h.id !== cid), currentAmount: g.history.filter(h => h.id !== cid).reduce((a,b)=>a+b.amount,0) } : g));
  const saveBudget = (b: BudgetLimit) => setBudgets(p => { const i = p.findIndex(x => x.category === b.category); return i >= 0 ? p.map((x, idx) => idx === i ? b : x) : [...p, b] });
  const addFamilyTask = (t: Omit<FamilyTask, 'id'>) => setFamilyTasks([...familyTasks, { ...t, id: Date.now().toString() }]);
  const toggleFamilyTask = (id: string) => setFamilyTasks(familyTasks.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t));
  const deleteFamilyTask = (id: string) => setFamilyTasks(familyTasks.filter(t => t.id !== id));
  const addFamilyEvent = (e: Omit<FamilyEvent, 'id'>) => setFamilyEvents([...familyEvents, { ...e, id: Date.now().toString() }]);
  const deleteFamilyEvent = (id: string) => setFamilyEvents(familyEvents.filter(e => e.id !== id));
  const saveSimulation = (s: LoanSimulation, n: string) => setSavedSimulations([...savedSimulations, { ...s, id: Date.now().toString(), name: n, createdAt: new Date().toISOString() }]);
  const deleteSimulation = (id: string) => setSavedSimulations(savedSimulations.filter(s => s.id !== id));

  const openExportModal = (type: 'PDF' | 'CSV') => { setExportType(type); setShowExportModal(true); };
  const handleExportConfirm = () => {
    const filtered = transactions.filter(t => t.date >= exportStartDate && t.date <= exportEndDate);
    if (exportType === 'PDF') {
      const doc = new jsPDF();
      doc.text(appName, 10, 10);
      autoTable(doc, { head: [['Data', 'Desc', 'Valor']], body: filtered.map(t => [t.date, t.description, t.amount]) });
      doc.save("relatorio.pdf");
    } else {
      const csv = "Data,Descricao,Valor\n" + filtered.map(t => `${t.date},${t.description},${t.amount}`).join("\n");
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = "export.csv"; a.click();
    }
    setShowExportModal(false);
  };
  
  const updateBackupConfig = (c: BackupConfig) => setBackupConfig(c);
  const triggerManualBackup = () => {
    const data = { appName, users: allUsers, transactions, goals, budgets, config: backupConfig, tasks: familyTasks, events: familyEvents, savedSimulations };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = "backup.json"; a.click();
    setBackupConfig({...backupConfig, lastBackup: new Date().toISOString()});
  };

  if (!isLoggedIn) {
    return <Login appName={appName} users={allUsers} onLogin={handleLogin} onUpdateUser={handleUpdateUser} onRegister={handleRegister} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0b1120] overflow-hidden font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      <Sidebar 
        appName={appName}
        currentUser={currentUser}
        currentView={currentView}
        setCurrentView={setCurrentView}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        logout={handleLogout}
        onUpdateUser={handleUpdateUser}
      />

      <AIAssistant 
        transactions={transactions} 
        goals={goals} 
        currencyFormatter={formatCurrency} 
      />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="glass z-20 px-6 py-3 sticky top-0 flex items-center justify-between transition-colors duration-300">
          <div className="flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="mr-4 text-slate-500 md:hidden hover:text-primary-500 transition"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white capitalize tracking-tight">
              {currentView === 'dashboard' ? 'Painel Geral' : currentView === 'simulations' ? 'Simulações' : currentView === 'transactions' ? 'Transações' : currentView === 'budget' ? 'Orçamentos' : currentView === 'goals' ? 'Metas' : currentView === 'inflation' ? 'Controle de Inflação' : currentView === 'admin' ? 'Administração' : 'Modo Família'}
            </h2>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4">
             <div 
               
               className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-1.5 border border-slate-200/50 dark:border-slate-700/50 shadow-sm"
             >
              <Globe size={14} className="text-slate-400 mr-2" />
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer uppercase">
                <option value="AOA">AOA (Kz)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="BRL">BRL (R$)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CNY">CNY (¥)</option>
                <option value="ZAR">ZAR (R)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>
            
            <NotificationsMenu 
              notifications={notifications} 
              onMarkAsRead={markNotificationRead} 
              onClearAll={clearNotifications} 
            />

            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className="p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-700 transition"
              title={darkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-8 pb-20">
            {currentView === 'dashboard' && <Dashboard transactions={transactions} savingsGoals={goals} budgets={budgets} currencyFormatter={formatCurrency} />}
            {currentView === 'transactions' && <Transactions transactions={transactions} addTransaction={addTransaction} updateTransaction={updateTransaction} deleteTransaction={deleteTransaction} currentUserId={currentUser.id} currencyFormatter={formatCurrency} onExport={openExportModal} />}
            {currentView === 'budget' && <BudgetControl transactions={transactions} budgets={budgets} saveBudget={saveBudget} currencyFormatter={formatCurrency} />}
            {currentView === 'goals' && <Goals goals={goals} addGoal={addGoal} deleteGoal={deleteGoal} addContribution={addGoalContribution} editContribution={editGoalContribution} deleteContribution={deleteGoalContribution} currencyFormatter={formatCurrency} currentUser={currentUser} />}
            {currentView === 'inflation' && <InflationControl rateProvider={rateProvider} setRateProvider={setRateProvider} currencyFormatter={formatCurrency} />}
            {currentView === 'simulations' && <Simulations currencyFormatter={formatCurrency} savedSimulations={savedSimulations} onSaveSimulation={saveSimulation} onDeleteSimulation={deleteSimulation} />}
            {currentView === 'family' && <FamilyMode transactions={transactions} currencyFormatter={formatCurrency} currentUser={currentUser} allUsers={allUsers} tasks={familyTasks} events={familyEvents} addTask={addFamilyTask} toggleTask={toggleFamilyTask} deleteTask={deleteFamilyTask} addEvent={addFamilyEvent} deleteEvent={deleteFamilyEvent} canViewData={canViewData} />}
            {currentView === 'admin' && <AdminPanel appName={appName} setAppName={setAppName} backupConfig={backupConfig} updateBackupConfig={updateBackupConfig} triggerManualBackup={triggerManualBackup} users={allUsers} currentUser={currentUser} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} onRestoreBackup={handleRestoreBackup} />}
          </div>
        </main>
      </div>

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700 animate-scale-in">
             <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Exportar {exportType}</h3>
             <div className="space-y-4">
               <div>
                 <label className="text-xs font-bold text-slate-500 uppercase">Data Inicial</label>
                 <input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} className="w-full mt-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary-500" />
               </div>
               <div>
                 <label className="text-xs font-bold text-slate-500 uppercase">Data Final</label>
                 <input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} className="w-full mt-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary-500" />
               </div>
               <div className="flex gap-3 pt-4">
                 <button onClick={() => setShowExportModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition">Cancelar</button>
                 <button onClick={handleExportConfirm} className="flex-1 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-500/20 transition">Confirmar</button>
               </div>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
    