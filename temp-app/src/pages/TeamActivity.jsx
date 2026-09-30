import { Users } from 'lucide-react';

export default function TeamActivity() {
  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-text-main">Team Activity</h2>
      </div>
      <div className="flex-1 bg-surface border border-border rounded-xl flex items-center justify-center text-text-muted">
        <div className="text-center flex flex-col items-center gap-4">
          <div className="p-4 bg-background rounded-full text-primary">
            <Users size={32} />
          </div>
          <div>
            <h3 className="text-lg font-medium text-text-main">Live Team Status</h3>
            <p className="mt-1 text-sm max-w-md">Real-time presence, voice channel activity, and recent actions across the team will be populated here via Supabase real-time subscriptions.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
