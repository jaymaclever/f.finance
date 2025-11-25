
import { ExchangeRates, InflationDataPoint, CurrencyHistoryPoint, RateProvider } from "../types";

// Taxas Oficiais (Banco Nacional de Angola)
const RATES_BNA: Record<string, number> = {
  USD: 926.50,
  EUR: 1003.20,
  BRL: 188.10,
  GBP: 1168.00,
  CNY: 127.30,
  ZAR: 49.10,
  JPY: 6.35
};

// Taxas Forex Global (Mid-market rates - Google/Yahoo Finance)
// Geralmente similares ao oficial, mas flutuam mais rápido
const RATES_FOREX: Record<string, number> = {
  USD: 930.10,
  EUR: 1008.50,
  BRL: 189.50,
  GBP: 1175.20,
  CNY: 128.00,
  ZAR: 49.50,
  JPY: 6.40
};

// Taxas Mercado Paralelo (Kinguilas/Rua)
// Geralmente significativamente mais altas (Spread)
const RATES_PARALLEL: Record<string, number> = {
  USD: 1150.00, // Spread alto
  EUR: 1240.00,
  BRL: 230.00,
  GBP: 1450.00,
  CNY: 160.00,
  ZAR: 60.00,
  JPY: 8.00
};

export const getExchangeRates = async (provider: RateProvider = 'BNA'): Promise<ExchangeRates> => {
  // Simulando delay de rede
  await new Promise(resolve => setTimeout(resolve, 600));

  let selectedRates = RATES_BNA;
  if (provider === 'FOREX') selectedRates = RATES_FOREX;
  if (provider === 'PARALLEL') selectedRates = RATES_PARALLEL;

  return {
    AOA: 1,
    USD: selectedRates.USD,
    EUR: selectedRates.EUR,
    BRL: selectedRates.BRL,
    GBP: selectedRates.GBP,
    CNY: selectedRates.CNY,
    ZAR: selectedRates.ZAR,
    JPY: selectedRates.JPY,
    lastUpdate: new Date().toISOString()
  };
};

// Alias para manter compatibilidade se necessário, mas idealmente usar getExchangeRates
export const getBNARates = () => getExchangeRates('BNA');

export const getInflationHistory = (): InflationDataPoint[] => {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  let currentAcc = 14.5; // Inflação acumulada inicial simulada
  
  return months.map(month => {
    // Simulação de tendência de alta moderada
    const monthlyChange = (Math.random() * 0.8) + 1.2; 
    currentAcc += (Math.random() * 0.4); 
    
    return {
      month,
      rate: Number(monthlyChange.toFixed(2)),
      accumulated: Number(currentAcc.toFixed(2))
    };
  });
};

export const getCurrencyHistory = (base: string, target: string, period: '1A' | '2A' | '5A', provider: RateProvider = 'BNA'): CurrencyHistoryPoint[] => {
  const months = period === '1A' ? 12 : period === '2A' ? 24 : 60;
  const data: CurrencyHistoryPoint[] = [];
  const now = new Date();

  // Selecionar o set de taxas correto
  let ratesSource = RATES_BNA;
  if (provider === 'FOREX') ratesSource = RATES_FOREX;
  if (provider === 'PARALLEL') ratesSource = RATES_PARALLEL;

  // Calcular taxa cruzada ATUAL (Hoje)
  const baseRateAOA = base === 'AOA' ? 1 : ratesSource[base] || 1;
  const targetRateAOA = target === 'AOA' ? 1 : ratesSource[target] || 1;
  
  // Taxa atual = (Valor Base em AOA) / (Valor Target em AOA)
  const currentRate = baseRateAOA / targetRateAOA;

  // Gerar histórico RETROATIVO a partir da taxa atual para garantir alinhamento
  let rateIterator = currentRate;

  // Volatilidade baseada no provedor
  let volatility = 0.015; // 1.5% variação mensal (BNA)
  if (provider === 'PARALLEL') volatility = 0.035; // 3.5% (Mercado informal é mais instável)
  if (provider === 'FOREX') volatility = 0.02;

  // Adiciona o ponto atual primeiro
  data.push({
    date: 'Atual',
    rate: Number(rateIterator.toFixed(4))
  });

  for (let i = 1; i <= months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    
    // Simular volatilidade passada (Random Walk reverso)
    const change = 1 + (Math.random() * volatility * 2 - volatility);
    
    // Aplicar variação inversa
    rateIterator = rateIterator / change;

    data.unshift({ // Adiciona no início do array
      date: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      rate: Number(rateIterator.toFixed(4))
    });
  }

  return data;
};