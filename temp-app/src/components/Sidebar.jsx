import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, BookOpen, Users, Settings, Activity, Hexagon } from 'lucide-react';

const navItems = [
  { name: 'Overview', path: '/', icon: LayoutDashboard },
  { name: 'My Work', path: '/my-work', icon: Activity },
  { name: 'Tasks', path: '/tasks', icon: CheckSquare },
  { name: 'Learning Log', path: '/learning-log', icon: BookOpen },
  { name: 'Team Activity', path: '/team-activity', icon: Users },
];

export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-border bg-surface flex flex-col h-full shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-border gap-3">
        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
          <Hexagon size={20} className="fill-primary/20" />
        </div>
        <span className="font-semibold text-text-main tracking-wide">TRIADICT Studio</span>
      </div>
      
      <div className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto">
        <div className="text-xs font-medium text-text-muted px-3 mb-2 uppercase tracking-wider">
          Workspace
        </div>
        
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'text-text-muted hover:bg-surface-hover hover:text-text-main'
              }`
            }
          >
            <item.icon size={18} strokeWidth={2} />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </div>
      
      <div className="p-3 border-t border-border mt-auto">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              isActive 
                ? 'bg-primary/10 text-primary font-medium' 
                : 'text-text-muted hover:bg-surface-hover hover:text-text-main'
            }`
          }
        >
          <Settings size={18} strokeWidth={2} />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
