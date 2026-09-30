import { useState } from 'react';
import { BookOpen, Plus, Search } from 'lucide-react';

const mockLogs = [
  { id: 1, title: 'React Performance Optimization', category: 'Frontend', date: '2023-10-01', duration: '45m', user: 'Alex' },
  { id: 2, title: 'Supabase RLS Policies', category: 'Backend', date: '2023-09-30', duration: '1h 30m', user: 'Sam' },
  { id: 3, title: 'Discord.js Event Handling', category: 'Bot', date: '2023-09-29', duration: '2h', user: 'Jordan' },
];

export default function LearningLog() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-text-main">Learning Log</h2>
        <button className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors">
          <Plus size={18} />
          <span>New Entry</span>
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl flex flex-col">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search logs..." 
              className="h-9 w-full bg-background border border-border rounded-md pl-9 pr-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-text-main"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <th className="p-4 text-xs font-medium text-text-muted uppercase tracking-wider">Topic</th>
                <th className="p-4 text-xs font-medium text-text-muted uppercase tracking-wider">Category</th>
                <th className="p-4 text-xs font-medium text-text-muted uppercase tracking-wider">Duration</th>
                <th className="p-4 text-xs font-medium text-text-muted uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-medium text-text-muted uppercase tracking-wider">Member</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockLogs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="p-4 text-sm text-text-main font-medium flex items-center gap-3">
                    <div className="p-1.5 bg-primary/10 text-primary rounded-md"><BookOpen size={16} /></div>
                    {log.title}
                  </td>
                  <td className="p-4 text-sm"><span className="px-2 py-1 bg-surface border border-border rounded-md text-xs text-text-muted">{log.category}</span></td>
                  <td className="p-4 text-sm text-text-muted">{log.duration}</td>
                  <td className="p-4 text-sm text-text-muted">{log.date}</td>
                  <td className="p-4 text-sm text-text-main">{log.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
