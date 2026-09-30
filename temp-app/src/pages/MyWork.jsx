import { Activity } from 'lucide-react';

export default function MyWork() {
  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-text-main">My Work</h2>
      </div>
      <div className="flex-1 bg-surface border border-border rounded-xl flex items-center justify-center text-text-muted">
        <div className="text-center flex flex-col items-center gap-4">
          <div className="p-4 bg-background rounded-full text-primary">
            <Activity size={32} />
          </div>
          <div>
            <h3 className="text-lg font-medium text-text-main">Your personal workspace</h3>
            <p className="mt-1 text-sm max-w-md">Detailed view of your assigned tasks, logged hours, and voice session history will appear here once connected to the database.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
