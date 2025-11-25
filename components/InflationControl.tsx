
import React, { useState, useEffect } from 'react';
import { getInflationHistory, getCurrencyHistory } from '../services/marketData';
import { InflationDataPoint, CurrencyHistoryPoint, RateProvider } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, ShoppingCart, DollarSign, RefreshCw, ArrowRightLeft, Radio } from 'lucide-react';
import Hint from './Hint';

interface InflationControlProps {
  rateProvider: RateProvider;
  setRateProvider: (provider: RateProvider) => void;
  currencyFormatter?: (value: number) => string;
}

const InflationControl: React.FC<InflationControlProps> = ({ 
  rateProvider, 
  setRateProvider, 
  currencyFormatter = (val) => `${val.toFixed(2)}` // Default fallback
}) => {
  const [data, setData] = useState<InflationDataPoint[]>([]);
  const [currentInflation, setCurrentInflation] = useState(0);
  const [purchaseAmount, setPurchaseAmount] = useState(10000); // Kz
  const [realValue, setRealValue] = useState(10000);
  const [ticker, setTicker] = useState("Aguardando dados de mercado...");

  // Currency Comparison State
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState('AOA');
  const [chartPeriod, setChartPeriod] = useState<'1A' | '2A' | '5A'>('1A');
  const [currencyHistory, setCurrencyHistory] = useState<CurrencyHistoryPoint[]>([]);

  useEffect(() => {
    const history = getInflationHistory();
    setData(history);
    const lastValue = history[history.length - 1].accumulated;
    setCurrentInflation(lastValue);
    
    // Simulador de Ticker em Tempo Real
    const news = [
      "BNA mantém taxas de juros inalteradas.",
      "Preço da cesta básica sobe 2.3% em Luanda.",
      "Mercado paralelo regista alta volatilidade no fim de semana.",
      "Setor de transportes impulsiona inflação mensal."
    ];
    let i = 0;
    const interval = setInterval(() => {
      setTicker(news[i % news.length]);
      i++;
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Calculadora de poder de compra (Simplificada: Valor / (1 + Taxa/100))
    const adjusted = purchaseAmount / (1 + (currentInflation / 100));
    setRealValue(adjusted);
  }, [purchaseAmount, currentInflation]);

  useEffect(() => {
    // Busca histórico baseado no provedor selecionado
    const history = getCurrencyHistory(baseCurrency, targetCurrency, chartPeriod, rateProvider);
    setCurrencyHistory(history);
  }, [baseCurrency, targetCurrency, chartPeriod, rateProvider]);

  const handleSwapCurrencies = () => {
    const temp = baseCurrency;
    setBaseCurrency(targetCurrency);
    setTargetCurrency(temp);
  };

  const currencies = ['AOA', 'USD', 'EUR', 'BRL', 'GBP', 'CNY', 'ZAR', 'JPY'];
  const loss = purchaseAmount - realValue;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header Promocional */}
      <div className="bg-gradient-to-r from-rose-600 to-pink-600 p-8 rounded-3xl text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
          <div>
            <h2 className="text-3xl font-bold flex items-center mb-2">
              <TrendingUp className="mr-3" /> Controle de Inflação
            </h2>
            <p className="text-rose-100 font-medium max-w-2xl">
              Acompanhe a desvalorização da moeda e ajuste seu orçamento para proteger seu poder de compra.
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/30" data-tour="inflation-source">
            <label className="flex items-center text-xs font-bold text-rose-100 uppercase mb-1 px-1">
              Fonte de Dados
              <Hint text="Escolha entre a taxa oficial do BNA, taxas globais de Forex ou a taxa informal (Kinguila) para simulações mais realistas." />
            </label>
            <select 
              value={rateProvider} 
              onChange={(e) => setRateProvider(e.target.value as RateProvider)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer w-full text-sm"
            >
              <option className="text-slate-800" value="BNA">BNA (Oficial)</option>
              <option className="text-slate-800" value="FOREX">Forex Global</option>
              <option className="text-slate-800" value="PARALLEL">Mercado Paralelo (Rua)</option>
            </select>
          </div>
        </div>
        
        <div className="mt-6 flex items-center bg-black/20 backdrop-blur-sm p-3 rounded-xl w-fit">
          <AlertCircle size={20} className="text-yellow-400 mr-2 animate-pulse" />
          <span className="font-mono text-sm">{ticker}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Indicador Principal */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-soft border border-slate-100 dark:border-slate-700 flex flex-col justify-center items-center text-center">
          <p className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-wider mb-2">Inflação Acumulada (12M)</p>
          <h3 className="text-5xl font-extrabold text-slate-800 dark:text-white tracking-tighter mb-2 tabular-nums">
            {currentInflation.toFixed(2)}%
          </h3>
          <div className="flex items-center text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-3 py-1 rounded-full text-sm font-bold">
            <TrendingUp size={16} className="mr-1" /> Alta Tendência
          </div>
        </div>

        {/* Calculadora de Poder de Compra (Restored Rich UI) */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-soft border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
           <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center" data-tour="purchasing-power">
             <ShoppingCart className="mr-2 text-indigo-500" /> Calculadora de Poder de Compra
           </h3>
           
           <div className="flex flex-col md:flex-row gap-6 items-center">
             <div className="flex-1 w-full">
               <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Valor Nominal (Kz)</label>
               <div className="relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">Kz</span>
                 <input 
                   type="number" 
                   value={purchaseAmount}
                   onChange={(e) => setPurchaseAmount(Number(e.target.value))}
                   className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-700 text-2xl font-bold text-slate-800 dark:text-white focus:border-indigo-500 focus:ring-0 outline-none transition-all tabular-nums"
                 />
               </div>
               {purchaseAmount > 0 && (
                 <p className="text-right text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1 animate-fade-in">
                   {currencyFormatter(purchaseAmount)}
                 </p>
               )}
               <p className="text-xs text-slate-400 mt-2">Insira um valor para ver o impacto da inflação.</p>
             </div>

             <div className="hidden md:block text-slate-300">
               <ArrowRightLeft size={24} />
             </div>

             <div className="flex-1 w-full bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center">
               <p className="text-xs text-slate-500 font-bold uppercase mb-1">Poder de compra real (ajustado)</p>
               <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums mb-2">
                 {currencyFormatter(realValue)}
               </p>
               {loss > 0 && (
                 <div className="flex items-center text-rose-500 font-bold text-xs bg-rose-100 dark:bg-rose-900/30 px-3 py-1 rounded-full animate-pulse">
                   <TrendingDown size={14} className="mr-1" />
                   Perda de {currencyFormatter(loss)}
                 </div>
               )}
             </div>
           </div>
        </div>
      </div>

      {/* Gráfico de Inflação */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-soft border border-slate-100 dark:border-slate-700 h-96">
        <h3 className="font-bold text-slate-800 dark:text-white mb-6">Histórico de Inflação (Mensal & Acumulada)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} />
            <Tooltip 
               contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: 'white' }} 
               labelStyle={{ color: '#94a3b8' }}
            />
            <Legend />
            <Area type="monotone" dataKey="accumulated" name="Acumulada (%)" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" />
            <Area type="monotone" dataKey="rate" name="Mensal (%)" stroke="#fbbf24" strokeWidth={3} fill="transparent" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Comparativo de Moedas */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-soft border border-slate-100 dark:border-slate-700">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-900 p-2 rounded-2xl">
             <select value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)} className="bg-transparent font-bold p-2 outline-none dark:text-white cursor-pointer">
               {currencies.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
             <button onClick={handleSwapCurrencies} className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm hover:scale-110 transition"><ArrowRightLeft size={16} /></button>
             <select value={targetCurrency} onChange={(e) => setTargetCurrency(e.target.value)} className="bg-transparent font-bold p-2 outline-none dark:text-white cursor-pointer">
               {currencies.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
          </div>
          
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            {['1A', '2A', '5A'].map((p) => (
              <button 
                key={p} 
                onClick={() => setChartPeriod(p as any)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${chartPeriod === p ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-white' : 'text-slate-400'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={currencyHistory}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
              <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{fontSize: 12}} />
              <Tooltip 
                 contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: 'white' }} 
                 formatter={(val: number) => val.toFixed(4)}
              />
              <Line type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">
          * Taxas baseadas na fonte selecionada ({rateProvider}). A volatilidade do mercado paralelo é estimada.
        </p>
      </div>
    </div>
  );
};

export default InflationControl;
