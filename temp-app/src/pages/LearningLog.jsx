import { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function LearningLog({ session }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newLog, setNewLog] = useState({ title: '', category: '', duration_minutes: 30 });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('learning_logs')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!newLog.title.trim() || !newLog.category.trim()) return;

    try {
      const { data, error } = await supabase
        .from('learning_logs')
        .insert([
          { 
            title: newLog.title, 
            category: newLog.category, 
            duration_minutes: newLog.duration_minutes, 
            user_id: session?.user?.id 
          }
        ])
        .select();

      if (error) throw error;
      setLogs([data[0], ...logs]);
      setNewLog({ title: '', category: '', duration_minutes: 30 });
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding log:', error.message);
    }
  };

  const deleteLog = async (id) => {
    setLogs(logs.filter(l => l.id !== id));
    try {
      const { error } = await supabase.from('learning_logs').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting log:', error.message);
      fetchLogs();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-text-main">Learning Log</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors"
        >
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

        {isAdding && (
          <form onSubmit={handleAddLog} className="p-4 border-b border-border bg-background/50 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-text-muted mb-1">Topic</label>
              <input type="text" required value={newLog.title} onChange={e => setNewLog({...newLog, title: e.target.value})} className="w-full bg-background border border-border rounded px-3 py-2 text-text-main text-sm focus:border-primary" placeholder="What did you learn?" />
            </div>
            <div className="w-48">
              <label className="block text-xs text-text-muted mb-1">Category</label>
              <input type="text" required value={newLog.category} onChange={e => setNewLog({...newLog, category: e.target.value})} className="w-full bg-background border border-border rounded px-3 py-2 text-text-main text-sm focus:border-primary" placeholder="e.g. Frontend" />
            </div>
            <div className="w-32">
              <label className="block text-xs text-text-muted mb-1">Minutes</label>
              <input type="number" required value={newLog.duration_minutes} onChange={e => setNewLog({...newLog, duration_minutes: parseInt(e.target.value)})} className="w-full bg-background border border-border rounded px-3 py-2 text-text-main text-sm focus:border-primary" min="1" />
            </div>
            <button type="submit" className="bg-primary text-white px-4 py-2 rounded font-medium text-sm hover:bg-primary-hover">Save</button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <th className="p-4 text-xs font-medium text-text-muted uppercase tracking-wider">Topic</th>
                <th className="p-4 text-xs font-medium text-text-muted uppercase tracking-wider">Category</th>
                <th className="p-4 text-xs font-medium text-text-muted uppercase tracking-wider">Duration</th>
                <th className="p-4 text-xs font-medium text-text-muted uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-medium text-text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-text-muted">Loading logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-text-muted">No learning logs found.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-hover/50 transition-colors group">
                    <td className="p-4 text-sm text-text-main font-medium flex items-center gap-3">
                      <div className="p-1.5 bg-primary/10 text-primary rounded-md"><BookOpen size={16} /></div>
                      {log.title}
                    </td>
                    <td className="p-4 text-sm"><span className="px-2 py-1 bg-surface border border-border rounded-md text-xs text-text-muted">{log.category}</span></td>
                    <td className="p-4 text-sm text-text-muted">{log.duration_minutes}m</td>
                    <td className="p-4 text-sm text-text-muted">{new Date(log.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-sm text-text-main">
                      <button onClick={() => deleteLog(log.id)} className="text-text-muted hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
