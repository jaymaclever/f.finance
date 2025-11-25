
import { GoogleGenAI } from "@google/genai";
import { Transaction, LoanSimulation, BudgetLimit, UserBehaviorAnalysis } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// --- EXISTING FUNCTIONS ---

export const categorizeTransaction = async (description: string, history: Transaction[] = []): Promise<string> => {
  const exactMatch = history.find(t => t.description.toLowerCase().trim() === description.toLowerCase().trim());
  
  if (exactMatch) {
    return exactMatch.category;
  }

  if (!ai) return "Geral";

  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      Você é um assistente financeiro. Categorize a seguinte transação financeira em uma única palavra ou frase curta em Português (Ex: Alimentação, Transporte, Moradia, Lazer, Saúde, Educação, Salário, Outros).
      
      Descrição da transação: "${description}"
      
      Responda apenas com a categoria.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text ? response.text.trim() : "Geral";
  } catch (error) {
    console.error("Erro ao categorizar transação com Gemini:", error);
    return "Geral";
  }
};

export const getFinancialAdvice = async (transactions: any[], goals: any[]): Promise<string> => {
  if (!ai) return "Adicione sua chave de API para receber conselhos personalizados.";

  try {
    const summary = JSON.stringify({
      totalTransacoes: transactions.length,
      metas: goals.map(g => ({ nome: g.name, progresso: (g.currentAmount / g.targetAmount).toFixed(2) }))
    });

    const prompt = `
      Analise brevemente este resumo financeiro familiar e dê uma dica curta (máximo 2 frases) de como melhorar a saúde financeira.
      Dados: ${summary}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text ? response.text.trim() : "Mantenha o foco!";
  } catch (error) {
    return "Mantenha o foco em suas metas de economia!";
  }
};

export const analyzeLoanDocument = async (text: string): Promise<Partial<LoanSimulation>> => {
  if (!ai) throw new Error("API Key não configurada");

  try {
    const prompt = `
      Analise o texto completo extraído de um documento bancário (PDF).
      Extraia e retorne APENAS um JSON válido com os campos:
      - loanAmount: O valor do "Capital em Dívida" inicial ou "Montante do Empréstimo". (Número).
      - interestRateAnnual: A taxa de juros anual (%) usada para calcular as prestações. (Número).
      - termMonths: O número total de prestações. (Número).
      - system: 'PRICE' ou 'SAC'. Se a prestação for constante, é PRICE. Se a amortização for constante, é SAC.

      Texto do Documento:
      "${text}"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let jsonStr = response.text ? response.text.trim() : "{}";
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    } else {
        jsonStr = jsonStr.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '');
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Erro ao analisar documento:", error);
    throw new Error("Falha ao processar o documento com IA.");
  }
};

// --- NEW FUNCTIONS ---

export const parseTransactionFromText = async (input: string): Promise<Partial<Transaction>> => {
  if (!ai) throw new Error("API Key não configurada");

  try {
    const prompt = `
      Extraia dados de transação do seguinte texto em linguagem natural.
      Hoje é: ${new Date().toISOString().split('T')[0]}.
      
      Texto: "${input}"
      
      Retorne APENAS um JSON com:
      - description: string (resumo do que é)
      - amount: number (valor numérico, ignore simbolos de moeda)
      - type: 'DESPESA' ou 'RECEITA' (default DESPESA se não especificado)
      - category: string (categoria sugerida)
      - date: string (formato YYYY-MM-DD, se mencionado 'ontem' calcule a data, se não, use hoje)
      - isRecurring: boolean (se o usuário disser "todo mês", "mensalmente", "assinatura", etc)
      - frequency: 'monthly' | 'weekly' | 'yearly' (se for recorrente)
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let jsonStr = response.text ? response.text.trim() : "{}";
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Erro no parser inteligente:", error);
    throw error;
  }
};

export const parseTransactionFromAudio = async (base64Audio: string): Promise<Partial<Transaction>> => {
  if (!ai) throw new Error("API Key não configurada");

  try {
    const prompt = `
      Ouça este áudio de uma pessoa descrevendo uma transação financeira.
      Hoje é: ${new Date().toISOString().split('T')[0]}.
      Extraia os detalhes e retorne APENAS um JSON com:
      - description: string (resumo claro da transação)
      - amount: number (valor numérico)
      - type: 'DESPESA' ou 'RECEITA' (tente inferir pelo contexto, ex: "gastei" = despesa, "recebi" = receita)
      - category: string (categoria sugerida em Português)
      - date: string (formato YYYY-MM-DD, se mencionado 'ontem' calcule, senão use hoje)
      - isRecurring: boolean (se disser "todo mês", "assinatura", "fixo", "mensalmente")
      - frequency: 'monthly' | 'weekly' | 'yearly' (se for recorrente)
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'audio/webm', // Assumindo formato padrão do navegador
              data: base64Audio
            }
          },
          { text: prompt }
        ]
      }
    });

    let jsonStr = response.text ? response.text.trim() : "{}";
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Erro no parser de áudio:", error);
    throw error;
  }
};

