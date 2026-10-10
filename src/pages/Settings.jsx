import { Settings as SettingsIcon, Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Settings() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-text-main">Settings</h2>
      </div>
      <div className="flex-1 bg-surface border border-border rounded-xl p-6">
        <h3 className="text-lg font-medium text-text-main mb-6">Appearance</h3>
        
        <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface rounded-md text-primary">
              {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <div>
              <p className="font-medium text-text-main">Dark Mode</p>
              <p className="text-sm text-text-muted">Toggle between light and dark themes</p>
            </div>
          </div>
          
          <button 
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${isDarkMode ? 'bg-primary' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
