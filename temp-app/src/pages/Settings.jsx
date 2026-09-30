import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-text-main">Settings</h2>
      </div>
      <div className="flex-1 bg-surface border border-border rounded-xl flex items-center justify-center text-text-muted">
        <div className="text-center flex flex-col items-center gap-4">
          <div className="p-4 bg-background rounded-full text-primary">
            <SettingsIcon size={32} />
          </div>
          <div>
            <h3 className="text-lg font-medium text-text-main">Workspace Configuration</h3>
            <p className="mt-1 text-sm max-w-md">Discord integration settings, profile preferences, and Supabase auth options will be available here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
