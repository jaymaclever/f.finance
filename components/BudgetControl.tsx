
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, BudgetLimit } from '../types';
import { PieChart, Save, AlertTriangle, CheckCircle, Edit3, Sparkles, Loader2 } from 'lucide-react';
import Hint from './Hint';
import { suggestBudgets } from '../services/geminiService';

interface BudgetControlProps {
  transactions: Transaction[];
  budgets: BudgetLimit[];
  saveBudget: (budget: BudgetLimit) => void;
  currencyFormatter: (value: number) => string;
}

const BudgetControl: React.FC<BudgetControlProps> = ({ 
  transactions, 
  budgets, 
  saveBudget,
  currencyFormatter 
}) => {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [isSuggesting, setIsSuggesting] = useState(false);

  const categories = useMemo(() => {
    const transactionCategories = new Set(transactions.map(t => t.category));
    const budgetCategories = new Set(budgets.map(b => b.category));
    const defaultCategories = ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Educação', 'Outros'];
    const all = new Set([...transactionCategories, ...budgetCategories, ...defaultCategories]);
    return Array.from(all).sort();
  }, [transactions, budgets]);

  const categorySpending = useMemo(() => {
    const now = new Date();
    const spending: Record<string, number> = {};
    transactions.forEach(t => {
      const tDate = new Date(t.date);
      if (t.type === TransactionType.EXPENSE && tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear()) {
        spending[t.category] = (spending[t.category] || 0) + t.amount;
      }
    });
    return spending;
  }, [transactions]);

  const handleEdit = (category: string, currentLimit: number) => {
    setEditingCategory(category);
    setEditAmount(currentLimit.toString());
  };

  const handleSave = (category: string) => {
    saveBudget({ category, limit: Number(editAmount) });
    setEditingCategory(null);
  };

  const handleAiSuggestion = async () => {
    setIsSuggesting(true);
    try {
      const suggestions = await suggestBudgets(transactions);
      if (suggestions.length === 0) {
        alert("Sem dados suficientes para sugestões.");
        return;
      }

      const confirm = window.confirm(
        `A IA sugeriu ${suggestions.length} orçamentos baseados no seu histórico. Deseja aplicar?\n\n` + 
        suggestions.map(s => `${s.category}: ${currencyFormatter(s.limit)}`).join('\n')
      );

      if (confirm) {
        suggestions.forEach(s => saveBudget(s));
      }
    } catch (e) {
      alert("Erro ao gerar sugestões.");
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-3xl text-white shadow-lg shadow-blue-500/20 relative overflow-hidden">
         <div className="absolute -right-10 -top-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
         <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold flex items-center mb-2">
                <PieChart className="mr-3" /> Orçamento Mensal
                <Hint text="Defina um teto máximo de gastos para cada categoria. O app te avisa quando você estiver perto de estourar o limite." className="text-white ml-3" />
              </h2>
              <p className="text-blue-100 font-medium max-w-xl">Defina tetos de gastos para cada categoria. Manter-se dentro do orçamento é o primeiro passo para a liberdade financeira.</p>
            </div>
            <button 
              onClick={handleAiSuggestion}
              disabled={isSuggesting}
              className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-white/30 transition disabled:opacity-70"
            >
              {isSuggesting ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} className="text-yellow-300" />}
              Sugerir com IA
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(cat => {
          const limit = budgets.find(b => b.category === cat)?.limit || 0;
          const spent = categorySpending[cat] || 0;
          const percentage = limit > 0 ? (spent / limit) * 100 : 0;
          const isOverBudget = limit > 0 && spent > limit;
          const isNearLimit = limit > 0 && spent > limit * 0.9 && !isOverBudget;

          return (
            <div key={cat} className="bg-white dark:bg-slate-800 rounded-3xl shadow-soft border border-slate-100 dark:border-slate-700 p-6 flex flex-col justify-between transition-transform hover:-translate-y-1 duration-300">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-slate-800 dark:text-white text-lg">{cat}</h3>
                  {isOverBudget && <AlertTriangle className="text-rose-500 animate-pulse" size={22} />}
                  {!isOverBudget && limit > 0 && <CheckCircle className="text-emerald-500" size={22} />}
                </div>

                <div className="flex justify-between items-end mb-2 text-sm">
                  <span className={`text-xl font-bold ${isOverBudget ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>
                    {currencyFormatter(spent)}
                  </span>
                  <span className="text-slate-400 font-medium text-xs uppercase">
                    Meta: {currencyFormatter(limit)}
                  </span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-4 mb-6 overflow-hidden">
                  <div 
                    className={`h-4 rounded-full transition-all duration-700 ease-out ${
                      isOverBudget ? 'bg-rose-500' : isNearLimit ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="border-t border-slate-50 dark:border-slate-700 pt-4">
                {editingCategory === cat ? (
                  <div className="flex items-center space-x-2 animate-fade-in">
                    <input 
                      type="number" 
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                      autoFocus
                      placeholder="Novo Limite"
                    />
                    <button 
                      onClick={() => handleSave(cat)}
                      className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow"
                    >
                      <Save size={18} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleEdit(cat, limit)}
                    className="flex items-center text-sm font-bold text-slate-400 hover:text-primary-600 transition"
                  >
                    <Edit3 size={16} className="mr-2" />
                    {limit === 0 ? 'Definir Limite' : 'Ajustar Meta'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BudgetControl;
    