export const getAiChatResponse = async (question: string, contextData: any): Promise<string> => {
  if (!ai) return "Por favor, configure sua API Key para usar o chat.";

  try {
    // Reduzimos o contexto para não exceder tokens, focando em resumos
    const context = JSON.stringify({
      saldo: contextData.balance,
      gastos_por_categoria: contextData.categoryData,
      ultimas_transacoes: contextData.recentTransactions,
      metas: contextData.goals,
    });

    const prompt = `
      Você é um consultor financeiro pessoal inteligente e amigável.
      Use os dados fornecidos abaixo para responder à pergunta do usuário.
      Se a pergunta não for sobre finanças, responda educadamente que só pode ajudar com questões financeiras.
      
      Dados Financeiros Atuais:
      ${context}

      Pergunta do Usuário: "${question}"

      Responda de forma direta, útil e em Português. Use formatação Markdown se necessário.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Sem resposta.";
  } catch (error) {
    console.error("Erro no chat:", error);
    return "Desculpe, tive um problema ao processar sua pergunta.";
  }
};

export const suggestBudgets = async (history: Transaction[]): Promise<BudgetLimit[]> => {
  if (!ai) return [];

  try {
    const expenses = history.filter(t => t.type === 'DESPESA');
    const dataSummary = JSON.stringify(expenses.map(t => ({ c: t.category, a: t.amount })));

    const prompt = `
      Analise o histórico de despesas abaixo e sugira um orçamento (limite de gastos) mensal ideal para cada categoria identificada.
      Seja realista mas conservador para ajudar a economizar.
      
      Dados: ${dataSummary}

      Retorne APENAS um JSON array: [{ "category": "Nome", "limit": 1000 }]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let jsonStr = response.text ? response.text.trim() : "[]";
    const firstBrace = jsonStr.indexOf('[');
    const lastBrace = jsonStr.lastIndexOf(']');
    if (firstBrace !== -1 && lastBrace !== -1) jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Erro ao sugerir orçamentos:", error);
    return [];
  }
};

export const analyzeUserBehavior = async (transactions: Transaction[]): Promise<UserBehaviorAnalysis> => {
  if (!ai) throw new Error("API Key ausente");

  // Agrupar dados para economizar tokens
  const expenses = transactions.filter(t => t.type === 'DESPESA');
  const summary = expenses.map(t => `${t.date}: ${t.amount} (${t.category})`).slice(0, 50); // Últimas 50 transações
  const total = expenses.reduce((a, b) => a + b.amount, 0);
  const dataStr = JSON.stringify({ transactions: summary, totalSpent: total });

  try {
    const prompt = `
      Analise este histórico de transações financeiras de um usuário. Identifique padrões de comportamento.
      
      Dados: ${dataStr}

      Retorne APENAS um JSON com:
      - persona: string (Um arquétipo curto, ex: "Poupador Cauteloso", "Gastador Impulsivo", "Investidor", "Equilibrado", "Bon Vivant")
      - patternDescription: string (Uma frase descrevendo o principal padrão observado, ex: "Você gasta muito em Lazer nos fins de semana")
      - nextMonthProjection: number (Estimativa de gastos totais para o próximo mês baseado na média)
      - tip: string (Uma dica acionável e curta para melhorar)
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let jsonStr = response.text ? response.text.trim() : "{}";
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Erro ao analisar comportamento:", error);
    return {
      persona: "Em Análise",
      patternDescription: "Dados insuficientes para análise detalhada.",
      nextMonthProjection: 0,
      tip: "Continue registrando seus gastos."
    };
  }
};
