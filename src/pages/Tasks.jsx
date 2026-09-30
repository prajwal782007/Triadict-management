import { useState, useEffect } from 'react';
import { Plus, CheckSquare, Clock, Filter, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Tasks({ session }) {
  const [activeTab, setActiveTab] = useState('all');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error.message);
      alert('Error fetching tasks: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([
          { 
            title: newTaskTitle, 
            status: 'pending', 
            priority: 'medium', 
            assigned_to: session?.user?.id 
          }
        ])
        .select();

      if (error) throw error;
      setTasks([data[0], ...tasks]);
      setNewTaskTitle('');
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding task:', error.message);
      alert('Error adding task: ' + error.message);
    }
  };

  const toggleTaskStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'pending' ? 'in_progress' : currentStatus === 'in_progress' ? 'completed' : 'pending';
    const completedAt = nextStatus === 'completed' ? new Date().toISOString() : null;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: nextStatus, completed_at: completedAt })
        .eq('id', id);

      if (error) throw error;
      
      // Update state only after DB confirmation
      setTasks(tasks.map(t => t.id === id ? { ...t, status: nextStatus, completed_at: completedAt } : t));
    } catch (error) {
      console.error('Error updating task:', error.message);
      alert('Error updating task: ' + error.message);
      // No need to revert since we didn't optimistically update
    }
  };

  const deleteTask = async (id) => {
    setTasks(tasks.filter(t => t.id !== id));
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting task:', error.message);
      alert('Error deleting task: ' + error.message);
      fetchTasks();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-text-main">Tasks</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          <span>Add Task</span>
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <div className="flex gap-2">
            {['all', 'pending', 'in_progress', 'completed'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                  activeTab === tab ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-surface-hover hover:text-text-main'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>
          <button className="p-2 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-md transition-colors flex items-center gap-2 text-sm font-medium">
            <Filter size={16} />
            Filter
          </button>
        </div>
        
        <div className="p-4 flex flex-col gap-3">
          {isAdding && (
            <form onSubmit={handleAddTask} className="flex gap-2 mb-2">
              <input 
                type="text" 
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="What needs to be done?" 
                className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-text-main focus:outline-none focus:border-primary"
                autoFocus
              />
              <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-4 rounded-lg font-medium">Save</button>
            </form>
          )}

          {loading ? (
            <div className="text-center py-8 text-text-muted">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-text-muted">No tasks found.</div>
          ) : (
            tasks.filter(t => activeTab === 'all' || t.status === activeTab).map((task) => (
              <div key={task.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border bg-background/30 hover:bg-background/80 transition-colors gap-4 group">
                <div className="flex items-start gap-4">
                  <button 
                    onClick={() => toggleTaskStatus(task.id, task.status)}
                    className={`mt-0.5 shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      task.status === 'completed' ? 'bg-primary border-primary text-white' : 
                      task.status === 'in_progress' ? 'border-primary text-primary' : 'border-text-muted bg-background'
                    }`}
                  >
                    {task.status === 'completed' && <CheckSquare size={14} />}
                    {task.status === 'in_progress' && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                  </button>
                  <div>
                    <h4 className={`text-sm font-medium ${task.status === 'completed' ? 'text-text-muted line-through' : 'text-text-main'}`}>
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                      <span className="flex items-center gap-1"><Clock size={12} /> {new Date(task.created_at).toLocaleDateString()}</span>
                      <span className="px-1.5 py-0.5 rounded bg-surface border border-border">{task.assigned_to?.slice(0, 8) || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 md:w-32">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                    task.priority === 'high' ? 'bg-rose-500/10 text-rose-500' :
                    task.priority === 'medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {task.priority || 'medium'}
                  </span>
                  <button onClick={() => deleteTask(task.id)} className="text-text-muted hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
