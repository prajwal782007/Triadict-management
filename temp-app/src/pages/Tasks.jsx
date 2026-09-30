import { useState } from 'react';
import { Plus, CheckSquare, Clock, Filter } from 'lucide-react';

const mockTasks = [
  { id: 1, title: 'Implement Supabase Auth', status: 'pending', priority: 'high', assignee: 'Alex', due: 'Today' },
  { id: 2, title: 'Design Dashboard UI', status: 'in-progress', priority: 'medium', assignee: 'Sam', due: 'Tomorrow' },
  { id: 3, title: 'Discord Bot Setup', status: 'pending', priority: 'low', assignee: 'Jordan', due: 'Next Week' },
  { id: 4, title: 'Project Planning', status: 'completed', priority: 'high', assignee: 'Alex', due: 'Yesterday' },
];

export default function Tasks() {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-text-main">Tasks</h2>
        <button className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors">
          <Plus size={18} />
          <span>Add Task</span>
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <div className="flex gap-2">
            {['all', 'pending', 'in-progress', 'completed'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                  activeTab === tab ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-surface-hover hover:text-text-main'
                }`}
              >
                {tab.replace('-', ' ')}
              </button>
            ))}
          </div>
          <button className="p-2 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-md transition-colors flex items-center gap-2 text-sm font-medium">
            <Filter size={16} />
            Filter
          </button>
        </div>
        
        <div className="p-4 flex flex-col gap-3">
          {mockTasks.filter(t => activeTab === 'all' || t.status === activeTab).map((task) => (
            <div key={task.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border bg-background/30 hover:bg-background/80 transition-colors gap-4">
              <div className="flex items-start gap-4">
                <button className={`mt-0.5 shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  task.status === 'completed' ? 'bg-primary border-primary text-white' : 
                  task.status === 'in-progress' ? 'border-primary text-primary' : 'border-text-muted bg-background'
                }`}>
                  {task.status === 'completed' && <CheckSquare size={14} />}
                  {task.status === 'in-progress' && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                </button>
                <div>
                  <h4 className={`text-sm font-medium ${task.status === 'completed' ? 'text-text-muted line-through' : 'text-text-main'}`}>
                    {task.title}
                  </h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                    <span className="flex items-center gap-1"><Clock size={12} /> {task.due}</span>
                    <span className="px-1.5 py-0.5 rounded bg-surface border border-border">{task.assignee}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 md:w-32">
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                  task.priority === 'high' ? 'bg-rose-500/10 text-rose-500' :
                  task.priority === 'medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                }`}>
                  {task.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
