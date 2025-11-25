import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Loader2, Minimize2 } from 'lucide-react';
import { getAiChatResponse } from '../services/geminiService';
import { Transaction, SavingsGoal } from '../types';

interface AIAssistantProps {
  transactions: Transaction[];
  goals: SavingsGoal[];
  currencyFormatter: (val: number) => string;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ transactions, goals, currencyFormatter }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Olá! Sou seu assistente financeiro. Pergunte-me sobre seus gastos, metas ou peça conselhos.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    // Prepare context data summary
    const totalIncome = transactions.filter(t => t.type === 'RECEITA').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'DESPESA').reduce((acc, t) => acc + t.amount, 0);
    const categoryData: Record<string, number> = {};
    transactions.filter(t => t.type === 'DESPESA').forEach(t => {
      categoryData[t.category] = (categoryData[t.category] || 0) + t.amount;
    });

    const contextData = {
      balance: currencyFormatter(totalIncome - totalExpense),
      recentTransactions: transactions.slice(0, 5).map(t => `${t.date}: ${t.description} (${currencyFormatter(t.amount)})`),
      categoryData: Object.entries(categoryData).map(([k,v]) => `${k}: ${currencyFormatter(v)}`),
      goals: goals.map(g => `${g.name}: ${currencyFormatter(g.currentAmount)} de ${currencyFormatter(g.targetAmount)}`),
    };

    try {
      const response = await getAiChatResponse(userMsg, contextData);
      setMessages(prev => [...prev, { role: 'ai', content: response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', content: "Desculpe, não consegui processar sua mensagem agora." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-lg shadow-indigo-500/40 hover:scale-110 transition-transform z-50 flex items-center justify-center animate-bounce-slow"
        title="Assistente IA"
      >
        <Sparkles size={24} className="animate-pulse" />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl z-50 transition-all duration-300 flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 ${isMinimized ? 'w-72 h-16' : 'w-96 h-[500px]'}`}>
      
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 flex justify-between items-center cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center text-white">
          <Sparkles size={18} className="mr-2 text-yellow-300" />
          <h3 className="font-bold">Assistente Gemini</h3>
        </div>
        <div className="flex items-center gap-2 text-white/80">
          <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}><Minimize2 size={16} /></button>
          <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}><X size={18} /></button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-sm' 
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-tl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-700 p-3 rounded-2xl rounded-tl-sm shadow-sm">
                   <Loader2 size={16} className="animate-spin text-indigo-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua dúvida..."
              className="flex-1 p-2 bg-slate-100 dark:bg-slate-900 rounded-xl text-sm outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              <Send size={18} />
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default AIAssistant;