import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    if (confirm("Isso apagará todos os dados locais para corrigir o erro. Continuar?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 font-sans">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl max-w-md text-center border border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Ops! Algo deu errado.</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
              Ocorreu um erro inesperado na aplicação. Tente recarregar a página.
            </p>
            
            <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl text-xs font-mono text-left mb-6 overflow-auto max-h-32 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {this.state.error?.toString()}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition flex items-center justify-center shadow-lg shadow-primary-500/30"
              >
                <RefreshCw size={18} className="mr-2" /> Tentar Novamente
              </button>
              <button
                onClick={this.handleReset}
                className="w-full py-3.5 bg-white dark:bg-slate-700 text-rose-500 dark:text-rose-400 border border-rose-100 dark:border-slate-600 rounded-xl font-bold hover:bg-rose-50 dark:hover:bg-slate-600 transition flex items-center justify-center"
              >
                <Trash2 size={18} className="mr-2" /> Resetar Dados (Emergência)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}