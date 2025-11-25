
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
          className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
        ></div>
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-[#0f172a] border-r border-slate-200/60 dark:border-slate-800 transform transition-transform duration-300 ease-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:inset-0 flex flex-col
      `}>
        {/* Header Sidebar */}
        <div className="h-24 flex items-center px-8">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white shadow-glow mr-3 shrink-0">
            <Activity size={22} className="animate-pulse" />
          </div>
          <h1 className="text-lg font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 truncate tracking-tight">
            {appName}
          </h1>
          <button onClick={() => setIsMobileOpen(false)} className="md:hidden ml-auto text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
          <div>
            <p className="px-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Principal</p>
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`
                      w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 group relative overflow-hidden
                      ${isActive 
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-primary-600 dark:hover:text-primary-400'}
                    `}
                  >
                    {isActive && <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-20" />}
                    <Icon size={18} className={`mr-3 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary-500'}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer User Profile */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-center mb-3 group hover:border-primary-200 dark:hover:border-primary-800 transition-colors cursor-pointer" onClick={handleAvatarClick} title="Alterar foto">
            <div className="relative shrink-0">
              <img src={currentUser.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover border-2 border-slate-100 dark:border-slate-700" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition">
                <Camera size={14} className="text-white" />
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-primary-600 dark:text-primary-400 font-bold uppercase tracking-wide truncate">
                {getRoleLabel()}
              </p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center justify-center w-full px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-900/20"
          >
            <LogOut size={16} className="mr-2" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
    