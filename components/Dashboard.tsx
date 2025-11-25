
import React, { useMemo, useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts';
import { Transaction, TransactionType, SavingsGoal, BudgetLimit, UserBehaviorAnalysis } from '../types';
import { TrendingUp, TrendingDown, DollarSign, Target, Calendar, Sparkles, ArrowUpRight, ArrowDownRight, Wallet, Activity, ShieldCheck, PieChart as PieChartIcon, BrainCircuit, Lightbulb, User } from 'lucide-react';
import { getFinancialAdvice, analyzeUserBehavior } from '../services/geminiService';
import Hint from './Hint';

interface DashboardProps {
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  budgets: BudgetLimit[]; 
  currencyFormatter: (value: number) => string;
}

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

type DateRange = '7days' | 'month' | 'year' | 'all';

const Dashboard: React.FC<DashboardProps> = ({ transactions, savingsGoals, budgets = [], currencyFormatter }) => {
  const [advice, setAdvice] = useState<string>("Analisando suas finanças com IA...");
  const [dateRange, setDateRange] = useState<DateRange>('month');
  
  // Behavior Analysis State
  const [behavior, setBehavior] = useState<UserBehaviorAnalysis | null>(null);
  const [isAnalyzingBehavior, setIsAnalyzingBehavior] = useState(false);

  useEffect(() => {
    getFinancialAdvice(transactions, savingsGoals).then(setAdvice);
  }, [transactions, savingsGoals]);

  const handleAnalyzeBehavior = async () => {
    setIsAnalyzingBehavior(true);
    try {
      const result = await analyzeUserBehavior(transactions);
      setBehavior(result);
    } catch (e) {
      alert("Erro ao analisar comportamento.");
    } finally {
      setIsAnalyzingBehavior(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      switch (dateRange) {
        case '7days':
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          return tDate >= sevenDaysAgo;
        case 'month':
          return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
        case 'year':
          return tDate.getFullYear() === now.getFullYear();
        case 'all':
        default:
          return true;
      }
    });
  }, [transactions, dateRange]);

  const summary = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    const totalExpense = filteredTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const totalSavings = savingsGoals.reduce((acc, curr) => acc + curr.currentAmount, 0);

    return { totalIncome, totalExpense, balance: totalIncome - totalExpense, totalSavings };
  }, [filteredTransactions, savingsGoals]);

  // Financial Health Score Calculation
  const healthScore = useMemo(() => {
    const allIncome = transactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const allExpense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
    const allSavings = savingsGoals.reduce((acc, t) => acc + t.currentAmount, 0);
    
    if (allIncome === 0) return 0;

    // 1. Savings Rate (Target > 20%) - Weight 40%
    const savingsRate = (allSavings / allIncome) * 100;
    const savingsScore = Math.min(100, (savingsRate / 20) * 100) * 0.4;

    // 2. Expense Ratio (Target < 80% of Income) - Weight 30%
    const expenseRatio = (allExpense / allIncome) * 100;
    const expenseScore = expenseRatio > 90 ? 0 : Math.min(100, (1 - (expenseRatio - 50)/50) * 100) * 0.3; 

    // 3. Goal Health (Are goals progressing?) - Weight 30%
    const goalsOnTrack = savingsGoals.filter(g => g.currentAmount > 0).length;
    const goalsScore = savingsGoals.length > 0 ? (goalsOnTrack / savingsGoals.length) * 100 * 0.3 : 0;

    return Math.min(100, Math.round(savingsScore + (expenseScore > 0 ? expenseScore : 0) + goalsScore));
  }, [transactions, savingsGoals]);

  const healthData = [{ name: 'Score', value: healthScore, fill: healthScore > 70 ? '#10b981' : healthScore > 40 ? '#f59e0b' : '#ef4444' }];

  const barChartData = useMemo(() => {
    const dataMap = new Map<string, { income: number, expense: number, date: Date }>();

    filteredTransactions.forEach(t => {
      const tDate = new Date(t.date);
      let key = '';
      if (dateRange === 'year' || dateRange === 'all') {
        key = tDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      } else {
        key = tDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      }

      if (!dataMap.has(key)) {
        dataMap.set(key, { income: 0, expense: 0, date: tDate });
      }

      const entry = dataMap.get(key)!;
      if (t.type === TransactionType.INCOME) entry.income += t.amount;
      else entry.expense += t.amount;
    });

    return Array.from(dataMap.entries())
      .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
      .map(([name, val]) => ({
        name,
        Receitas: val.income,
        Despesas: val.expense
      }));

  }, [filteredTransactions, dateRange]);

  const categoryData = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE);
    const catMap = new Map<string, number>();
    expenses.forEach(t => {
      catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
    });
    return Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  const getRangeLabel = () => {
    switch(dateRange) {
      case '7days': return 'Últimos 7 Dias';
      case 'month': return 'Este Mês';
      case 'year': return 'Este Ano';
      case 'all': return 'Geral';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header + Filters */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Visão Geral</h3>
          <p className="text-sm text-slate-500">Acompanhe a saúde financeira da família.</p>
        </div>
        <div className="flex items-center bg-white dark:bg-slate-800 rounded-2xl p-1.5 shadow-sm border border-slate-200 dark:border-slate-700">
          <Calendar size={16} className="text-slate-400 ml-2 mr-2" />
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="bg-transparent border-none text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer outline-none py-1"
          >
            <option value="7days">7 Dias</option>
            <option value="month">Mês Atual</option>
            <option value="year">Ano Atual</option>
            <option value="all">Tudo</option>
          </select>
        </div>
      </div>

      {/* AI Behavior Analysis Widget */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16"></div>
         
         <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center">
                  <BrainCircuit className="mr-2 text-cyan-400" /> Análise Comportamental
                  <Hint text="A IA analisa todo seu histórico para identificar sua 'Persona Financeira' e prever gastos." className="text-white ml-2" />
                </h3>
                <p className="text-blue-200 text-sm">Descubra seu perfil de gastos e receba previsões.</p>
              </div>
              {!behavior && (
                <button 
                  onClick={handleAnalyzeBehavior}
                  disabled={isAnalyzingBehavior}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl font-bold text-sm transition flex items-center"
                >
                  {isAnalyzingBehavior ? <Sparkles className="animate-spin mr-2" size={16}/> : <Sparkles className="mr-2 text-yellow-300" size={16}/>}
                  {isAnalyzingBehavior ? 'Analisando...' : 'Analisar Meu Padrão'}
                </button>
              )}
            </div>

            {behavior && (
              <div className="grid md:grid-cols-3 gap-6 animate-scale-in bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                 <div className="flex flex-col items-center justify-center text-center p-2 border-r border-white/10">
                    <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mb-2 text-cyan-300">
                       <User size={24} />
                    </div>
                    <p className="text-xs uppercase font-bold text-cyan-300">Sua Persona</p>
                    <p className="text-xl font-bold">{behavior.persona}</p>
                 </div>
                 
                 <div className="flex flex-col justify-center border-r border-white/10 px-4">
                    <p className="text-xs uppercase font-bold text-yellow-300 mb-1 flex items-center"><Lightbulb size={12} className="mr-1"/> Padrão Detectado</p>
                    <p className="text-sm font-medium leading-relaxed">"{behavior.patternDescription}"</p>
                    <p className="text-xs text-blue-200 mt-2">Dica: {behavior.tip}</p>
                 </div>

                 <div className="flex flex-col justify-center items-center px-4">
                    <p className="text-xs uppercase font-bold text-emerald-300 mb-1">Projeção Próximo Mês</p>
                    <p className="text-2xl font-bold tracking-tight">{currencyFormatter(behavior.nextMonthProjection)}</p>
                    <p className="text-[10px] text-blue-200">Estimado pela IA</p>
                 </div>
              </div>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Premium Stats Cards (Left Side, 3 cols) */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Saldo */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Wallet className="text-white" size={24} />
              </div>
              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-lg text-white">
                {getRangeLabel()}
              </span>
            </div>
            <p className="text-indigo-100 text-sm font-medium mb-1">Saldo Líquido</p>
            <h3 className="text-2xl font-bold tracking-tight">{currencyFormatter(summary.balance)}</h3>
          </div>

          {/* Receitas */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-soft border border-slate-100 dark:border-slate-700 relative group hover:translate-y-[-2px] transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600 dark:text-emerald-400">
                <TrendingUp size={24} />
              </div>
              <ArrowUpRight className="text-emerald-500" size={20} />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Receitas</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{currencyFormatter(summary.totalIncome)}</h3>
          </div>

          {/* Despesas */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-soft border border-slate-100 dark:border-slate-700 relative group hover:translate-y-[-2px] transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-2xl text-rose-600 dark:text-rose-400">
                <TrendingDown size={24} />
              </div>
              <ArrowDownRight className="text-rose-500" size={20} />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Despesas</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{currencyFormatter(summary.totalExpense)}</h3>
          </div>
        </div>

        {/* Financial Health Score Widget (Right Side, 1 col) */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-soft border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-between relative overflow-hidden min-h-[240px]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-blue-500"></div>
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center z-10">
              Saúde Financeira <Hint text="Calculado com base na sua taxa de poupança, controle de gastos e progresso de metas." />
            </h3>
            
            <div className="h-40 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="70%" outerRadius="100%" data={healthData} startAngle={180} endAngle={0} cy="85%">
                   <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                   <RadialBar background={{ fill: '#e2e8f0' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 text-center mt-4">
                 <span className={`text-4xl font-extrabold ${healthScore > 70 ? 'text-emerald-500' : healthScore > 40 ? 'text-amber-500' : 'text-rose-500'}`}>
                   {healthScore}
                 </span>
                 <span className="text-xs text-slate-400 block font-bold mt-1">/ 100</span>
              </div>
            </div>
            <div className="text-center z-10 mt-2">
               <p className={`text-sm font-bold py-1 px-3 rounded-full bg-slate-50 dark:bg-slate-700/50 ${healthScore > 70 ? 'text-emerald-600 dark:text-emerald-400' : healthScore > 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                 {healthScore > 80 ? 'Excelente!' : healthScore > 50 ? 'Bom, mas atenção' : 'Crítico'}
               </p>
            </div>
        </div>
      </div>

      {/* AI Insight */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-indigo-900 dark:to-slate-900 rounded-3xl p-1 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-[20px]">
           <h3 className="font-bold text-lg mb-2 flex items-center text-white">
            <Sparkles className="mr-2 text-yellow-300 animate-pulse" size={20} /> Insight Inteligente Gemini
          </h3>
          <p className="text-slate-200 leading-relaxed font-light">"{advice}"</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-soft border border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-bold mb-6 text-slate-800 dark:text-white flex items-center">
            <div className="w-2 h-8 bg-primary-500 rounded-full mr-3"></div>
            Fluxo de Caixa
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={barChartData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px', padding: '12px' }}
                  itemStyle={{ color: '#f8fafc', fontWeight: 600 }}
                  formatter={(value: number) => currencyFormatter(value)}
                />
                <Area type="monotone" dataKey="Receitas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-soft border border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-bold mb-6 text-slate-800 dark:text-white flex items-center">
            <div className="w-2 h-8 bg-purple-500 rounded-full mr-3"></div>
            Por Categoria
          </h3>
          {categoryData.length > 0 ? (
            <div className="h-80 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }}
                    formatter={(value: number) => currencyFormatter(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                 {categoryData.slice(0, 5).map((entry, index) => (
                   <div key={index} className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                     <div className="w-2 h-2 rounded-full mr-1" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                     {entry.name}
                   </div>
                 ))}
              </div>
            </div>
          ) : (
            <div className="h-80 flex flex-col items-center justify-center text-slate-400">
              <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-full mb-3">
                <PieChartIcon size={32} />
              </div>
              <p>Sem dados no período</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
    