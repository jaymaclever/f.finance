
import React, { useState, useRef, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { categorizeTransaction, parseTransactionFromText, parseTransactionFromAudio } from '../services/geminiService';
import { Plus, Paperclip, Loader2, Trash2, Edit2, ArrowDownCircle, ArrowUpCircle, Search, Sparkles, Mic, Square, RefreshCw, CalendarClock, CreditCard, X, ChevronLeft, ChevronRight, FileText, FileSpreadsheet } from 'lucide-react';
import Hint from './Hint';

interface TransactionsProps {
  transactions: Transaction[];
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction?: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;
  currentUserId: string;
  currencyFormatter: (value: number) => string;
  onExport: (type: 'PDF' | 'CSV') => void;
}

const ITEMS_PER_PAGE = 10;

const Transactions: React.FC<TransactionsProps> = ({ 
  transactions, 
  addTransaction, 
  updateTransaction,
  deleteTransaction,
  currentUserId,
  currencyFormatter,
  onExport
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'subscriptions'>('history');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [smartInput, setSmartInput] = useState('');
  const [isProcessingSmart, setIsProcessingSmart] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: TransactionType.EXPENSE,
    category: '',
    date: new Date().toISOString().split('T')[0],
    attachmentName: '',
    isRecurring: false,
    frequency: 'monthly' as 'monthly' | 'weekly' | 'yearly'
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const inputClass = "w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-primary-500 outline-none transition-all";

  const handleEdit = (transaction: Transaction) => {
    if (transaction.userId !== currentUserId) {
      alert("Você só pode editar suas próprias transações.");
      return;
    }

    setEditingId(transaction.id);
    setFormData({
      description: transaction.description,
      amount: transaction.amount.toString(),
      type: transaction.type,
      category: transaction.category,
      date: transaction.date,
      attachmentName: transaction.attachmentName || '',
      isRecurring: transaction.isRecurring || false,
      frequency: transaction.frequency || 'monthly'
    });
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({
      description: '',
      amount: '',
      type: TransactionType.EXPENSE,
      category: '',
      date: new Date().toISOString().split('T')[0],
      attachmentName: '',
      isRecurring: false,
      frequency: 'monthly'
    });
    setShowForm(true);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Erro ao acessar microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessingSmart(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const base64Content = base64data.split(',')[1];
        try {
          const result = await parseTransactionFromAudio(base64Content);
          setFormData({
            description: result.description || '',
            amount: result.amount?.toString() || '',
            type: (result.type as TransactionType) || TransactionType.EXPENSE,
            category: result.category || 'Geral',
            date: result.date || new Date().toISOString().split('T')[0],
            attachmentName: '',
            isRecurring: result.isRecurring || false,
            frequency: result.frequency || 'monthly'
          });
          setShowForm(true);
        } catch (error) {
          alert("Não foi possível entender o áudio.");
        } finally {
          setIsProcessingSmart(false);
        }
      };
    } catch (error) {
      setIsProcessingSmart(false);
    }
  };

  const handleSmartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartInput.trim()) return;

    setIsProcessingSmart(true);
    try {
      const result = await parseTransactionFromText(smartInput);
      setFormData({
        description: result.description || '',
        amount: result.amount?.toString() || '',
        type: (result.type as TransactionType) || TransactionType.EXPENSE,
        category: result.category || 'Geral',
        date: result.date || new Date().toISOString().split('T')[0],
        attachmentName: '',
        isRecurring: result.isRecurring || false,
        frequency: result.frequency || 'monthly'
      });
      setSmartInput('');
      setShowForm(true); 
    } catch (error) {
      alert("Não foi possível entender o texto.");
    } finally {
      setIsProcessingSmart(false);
    }
  };

  const handleDescriptionChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const desc = e.target.value;
    setFormData(prev => ({ ...prev, description: desc }));

    if (desc.length > 3 && !editingId) {
      setIsAnalyzing(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 600)); 
        const category = await categorizeTransaction(desc, transactions);
        setFormData(prev => ({ ...prev, category }));
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const transactionData = {
      userId: currentUserId,
      description: formData.description,
      amount: Number(formData.amount),
      type: formData.type,
      category: formData.category || 'Geral',
      date: formData.date,
      attachmentName: formData.attachmentName,
      isRecurring: formData.isRecurring,
      frequency: formData.isRecurring ? formData.frequency : undefined
    };

    if (editingId && updateTransaction) {
      updateTransaction({ ...transactionData, id: editingId });
    } else {
      addTransaction(transactionData);
    }
    
    setShowForm(false);
    setEditingId(null);
    setFormData({ description: '', amount: '', type: TransactionType.EXPENSE, category: '', date: new Date().toISOString().split('T')[0], attachmentName: '', isRecurring: false, frequency: 'monthly' });
  };

  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter(t => 
      (t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (activeTab === 'subscriptions' ? t.isRecurring : !t.isRecurring)
    );
    return filtered;
  }, [transactions, searchTerm, activeTab]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = useMemo(() => {
    if (filteredTransactions.length === 0) return [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  const totalSubscriptions = transactions
    .filter(t => t.isRecurring && t.type === TransactionType.EXPENSE)
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Smart Input Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 rounded-3xl shadow-lg shadow-indigo-500/20 text-white relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-16 -mt-16"></div>
         <h3 className="flex items-center text-lg font-bold mb-3 relative z-10">
           <Sparkles className="mr-2 text-yellow-300" /> Registro Inteligente com IA
           <Hint text="Digite ou fale: 'Assinatura Netflix 3000kz todo mês' para criar uma recorrência automaticamente." className="text-white ml-2" />
         </h3>
         <form onSubmit={handleSmartSubmit} className="relative flex items-center gap-3 z-10">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={smartInput}
                onChange={e => setSmartInput(e.target.value)}
                placeholder="Ex: Paguei 15000 na internet todo mês..."
                className="w-full pl-5 pr-14 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/60 focus:ring-2 focus:ring-white/50 outline-none"
                disabled={isProcessingSmart || isRecording}
              />
              <button 
                type="submit" 
                disabled={isProcessingSmart || isRecording}
                className="absolute right-2 top-2 bottom-2 bg-white text-indigo-600 px-4 rounded-xl font-bold hover:bg-indigo-50 transition flex items-center justify-center disabled:opacity-70 shadow-sm"
              >
                {isProcessingSmart ? <Loader2 className="animate-spin" size={20} /> : <ArrowUpCircle size={24} />}
              </button>
            </div>
            
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessingSmart}
              className={`p-4 rounded-2xl font-bold transition flex items-center justify-center shadow-lg border border-white/20
                ${isRecording 
                  ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/50' 
                  : 'bg-white/10 hover:bg-white/20 text-white'}
              `}
              title={isRecording ? "Parar Gravação" : "Gravar Áudio"}
            >
              {isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={24} />}
            </button>
         </form>
         {isRecording && <p className="text-xs text-rose-200 mt-2 font-bold animate-pulse absolute bottom-2 left-8">Gravando... Fale sua transação.</p>}
      </div>

      <div className="flex flex-col xl:flex-row justify-between items-center gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center w-full xl:w-auto">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Transações</h2>
            <p className="text-slate-500 text-sm hidden md:block">Gerencie entradas e saídas detalhadas.</p>
          </div>
          
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
             <button 
               onClick={() => setActiveTab('history')}
               className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
             >
               Histórico
             </button>
             <button 
               onClick={() => setActiveTab('subscriptions')}
               className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center ${activeTab === 'subscriptions' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
             >
               <RefreshCw size={14} className="mr-2"/> Assinaturas
             </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
          <div className="flex gap-2">
            <button 
              onClick={() => onExport('PDF')}
              className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition font-bold text-sm border border-rose-100 dark:border-rose-800"
              title="Exportar PDF"
            >
              <FileText size={18} className="mr-2" /> PDF
            </button>
            <button 
              onClick={() => onExport('CSV')}
              className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition font-bold text-sm border border-emerald-100 dark:border-emerald-800"
              title="Exportar Excel (CSV)"
            >
              <FileSpreadsheet size={18} className="mr-2" /> Excel
            </button>
          </div>

          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 outline-none transition text-slate-800 dark:text-white"
            />
          </div>
          <button 
            onClick={handleAddNew}
            className="flex items-center justify-center px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition shadow-lg shadow-primary-500/20 font-bold"
          >
            <Plus size={20} className="mr-2" />
            Nova
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 dark:border-slate-700 animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {editingId ? 'Editar Transação' : 'Nova Transação'}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => setFormData({...formData, type: TransactionType.EXPENSE})}
                  className={`cursor-pointer p-4 rounded-2xl border-2 text-center transition-all ${formData.type === TransactionType.EXPENSE ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-600' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'}`}
                >
                  <p className="font-bold">Despesa</p>
                </div>
                <div 
                  onClick={() => setFormData({...formData, type: TransactionType.INCOME})}
                  className={`cursor-pointer p-4 rounded-2xl border-2 text-center transition-all ${formData.type === TransactionType.INCOME ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'}`}
                >
                  <p className="font-bold">Receita</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Valor</label>
                <input 
                  type="number" 
                  required
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                  placeholder="0.00"
                  className={`${inputClass} text-lg font-bold tabular-nums`}
                />
                {formData.amount && (
                  <p className="text-right text-xs font-bold text-primary-600 dark:text-primary-400 mt-1">
                    {currencyFormatter(Number(formData.amount))}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição</label>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    value={formData.description}
                    onChange={handleDescriptionChange}
                    placeholder="Ex: Uber para o trabalho"
                    className={inputClass}
                  />
                  {isAnalyzing && (
                    <div className="absolute right-3 top-3">
                      <Loader2 className="animate-spin text-primary-500" size={20} />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Categoria</label>
                  <input 
                    type="text" 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    placeholder="Geral"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Data</label>
                  <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.isRecurring} 
                      onChange={e => setFormData({...formData, isRecurring: e.target.checked})}
                      className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-bold text-slate-700 dark:text-white flex items-center">
                      <RefreshCw size={14} className="mr-1"/> Recorrente?
                    </span>
                  </label>
                </div>
                
                {formData.isRecurring && (
                  <div className="animate-fade-in mt-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Frequência</label>
                    <select 
                      value={formData.frequency} 
                      onChange={e => setFormData({...formData, frequency: e.target.value as any})}
                      className={inputClass}
                    >
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensal</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="px-6 py-3 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-500/30 transition"
              >
                {editingId ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW: Subscriptions */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
           <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
             <div className="relative z-10 flex justify-between items-center">
               <div>
                  <h3 className="text-lg font-bold mb-1 opacity-90">Custo Mensal Recorrente</h3>
                  <p className="text-4xl font-extrabold tracking-tight">{currencyFormatter(totalSubscriptions)}</p>
                  <p className="text-sm opacity-70 mt-1 font-medium">Estimado: {currencyFormatter(totalSubscriptions * 12)} / ano</p>
               </div>
               <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                 <CalendarClock size={32} />
               </div>
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedTransactions.map(t => (
                <div key={t.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-soft border border-slate-100 dark:border-slate-700 flex flex-col justify-between group hover:-translate-y-1 transition duration-300">
                   <div className="flex justify-between items-start mb-4">
                     <div className={`p-3 rounded-2xl ${t.type === 'RECEITA' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20'}`}>
                        {t.type === 'RECEITA' ? <ArrowUpCircle size={24} /> : <CreditCard size={24} />}
                     </div>
                     <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-bold text-slate-500 dark:text-slate-300 uppercase">
                       {t.frequency === 'monthly' ? 'Mensal' : t.frequency === 'weekly' ? 'Semanal' : 'Anual'}
                     </span>
                   </div>
                   
                   <div>
                     <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-1 truncate">{t.description}</h4>
                     <p className="text-slate-400 text-sm mb-4 font-medium">{t.category}</p>
                     <p className={`text-2xl font-bold ${t.type === 'RECEITA' ? 'text-emerald-600' : 'text-slate-700 dark:text-white'}`}>
                       {currencyFormatter(t.amount)}
                     </p>
                   </div>

                   <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-700 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(t)} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"><Edit2 size={18}/></button>
                      <button onClick={() => deleteTransaction(t.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg"><Trash2 size={18}/></button>
                   </div>
                </div>
              ))}
              {filteredTransactions.length === 0 && (
                <div className="col-span-full text-center py-10 text-slate-400">
                  <RefreshCw size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Nenhuma assinatura ou conta fixa encontrada.</p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* VIEW: History Table */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                  <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Transação</th>
                  <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Categoria</th>
                  <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Data</th>
                  <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Valor</th>
                  <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {paginatedTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center">
                        <div className={`p-2.5 rounded-full mr-4 ${t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'}`}>
                          {t.type === TransactionType.INCOME ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white text-base">{t.description}</p>
                          {t.attachmentName && (
                            <span className="flex items-center text-xs text-slate-400 mt-0.5 font-medium">
                              <Paperclip size={10} className="mr-1" /> Anexo
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                        {t.category}
                      </span>
                    </td>
                    <td className="p-6 text-sm text-slate-500 font-medium">
                      {new Date(t.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className={`p-6 text-right font-bold text-base whitespace-nowrap tabular-nums ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {t.type === TransactionType.INCOME ? '+' : '-'} {currencyFormatter(t.amount)}
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         {t.userId === currentUserId && (
                          <>
                            <button 
                              onClick={() => handleEdit(t)}
                              className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => { if(confirm('Excluir?')) deleteTransaction(t.id); }}
                              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                         )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 italic">
                      Nenhuma transação encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {filteredTransactions.length > ITEMS_PER_PAGE && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/30">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-600 dark:text-slate-300 transition"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                Página {currentPage} de {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={totalPages === 0 || currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-600 dark:text-slate-300 transition"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Transactions;
