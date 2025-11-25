
import React, { useState } from 'react';
import { BackupConfig, User, UserRole, UserStatus } from '../types';
import { HardDrive, Save, Server, ChevronDown, ChevronUp, Users, UserPlus, Edit, Trash2, X, Sliders, AlertTriangle, Bell, Shield, Upload, Check, UserCheck, Lock, Unlock, Key, Bot, Sparkles, CheckCircle, RotateCcw } from 'lucide-react';
import { setGeminiKey, hasGeminiKey } from '../services/geminiService';

interface AdminPanelProps {
  appName: string;
  setAppName: (name: string) => void;
  backupConfig: BackupConfig;
  updateBackupConfig: (config: BackupConfig) => void;
  triggerManualBackup: () => void;
  users: User[];
  currentUser: User;
  onAddUser: (user: Omit<User, 'id'>) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onRestoreBackup: (file: File) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  appName,
  setAppName,
  backupConfig, 
  updateBackupConfig, 
  triggerManualBackup,
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onRestoreBackup
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('users');
  const [localAppName, setLocalAppName] = useState(appName);
  const [localConfig, setLocalConfig] = useState<BackupConfig>(backupConfig);
  const [isSaved, setIsSaved] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  
  // Security / Password State
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '', question: '', answer: '' });
  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null);
  const [forceResetPassword, setForceResetPassword] = useState('');

  // AI Integration State
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  const [userFormData, setUserFormData] = useState({ 
    name: '', 
    username: '',
    password: '',
    role: UserRole.MEMBER, 
    avatar: '', 
    birthDate: '', 
    allowParentView: false 
  });

  const toggleSection = (section: string) => setExpandedSection(expandedSection === section ? null : section);

  const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;
  const isAdmin = currentUser.role === UserRole.ADMIN || isSuperAdmin;
  const isManager = currentUser.role === UserRole.MANAGER;
  const isMember = currentUser.role === UserRole.MEMBER;

  const visibleUsers = users.filter(u => {
    if (isSuperAdmin || isAdmin) return true;
    if (isManager) return u.familyId === currentUser.familyId;
    if (isMember) return u.id === currentUser.id;
    return false;
  });

  const pendingUsers = users.filter(u => u.status === UserStatus.PENDING);

  const canResetPassword = (targetUser: User) => {
    if (targetUser.id === currentUser.id) return false;
    if (isAdmin) {
       if (targetUser.role === UserRole.MEMBER) return false;
       return true;
    }
    if (isManager) {
      if (targetUser.role === UserRole.MEMBER && targetUser.familyId === currentUser.familyId) return true;
      return false;
    }
    return false;
  };

  const handleGeneralSave = () => {
    setAppName(localAppName);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleApiKeySave = () => {
    if (apiKeyInput.trim().length > 10) {
      setGeminiKey(apiKeyInput.trim());
      setKeySaved(true);
      setApiKeyInput('');
      setTimeout(() => setKeySaved(false), 3000);
    } else {
      alert("Chave muito curta. Verifique se copiou corretamente.");
    }
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return alert("Navegador sem suporte.");
    const permission = await Notification.requestPermission();
    if (permission === "granted") new Notification(appName, { body: "Notificações ativadas!" });
  };

  const handleResetData = () => {
    if (confirm("PERIGO: Isso apagará TODOS os dados, incluindo todos os usuários e transações. Esta ação é irreversível. Confirmar?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUser) {
      onUpdateUser({ 
        ...editingUser, 
        name: userFormData.name,
        username: userFormData.username,
        avatar: userFormData.avatar,
        role: userFormData.role,
        birthDate: userFormData.birthDate,
        allowParentView: userFormData.allowParentView
      });
    } else {
      onAddUser({
        name: userFormData.name,
        username: userFormData.username,
        password: userFormData.password || '123456', // Default temp password
        role: userFormData.role,
        avatar: userFormData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userFormData.username}`,
        status: UserStatus.APPROVED,
        createdBy: currentUser.id,
        familyId: isManager ? currentUser.familyId : undefined,
        birthDate: userFormData.birthDate,
        allowParentView: userFormData.allowParentView
      });
    }
    setIsUserFormOpen(false);
    setEditingUser(null);
    setUserFormData({ name: '', username: '', password: '', role: UserRole.MEMBER, avatar: '', birthDate: '', allowParentView: false });
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormData({
      name: user.name,
      username: user.username,
      password: '',
      role: user.role,
      avatar: user.avatar,
      birthDate: user.birthDate || '',
      allowParentView: user.allowParentView || false
    });
    setIsUserFormOpen(true);
  };

  const handleBackupConfigSave = () => {
    updateBackupConfig(localConfig);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleForceReset = () => {
    if (!resetTargetUser || !forceResetPassword) return;
    onUpdateUser({ ...resetTargetUser, password: forceResetPassword });
    alert(`Senha de ${resetTargetUser.name} redefinida com sucesso.`);
    setResetTargetUser(null);
    setForceResetPassword('');
  };

  const handleMyPasswordChange = () => {
    if (passwordForm.new !== passwordForm.confirm) return alert("Senhas não coincidem");
    if (currentUser.password !== passwordForm.current) return alert("Senha atual incorreta");
    
    const updates: Partial<User> = { password: passwordForm.new };
    if (passwordForm.question && passwordForm.answer) {
      updates.securityQuestion = { question: passwordForm.question, answer: passwordForm.answer };
    }
    
    onUpdateUser({ ...currentUser, ...updates });
    alert("Segurança atualizada com sucesso!");
    setPasswordForm({ current: '', new: '', confirm: '', question: '', answer: '' });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center">
        <Shield className="mr-3 text-primary-600" /> Administração do Sistema
        {isSuperAdmin && <span className="ml-2 text-xs bg-slate-800 text-white px-2 py-1 rounded uppercase">Controle Total</span>}
      </h2>

      {/* SECTION 1: INTEGRAÇÕES (API KEY) */}
      {(isAdmin || isManager) && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
          <button 
            onClick={() => toggleSection('integrations')}
            className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <div className="flex items-center">
              <Bot size={20} className="text-indigo-500 mr-3" />
              <div className="text-left">
                <h3 className="font-bold text-slate-800 dark:text-white">Integrações & IA</h3>
                <p className="text-xs text-slate-500">Configure o Google Gemini para recursos inteligentes.</p>
              </div>
            </div>
            {expandedSection === 'integrations' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {expandedSection === 'integrations' && (
            <div className="p-6 border-t border-slate-100 dark:border-slate-700">
               <div className="space-y-4 max-w-2xl">
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Google Gemini API Key</label>
                   <div className="flex gap-2">
                     <input 
                       type="password" 
                       value={apiKeyInput}
                       onChange={e => setApiKeyInput(e.target.value)}
                       placeholder={hasGeminiKey() ? "Chave configurada (oculta)" : "Cole sua chave aqui (AI Studio)"}
                       className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                     />
                     <button 
                       onClick={handleApiKeySave}
                       className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition flex items-center"
                     >
                       {keySaved ? <CheckCircle size={18} /> : <Save size={18} />}
                     </button>
                   </div>
                   <p className="text-xs text-slate-400 mt-2">
                     Necessária para: Categorização automática, Chat Financeiro, Leitura de PDF e Análise de Comportamento.
                     <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-indigo-500 hover:underline ml-1">Obter chave grátis</a>
                   </p>
                 </div>
               </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: USER MANAGEMENT */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
        <button 
          onClick={() => toggleSection('users')}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <div className="flex items-center">
            <Users size={20} className="text-primary-500 mr-3" />
            <div className="text-left">
              <h3 className="font-bold text-slate-800 dark:text-white">Gestão de Usuários</h3>
              <p className="text-xs text-slate-500">{visibleUsers.length} usuários ativos na sua visualização.</p>
            </div>
          </div>
          {expandedSection === 'users' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSection === 'users' && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-700">
            {/* APPROVALS */}
            {isAdmin && pendingUsers.length > 0 && (
              <div className="mb-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl">
                <h4 className="font-bold text-amber-700 dark:text-amber-400 mb-3 flex items-center"><AlertTriangle size={18} className="mr-2"/> Pendentes de Aprovação</h4>
                <div className="space-y-2">
                  {pendingUsers.map(u => (
                    <div key={u.id} className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm">
                      <span className="font-medium text-slate-700 dark:text-white">{u.name} ({u.username})</span>
                      <div className="flex gap-2">
                        <button onClick={() => onUpdateUser({...u, status: UserStatus.APPROVED})} className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200"><Check size={16}/></button>
                        <button onClick={() => onUpdateUser({...u, status: UserStatus.REJECTED})} className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200"><X size={16}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between mb-4">
              <h4 className="font-bold text-slate-700 dark:text-slate-200">Membros da Família</h4>
              <button onClick={() => { setEditingUser(null); setIsUserFormOpen(true); }} className="flex items-center px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition">
                <UserPlus size={16} className="mr-2" /> Adicionar
              </button>
            </div>

            <div className="space-y-3">
              {visibleUsers.map(u => (
                <div key={u.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-primary-200 transition">
                  <div className="flex items-center mb-3 md:mb-0">
                    <img src={u.avatar} className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600" />
                    <div className="ml-3">
                      <p className="font-bold text-slate-800 dark:text-white">{u.name} {u.id === currentUser.id && <span className="text-xs text-primary-500">(Você)</span>}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">{u.role}</span>
                        <span className="text-xs text-slate-400">@{u.username}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {canResetPassword(u) && (
                      <button onClick={() => setResetTargetUser(u)} className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg" title="Resetar Senha">
                        <Key size={18} />
                      </button>
                    )}
                    <button onClick={() => openEditUser(u)} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg">
                      <Edit size={18} />
                    </button>
                    {u.id !== currentUser.id && (
                      <button onClick={() => { if(confirm(`Remover ${u.name}?`)) onDeleteUser(u.id); }} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* USER FORM MODAL */}
            {isUserFormOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <form onSubmit={handleUserSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-2xl w-full max-w-md animate-scale-in">
                  <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">{editingUser ? 'Editar Usuário' : 'Novo Membro'}</h3>
                  
                  <div className="space-y-3">
                    <input type="text" placeholder="Nome Completo" required value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                    <input type="text" placeholder="Username (Login)" required value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                    {!editingUser && (
                      <input type="password" placeholder="Senha Inicial" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                    )}
                    
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Função</label>
                      <select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as UserRole})} className="w-full p-3 rounded-xl border dark:bg-slate-900 dark:border-slate-700 dark:text-white mt-1">
                        <option value={UserRole.MEMBER}>Membro</option>
                        {(isAdmin || isManager) && <option value={UserRole.MANAGER}>Gestor (Manager)</option>}
                        {isSuperAdmin && <option value={UserRole.ADMIN}>Admin</option>}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Data de Nascimento</label>
                      <input type="date" value={userFormData.birthDate} onChange={e => setUserFormData({...userFormData, birthDate: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-slate-900 dark:border-slate-700 dark:text-white mt-1" />
                    </div>

                    {/* Avatar URL input removed for simplicity, relying on Dicebear or Sidebar upload */}
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                    <button type="button" onClick={() => setIsUserFormOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl">Cancelar</button>
                    <button type="submit" className="px-6 py-2 bg-primary-600 text-white font-bold rounded-xl">{editingUser ? 'Salvar' : 'Criar'}</button>
                  </div>
                </form>
              </div>
            )}

            {/* RESET PASSWORD MODAL */}
            {resetTargetUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-2xl w-full max-w-sm animate-scale-in">
                  <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Resetar Senha: {resetTargetUser.name}</h3>
                  <input 
                    type="text" 
                    placeholder="Nova Senha" 
                    value={forceResetPassword}
                    onChange={e => setForceResetPassword(e.target.value)}
                    className="w-full p-3 rounded-xl border dark:bg-slate-900 dark:border-slate-700 dark:text-white mb-4" 
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setResetTargetUser(null)} className="px-4 py-2 text-slate-500">Cancelar</button>
                    <button onClick={handleForceReset} className="px-4 py-2 bg-amber-500 text-white font-bold rounded-xl">Confirmar</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 3: GENERAL SETTINGS */}
      {(isAdmin || isManager) && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
          <button 
            onClick={() => toggleSection('general')}
            className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <div className="flex items-center">
              <Sliders size={20} className="text-slate-500 mr-3" />
              <div className="text-left">
                <h3 className="font-bold text-slate-800 dark:text-white">Geral</h3>
                <p className="text-xs text-slate-500">Nome do app e preferências.</p>
              </div>
            </div>
            {expandedSection === 'general' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {expandedSection === 'general' && (
            <div className="p-6 border-t border-slate-100 dark:border-slate-700 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Aplicação</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={localAppName}
                    onChange={e => setLocalAppName(e.target.value)}
                    className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  />
                  <button onClick={handleGeneralSave} className="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold flex items-center">
                    {isSaved ? <Check size={18}/> : <Save size={18}/>}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                <div className="flex items-center">
                  <Bell className="text-slate-400 mr-3" size={20} />
                  <span className="text-sm font-medium dark:text-white">Notificações do Navegador</span>
                </div>
                <button onClick={requestNotificationPermission} className="text-xs font-bold text-primary-600 hover:underline">
                  Ativar / Testar
                </button>
              </div>

              {isSuperAdmin && (
                <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl">
                  <h4 className="text-rose-600 font-bold text-sm flex items-center mb-2"><AlertTriangle size={16} className="mr-2"/> Zona de Perigo</h4>
                  <button onClick={handleResetData} className="w-full py-2 bg-rose-600 text-white rounded-lg font-bold text-sm hover:bg-rose-700">
                    Resetar Fábrica (Apagar Tudo)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: SECURITY */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
        <button 
          onClick={() => toggleSection('security')}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <div className="flex items-center">
            <Lock size={20} className="text-emerald-500 mr-3" />
            <div className="text-left">
              <h3 className="font-bold text-slate-800 dark:text-white">Segurança & Senhas</h3>
              <p className="text-xs text-slate-500">Altere sua senha e perguntas de segurança.</p>
            </div>
          </div>
          {expandedSection === 'security' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSection === 'security' && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-700 max-w-lg">
             <div className="space-y-3">
                <input type="password" placeholder="Senha Atual" value={passwordForm.current} onChange={e => setPasswordForm({...passwordForm, current: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                <input type="password" placeholder="Nova Senha" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                <input type="password" placeholder="Confirmar Nova Senha" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Recuperação de Conta</p>
                  <input type="text" placeholder="Pergunta de Segurança (ex: Nome do cachorro)" value={passwordForm.question} onChange={e => setPasswordForm({...passwordForm, question: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-slate-900 dark:border-slate-700 dark:text-white mb-2" />
                  <input type="text" placeholder="Resposta" value={passwordForm.answer} onChange={e => setPasswordForm({...passwordForm, answer: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                </div>

                <button onClick={handleMyPasswordChange} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 mt-2">
                  Atualizar Segurança
                </button>
             </div>
          </div>
        )}
      </div>

      {/* SECTION 5: BACKUP */}
      {(isAdmin || isManager) && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
          <button 
            onClick={() => toggleSection('backup')}
            className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <div className="flex items-center">
              <HardDrive size={20} className="text-blue-500 mr-3" />
              <div className="text-left">
                <h3 className="font-bold text-slate-800 dark:text-white">Rede & Backup</h3>
                <p className="text-xs text-slate-500">Gerencie dados e locais de armazenamento.</p>
              </div>
            </div>
            {expandedSection === 'backup' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {expandedSection === 'backup' && (
            <div className="p-6 border-t border-slate-100 dark:border-slate-700 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Caminho SMB (Rede)</label>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                    <Server size={18} className="text-slate-400 mr-2" />
                    <input 
                      type="text" 
                      value={localConfig.networkPath}
                      onChange={e => setLocalConfig({...localConfig, networkPath: e.target.value})}
                      className="bg-transparent w-full outline-none text-sm dark:text-white"
                      placeholder="\\SERVER\Share"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pasta Raiz</label>
                  <input 
                    type="text" 
                    value={localConfig.rootDataFolder}
                    onChange={e => setLocalConfig({...localConfig, rootDataFolder: e.target.value})}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none text-sm dark:text-white"
                    placeholder="/data/financas"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Frequência Automática</label>
                <div className="flex gap-2">
                  {['daily', 'weekly', 'monthly', 'manual'].map((freq) => (
                    <button
                      key={freq}
                      onClick={() => setLocalConfig({ ...localConfig, frequency: freq as any })}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition ${localConfig.frequency === freq ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}
                    >
                      {freq === 'daily' ? 'Diário' : freq === 'weekly' ? 'Semanal' : freq === 'monthly' ? 'Mensal' : 'Manual'}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleBackupConfigSave} className="w-full py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-900 dark:hover:bg-slate-600 transition">
                Salvar Configurações
              </button>

              <hr className="border-slate-100 dark:border-slate-700" />

              <div className="flex flex-col md:flex-row gap-4">
                <button onClick={triggerManualBackup} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition flex justify-center items-center">
                  <Upload size={20} className="mr-2" /> Fazer Backup Agora
                </button>
                
                <label className="flex-1 py-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition flex justify-center items-center cursor-pointer">
                  <RotateCcw size={20} className="mr-2" /> Restaurar Backup
                  <input type="file" className="hidden" accept=".json" onChange={(e) => e.target.files && onRestoreBackup(e.target.files[0])} />
                </label>
              </div>
              
              {backupConfig.lastBackup && (
                <p className="text-center text-xs text-slate-400">
                  Último backup: {new Date(backupConfig.lastBackup).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
