
import React, { useState } from 'react';
import { BackupConfig, User, UserRole, UserStatus } from '../types';
import { HardDrive, Save, Server, ChevronDown, ChevronUp, Users, UserPlus, Edit, Trash2, X, Sliders, AlertTriangle, Bell, Shield, Upload, Check, UserCheck, Lock, Unlock, Key, RefreshCw } from 'lucide-react';

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
        birthDate: userFormData.birthDate,
        allowParentView: userFormData.allowParentView,
        role: isAdmin ? userFormData.role : editingUser.role 
      });
    } else {
      if (!userFormData.password) return alert("Senha é obrigatória para novos usuários.");
      onAddUser({
        ...userFormData,
        role: isManager ? UserRole.MEMBER : userFormData.role,
        status: UserStatus.APPROVED, 
        createdBy: currentUser.id,
        familyId: isManager ? currentUser.familyId : undefined,
        allowParentView: userFormData.allowParentView
      });
    }
    setIsUserFormOpen(false);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.current !== currentUser.password) return alert("Senha atual incorreta.");
    if (passwordForm.new !== passwordForm.confirm) return alert("Novas senhas não coincidem.");
    
    onUpdateUser({
      ...currentUser,
      password: passwordForm.new,
      securityQuestion: passwordForm.question ? { question: passwordForm.question, answer: passwordForm.answer } : currentUser.securityQuestion
    });
    alert("Senha e segurança atualizadas!");
    setPasswordForm({ current: '', new: '', confirm: '', question: '', answer: '' });
  };

  const handleForceReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !forceResetPassword) return;
    
    onUpdateUser({
      ...resetTargetUser,
      password: forceResetPassword
    });
    alert(`Senha de ${resetTargetUser.name} redefinida com sucesso.`);
    setResetTargetUser(null);
    setForceResetPassword('');
  };

  const handleDeleteClick = (userId: string, userName: string) => {
    if (confirm(`Tem certeza que deseja excluir o usuário "${userName}"?`)) {
      onDeleteUser(userId);
    }
  };

  const handleApproveUser = (user: User) => {
    onUpdateUser({ ...user, status: UserStatus.APPROVED });
  };

  const handleRejectUser = (user: User) => {
    if(confirm('Rejeitar e remover este usuário?')) onDeleteUser(user.id);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files[0]) {
        if(confirm("ATENÇÃO: Restaurar um backup substituirá TODOS os dados atuais. Deseja continuar?")) {
           onRestoreBackup(e.target.files[0]);
        }
     }
  }

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return 0;
    const diff = Date.now() - new Date(birthDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  };

  const inputClass = "w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all";

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-20">
      <div className="flex items-center space-x-4 mb-8">
        <div className="p-4 bg-slate-800 text-white rounded-2xl shadow-lg shadow-slate-500/20">
           {isSuperAdmin ? <Shield size={32} /> : <Sliders size={32} />}
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">
            {isManager ? 'Gestão Familiar' : 'Administração do Sistema'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {isSuperAdmin ? 'Controle Total (Super Admin)' : isAdmin ? 'Gestão de Membros e Aprovações' : 'Gerencie os membros da sua família'}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Aprovações (Apenas Admins) */}
        {isAdmin && pendingUsers.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-3xl p-6">
            <h3 className="text-lg font-bold text-amber-800 dark:text-amber-400 mb-4 flex items-center">
              <UserCheck className="mr-2" /> Aprovações Pendentes ({pendingUsers.length})
            </h3>
            <div className="space-y-2">
              {pendingUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-amber-100 dark:border-amber-800">
                   <div className="flex items-center gap-3">
                     <img src={u.avatar} className="w-8 h-8 rounded-full" />
                     <span className="text-slate-800 dark:text-white font-medium">{u.name} <span className="text-xs text-slate-400">({u.role})</span></span>
                   </div>
                   <div className="flex gap-2">
                     <button onClick={() => handleApproveUser(u)} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 font-bold text-xs flex items-center"><Check size={14} className="mr-1"/> Aprovar</button>
                     <button onClick={() => handleRejectUser(u)} className="p-1.5 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 font-bold text-xs flex items-center"><X size={14} className="mr-1"/> Rejeitar</button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 1. General Settings (Only Admin/Super Admin) */}
        {isAdmin && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div onClick={() => toggleSection('general')} className="p-6 flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg mr-4"><Sliders size={20} /></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Geral</h3>
              </div>
              {expandedSection === 'general' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
            {expandedSection === 'general' && (
              <div className="p-8 border-t border-slate-100 dark:border-slate-700 animate-slide-down">
                <div className="grid md:grid-cols-2 gap-8">
                   <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome do App</label>
                     <div className="flex gap-3">
                       <input type="text" value={localAppName} onChange={(e) => setLocalAppName(e.target.value)} className={inputClass} />
                       <button onClick={handleGeneralSave} className="bg-slate-800 text-white px-6 rounded-xl font-bold hover:bg-slate-700 transition shadow-lg shadow-slate-500/20">{isSaved ? 'OK' : 'Salvar'}</button>
                     </div>
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Alertas</label>
                     <button onClick={requestNotificationPermission} className="w-full p-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white font-bold rounded-xl hover:bg-slate-200 flex items-center justify-center gap-2"><Bell size={18} /> Testar Notificações</button>
                   </div>
                </div>
                {isSuperAdmin && (
                  <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-bold text-rose-500 uppercase mb-2">Zona de Perigo (Super Admin)</p>
                    <button onClick={handleResetData} className="flex items-center text-rose-600 hover:text-rose-700 font-bold text-sm bg-rose-50 dark:bg-rose-900/20 px-4 py-2 rounded-lg border border-rose-200 dark:border-rose-800"><AlertTriangle size={16} className="mr-2" /> Resetar Dados de Fábrica</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. Security Management */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div onClick={() => toggleSection('security')} className="p-6 flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
            <div className="flex items-center">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-lg mr-4"><Lock size={20} /></div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Segurança & Senhas</h3>
            </div>
            {expandedSection === 'security' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {expandedSection === 'security' && (
            <div className="p-8 border-t border-slate-100 dark:border-slate-700 animate-slide-down">
              {/* Alterar Própria Senha */}
              <div className="mb-8">
                <h4 className="font-bold mb-4 text-slate-700 dark:text-white">Alterar Minha Senha</h4>
                <form onSubmit={handleChangePassword} className="grid md:grid-cols-2 gap-4">
                   <input type="password" placeholder="Senha Atual" required value={passwordForm.current} onChange={e => setPasswordForm({...passwordForm, current: e.target.value})} className={inputClass} />
                   <div className="hidden md:block"></div>
                   <input type="password" placeholder="Nova Senha" required value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} className={inputClass} />
                   <input type="password" placeholder="Confirmar Nova Senha" required value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} className={inputClass} />
                   
                   <div className="md:col-span-2 mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                     <p className="text-xs text-slate-500 mb-3 font-bold uppercase">Configurar Recuperação (Opcional)</p>
                     <div className="grid md:grid-cols-2 gap-4">
                       <input type="text" placeholder="Pergunta de Segurança" value={passwordForm.question} onChange={e => setPasswordForm({...passwordForm, question: e.target.value})} className={inputClass} />
                       <input type="text" placeholder="Resposta" value={passwordForm.answer} onChange={e => setPasswordForm({...passwordForm, answer: e.target.value})} className={inputClass} />
                     </div>
                   </div>
                   
                   <button type="submit" className="md:col-span-2 bg-slate-800 text-white py-3 rounded-xl font-bold mt-2 shadow-lg hover:bg-slate-700 transition">Atualizar Segurança</button>
                </form>
              </div>

              {/* Resetar Senha de Subordinados */}
              <div className="pt-8 border-t border-slate-100 dark:border-slate-700">
                <h4 className="font-bold mb-4 text-slate-700 dark:text-white flex items-center">
                  <Key className="mr-2" size={18} /> Redefinição de Senha (Gestão)
                </h4>
                {resetTargetUser ? (
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-2xl border border-orange-100 dark:border-orange-800">
                    <p className="text-sm font-bold text-orange-800 dark:text-orange-400 mb-2">Redefinindo senha para: {resetTargetUser.name}</p>
                    <form onSubmit={handleForceReset} className="flex gap-2">
                       <input type="text" placeholder="Nova Senha" required value={forceResetPassword} onChange={e => setForceResetPassword(e.target.value)} className={inputClass} />
                       <button type="submit" className="bg-orange-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-orange-700 transition">Salvar</button>
                       <button type="button" onClick={() => setResetTargetUser(null)} className="text-slate-500 px-4 hover:text-slate-700 font-medium">Cancelar</button>
                    </form>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {visibleUsers.filter(u => canResetPassword(u)).length > 0 ? (
                      visibleUsers.filter(u => canResetPassword(u)).map(u => (
                        <button key={u.id} onClick={() => setResetTargetUser(u)} className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm flex justify-between items-center group bg-slate-50 dark:bg-slate-900/50">
                          <span className="font-medium text-slate-700 dark:text-slate-200">{u.name} <span className="text-xs text-slate-400">({u.role})</span></span>
                          <Key size={14} className="text-slate-400 group-hover:text-primary-500" />
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 italic col-span-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl text-center">Nenhum usuário disponível para redefinição.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. Users Management */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div onClick={() => toggleSection('users')} className="p-6 flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg mr-4"><Users size={20} /></div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">{isManager ? 'Membros da Família' : 'Gestão de Usuários'}</h3>
            </div>
            {expandedSection === 'users' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {expandedSection === 'users' && (
            <div className="p-8 border-t border-slate-100 dark:border-slate-700 animate-slide-down">
              {isUserFormOpen ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl mb-6 border border-slate-200 dark:border-slate-700 animate-scale-in p-6 shadow-lg shadow-slate-200/50 dark:shadow-none">
                  <div className="flex justify-between mb-6"><h4 className="font-bold text-lg text-slate-800 dark:text-white">{editingUser ? 'Editar Perfil' : 'Novo Perfil'}</h4><button type="button" onClick={() => setIsUserFormOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button></div>
                  <form onSubmit={handleUserSubmit}>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label>
                      <input type="text" required value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Usuário (Login)</label>
                      <input type="text" required value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} className={inputClass} />
                    </div>
                    {!editingUser && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha Inicial</label>
                        <input type="password" required value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className={inputClass} />
                      </div>
                    )}
                    {isAdmin && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Permissão</label>
                        <select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as UserRole})} className={inputClass}>
                          <option value={UserRole.MEMBER}>Membro</option>
                          <option value={UserRole.MANAGER}>Gestor de Família</option>
                          <option value={UserRole.ADMIN}>Administrador</option>
                          {isSuperAdmin && <option value={UserRole.SUPER_ADMIN}>Super Admin</option>}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data de Nascimento</label>
                      <input type="date" value={userFormData.birthDate} onChange={e => setUserFormData({...userFormData, birthDate: e.target.value})} className={inputClass} />
                    </div>
                    
                    <div className="flex items-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex-1">
                        <span className="block text-sm font-bold text-slate-700 dark:text-white flex items-center">
                           <Lock size={14} className="mr-1"/> Privacidade
                        </span>
                        <span className="text-xs text-slate-400">Permitir que o gestor visualize finanças (se > 18)</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={userFormData.allowParentView} 
                        onChange={e => setUserFormData({...userFormData, allowParentView: e.target.checked})} 
                        className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Avatar / Foto</label>
                       <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                         <div className="relative group w-16 h-16 rounded-full overflow-hidden bg-white border-2 border-slate-200">
                            <img src={userFormData.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=new'} className="w-full h-full object-cover" />
                         </div>
                         <div className="flex-1">
                           <div className="relative">
                             <input type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" id="avatar-upload" />
                             <label htmlFor="avatar-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-white dark:hover:bg-slate-700 transition text-slate-600 dark:text-slate-300 font-bold text-sm">
                               <Upload size={16} className="mr-2" />
                               Escolher arquivo
                             </label>
                           </div>
                         </div>
                       </div>
                    </div>
                  </div>
                  <button type="submit" className="mt-6 bg-primary-600 text-white w-full py-3 rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-500/30 transition">Salvar Alterações</button>
                  </form>
                </div>
              ) : (
                <button onClick={() => { 
                  setEditingUser(null); 
                  setUserFormData({ name: '', username: '', password: '', role: UserRole.MEMBER, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`, birthDate: '', allowParentView: true }); 
                  setIsUserFormOpen(true); 
                }} className="mb-6 flex items-center gap-2 px-6 py-3 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300 rounded-xl font-bold hover:bg-primary-100 dark:hover:bg-primary-900/40 transition">
                  <UserPlus size={18}/> {isManager ? 'Adicionar Membro' : 'Adicionar Usuário'}
                </button>
              )}
              <div className="space-y-3">
                {visibleUsers.map(user => {
                  const age = calculateAge(user.birthDate);
                  const isChild = age < 18;
                  const isVisibleToParent = isChild || user.allowParentView;

                  return (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900/30 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex items-center gap-4">
                        <img src={user.avatar} className="w-12 h-12 rounded-full border-2 border-slate-100 dark:border-slate-600 object-cover" />
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white flex items-center text-lg">
                            {user.name} 
                            {user.id === currentUser.id && <span className="ml-2 text-[10px] bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full uppercase tracking-wider">Eu</span>}
                          </p>
                          <div className="flex gap-2 text-xs mt-1">
                             <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">{user.role}</span>
                             {user.birthDate && <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">{age} anos</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        {user.createdBy === currentUser.id && (
                           <span title={isVisibleToParent ? "Visível para você" : "Privado"} className={`p-2 rounded-lg ${isVisibleToParent ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
                              {isVisibleToParent ? <Unlock size={18} /> : <Lock size={18} />}
                           </span>
                        )}
                        <button onClick={() => { 
                          setEditingUser(user); 
                          setUserFormData({ 
                            name: user.name, 
                            username: user.username,
                            password: '', // Não mostra senha
                            role: user.role, 
                            avatar: user.avatar, 
                            birthDate: user.birthDate || '', 
                            allowParentView: user.allowParentView || false 
                          }); 
                          setIsUserFormOpen(true); 
                        }} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition"><Edit size={18}/></button>
                        
                        {(isSuperAdmin || (isAdmin && user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.ADMIN) || (isManager && user.role === UserRole.MEMBER && user.familyId === currentUser.familyId)) && user.id !== currentUser.id && (
                          <button onClick={() => handleDeleteClick(user.id, user.name)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition"><Trash2 size={18}/></button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 4. Backup (Only Admin) */}
        {isAdmin && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div onClick={() => toggleSection('backup')} className="p-6 flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-4"><Server size={20} /></div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Rede & Backup</h3>
              </div>
              {expandedSection === 'backup' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
            {expandedSection === 'backup' && (
              <div className="p-8 border-t border-slate-100 dark:border-slate-700 animate-slide-down">
                <div className="grid gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Caminho SMB</label>
                    <input type="text" value={localConfig.networkPath} onChange={(e) => setLocalConfig({...localConfig, networkPath: e.target.value})} className={`${inputClass} font-mono text-sm mt-2`} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Pasta Raiz</label>
                    <input type="text" value={localConfig.rootDataFolder} onChange={(e) => setLocalConfig({...localConfig, rootDataFolder: e.target.value})} className={`${inputClass} font-mono text-sm mt-2`} />
                  </div>
                  <button onClick={() => { updateBackupConfig(localConfig); alert('Salvo'); }} className="bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-500/20 transition">Salvar Configuração</button>
                  
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-slate-800 text-white p-6 rounded-2xl flex flex-col justify-between shadow-xl">
                      <div><h4 className="font-bold text-lg mb-1">Backup Manual</h4><p className="text-sm text-slate-400">Último: {backupConfig.lastBackup || 'Nunca'}</p></div>
                      <button onClick={triggerManualBackup} className="mt-6 bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 flex items-center justify-center gap-2 transition"><HardDrive size={18}/> Download Backup</button>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-2xl flex flex-col justify-between border border-orange-200 dark:border-orange-800">
                      <div><h4 className="font-bold text-orange-800 dark:text-orange-400 text-lg mb-1">Restaurar Dados</h4><p className="text-sm text-orange-700/70 dark:text-orange-400/70">Substitui todos os dados atuais.</p></div>
                      <label className="mt-6 bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-200 dark:hover:bg-orange-700 flex items-center justify-center gap-2 cursor-pointer transition">
                        <Upload size={18}/> 
                        <span>Carregar JSON</span>
                        <input type="file" accept=".json" className="hidden" onChange={handleRestoreFileChange} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminPanel;
