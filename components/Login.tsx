
import React, { useState } from 'react';
import { User, UserStatus } from '../types';
import { Lock, User as UserIcon, LogIn, HelpCircle, ArrowLeft, CheckCircle, ShieldAlert, UserPlus } from 'lucide-react';
import Register from './Register';

interface LoginProps {
  appName: string;
  users: User[];
  onLogin: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onRegister: (user: Omit<User, 'id'>) => void; // New prop
}

const Login: React.FC<LoginProps> = ({ appName, users, onLogin, onUpdateUser, onRegister }) => {
  const [view, setView] = useState<'login' | 'recovery' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Recovery State
  const [recoveryUser, setRecoveryUser] = useState<User | null>(null);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<1 | 2 | 3>(1);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      if (user.status === UserStatus.PENDING) {
        setError("Sua conta ainda está aguardando aprovação do administrador.");
        return;
      }
      if (user.status === UserStatus.REJECTED) {
        setError("Sua conta foi desativada.");
        return;
      }
      onLogin(user);
    } else {
      setError("Usuário ou senha incorretos.");
    }
  };

  const handleIdentifyUser = () => {
    const user = users.find(u => u.username === username);
    if (!user) {
      setError("Usuário não encontrado.");
      return;
    }
    if (!user.securityQuestion) {
      setError("Este usuário não configurou perguntas de segurança.");
      return;
    }
    setRecoveryUser(user);
    setRecoveryStep(2);
    setError('');
  };

  const handleVerifyAnswer = () => {
    if (!recoveryUser?.securityQuestion) return;
    if (securityAnswer.toLowerCase().trim() === recoveryUser.securityQuestion.answer.toLowerCase().trim()) {
      setRecoveryStep(3);
      setError('');
    } else {
      setError("Resposta incorreta.");
    }
  };

  const handleResetPassword = () => {
    if (!recoveryUser) return;
    onUpdateUser({ ...recoveryUser, password: newPassword });
    alert("Senha redefinida com sucesso!");
    setView('login');
    setPassword('');
    setRecoveryStep(1);
    setRecoveryUser(null);
  };

  const handleRegisterSubmit = (userData: Omit<User, 'id'>) => {
    onRegister(userData);
    alert("Família registrada com sucesso! Faça login.");
    setView('login');
  };

  if (view === 'register') {
    return <Register onRegister={handleRegisterSubmit} onCancel={() => setView('login')} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 w-full max-w-md border border-slate-200 dark:border-slate-700 animate-scale-in">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-primary-500/30 mb-4">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{appName}</h1>
          <p className="text-slate-500 text-sm">Gestão Financeira Familiar</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl text-sm flex items-center animate-shake">
            <ShieldAlert size={18} className="mr-2 shrink-0" />
            {error}
          </div>
        )}

        {view === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Usuário</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-10 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Seu usuário"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="••••••"
                />
              </div>
            </div>
            
            <button type="submit" className="w-full py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-500/30 flex justify-center items-center">
              <LogIn className="mr-2" size={20} /> Entrar
            </button>

            <div className="flex justify-between items-center mt-4">
              <button 
                type="button" 
                onClick={() => { setView('recovery'); setError(''); setUsername(''); }}
                className="text-sm text-slate-400 hover:text-primary-600 font-medium"
              >
                Esqueci minha senha
              </button>
              <button 
                type="button" 
                onClick={() => setView('register')}
                className="text-sm text-emerald-600 font-bold hover:text-emerald-700 flex items-center"
              >
                Criar Família <UserPlus size={14} className="ml-1"/>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center mb-4">
               <button onClick={() => { setView('login'); setError(''); setRecoveryStep(1); }} className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
                 <ArrowLeft size={20} />
               </button>
               <h3 className="font-bold text-slate-800 dark:text-white ml-2">Recuperação de Senha</h3>
            </div>

            {recoveryStep === 1 && (
              <>
                <p className="text-sm text-slate-500 mb-4">Digite seu nome de usuário para começar.</p>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border" placeholder="Nome de usuário" />
                <button onClick={handleIdentifyUser} className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl">Continuar</button>
              </>
            )}

            {recoveryStep === 2 && recoveryUser && (
              <>
                <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl mb-2">
                  <p className="text-xs font-bold text-primary-600 uppercase">Pergunta de Segurança</p>
                  <p className="font-medium text-slate-800 dark:text-white">{recoveryUser.securityQuestion?.question}</p>
                </div>
                <input type="text" value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border" placeholder="Sua resposta" />
                <button onClick={handleVerifyAnswer} className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl">Verificar</button>
              </>
            )}

            {recoveryStep === 3 && (
              <>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border" placeholder="Nova senha" />
                <button onClick={handleResetPassword} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl">Redefinir</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
