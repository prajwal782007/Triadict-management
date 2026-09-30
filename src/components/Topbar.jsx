import { Bell, Search, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Topbar({ title, session }) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="h-16 border-b border-border bg-surface/50 backdrop-blur-sm flex items-center justify-between px-4 md:px-8 shrink-0">
      <div className="flex flex-col">
        <h1 className="text-lg font-semibold text-text-main leading-tight">{title}</h1>
        <span className="text-xs text-text-muted">{today}</span>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative hidden md:flex items-center">
          <Search className="absolute left-2.5 w-4 h-4 text-text-muted" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="h-9 w-64 bg-background border border-border rounded-md pl-9 pr-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-text-main placeholder-text-muted"
          />
        </div>
        
        <button className="w-9 h-9 rounded-md flex items-center justify-center text-text-muted hover:bg-surface-hover hover:text-text-main transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-surface"></span>
        </button>
        
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-800 border border-border overflow-hidden cursor-pointer" title={session?.user?.email}>
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${session?.user?.email || 'Felix'}&backgroundColor=transparent`} alt="User" className="w-full h-full object-cover" />
        </div>
        
        <button onClick={handleSignOut} className="w-9 h-9 rounded-md flex items-center justify-center text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors" title="Sign Out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
