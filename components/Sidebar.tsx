
import React, { useRef } from 'react';
import { LayoutDashboard, Wallet, PiggyBank, Users, Settings, LogOut, X, PieChart, Activity, Camera, TrendingUp, Calculator } from 'lucide-react';
import { User, UserRole } from '../types';

interface SidebarProps {
  appName: string;
  currentUser: User;
  currentView: string;
  setCurrentView: (view: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  logout: () => void;
  onUpdateUser?: (user: User) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  appName,
  currentUser, 
  currentView, 
  setCurrentView, 
  isMobileOpen, 
  setIsMobileOpen,
  logout,
  onUpdateUser
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transações', icon: Wallet },
    { id: 'budget', label: 'Orçamentos', icon: PieChart },
    { id: 'goals', label: 'Metas', icon: PiggyBank },
    { id: 'inflation', label: 'Inflação', icon: TrendingUp },
    { id: 'simulations', label: 'Simulações', icon: Calculator },
    { id: 'family', label: 'Família', icon: Users },
  ];

  // Permite acesso ao AdminPanel se for MANAGER, ADMIN ou SUPER_ADMIN
  if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.MANAGER) {
    menuItems.push({ id: 'admin', label: 'Configurações', icon: Settings });
  }

  const handleNavClick = (viewId: string) => {
    setCurrentView(viewId);
    setIsMobileOpen(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onUpdateUser) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateUser({ ...currentUser, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const getRoleLabel = () => {
    if (currentUser.role === UserRole.SUPER_ADMIN) return 'Super Admin';
    if (currentUser.role === UserRole.ADMIN) return 'Administrador';
    if (currentUser.role === UserRole.MANAGER) return 'Gestor Familiar';
    return 'Membro';
  };

  return (
    <>
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        ></div>
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 transform transition-transform duration-300 ease-cubic-bezier
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:inset-0 flex flex-col
      `}>
        <div className="h-24 flex items-center px-8 border-b border-slate-50 dark:border-slate-800">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white shadow-glow mr-3 shrink-0">
            <Activity size={24} />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 truncate">
            {appName}
          </h1>
          <button onClick={() => setIsMobileOpen(false)} className="md:hidden ml-auto text-slate-400">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-8" data-tour="sidebar-menu">
            <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Menu Principal</p>
            <nav className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`
                      w-full flex items-center px-4 py-3.5 text-sm font-semibold rounded-2xl transition-all duration-200 group
                      ${isActive 
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 translate-x-1' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary-600 dark:hover:text-primary-400'}
                    `}
                  >
                    <Icon size={20} className={`mr-3 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary-500'}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="p-6 border-t border-slate-50 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 flex items-center mb-4 border border-slate-100 dark:border-slate-700 group">
            <div className="relative cursor-pointer" onClick={handleAvatarClick} title="Alterar foto">
              <img src={currentUser.avatar} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-600 shadow-sm object-cover group-hover:opacity-80 transition" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition">
                <Camera size={14} className="text-white" />
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {getRoleLabel()}
              </p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center justify-center w-full px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-colors"
          >
            <LogOut size={18} className="mr-2" />
            Encerrar Sessão
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
