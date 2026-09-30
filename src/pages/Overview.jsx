import { Clock, ArrowUpRight, ArrowDownRight, Headphones, CalendarDays, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';

const mockChartData = [
  { day: 'Mon', hours: 4.5 },
  { day: 'Tue', hours: 6.2 },
  { day: 'Wed', hours: 5.8 },
  { day: 'Thu', hours: 7.4 },
  { day: 'Fri', hours: 5.1 },
  { day: 'Sat', hours: 2.3 },
  { day: 'Sun', hours: 0 },
];

const mockTasks = [
  { id: 1, title: 'Implement Supabase Auth', status: 'pending', priority: 'high' },
  { id: 2, title: 'Design Dashboard UI', status: 'in-progress', priority: 'medium' },
  { id: 3, title: 'Discord Bot Setup', status: 'pending', priority: 'low' },
  { id: 4, title: 'Project Planning', status: 'completed', priority: 'high' },
];

const mockActivity = [
  { id: 1, user: 'Alex', action: 'completed a task', target: 'Project Planning', time: '2 hours ago' },
  { id: 2, user: 'Sam', action: 'started working on', target: 'Design Dashboard UI', time: '4 hours ago' },
  { id: 3, user: 'Jordan', action: 'logged 3 hours in', target: 'Discord Bot Setup', time: 'Yesterday' },
];

const mockTeam = [
  { name: 'Alex', role: 'Developer', status: 'online', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' },
  { name: 'Sam', role: 'Designer', status: 'in-call', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam' },
  { name: 'Jordan', role: 'Manager', status: 'offline', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan' },
];

function StatCard({ title, value, icon: Icon, trend, trendValue, subtitle }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-text-muted font-medium text-sm">{title}</h3>
        <div className="p-2 bg-background rounded-md text-text-muted">
          <Icon size={18} />
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-semibold text-text-main">{value}</span>
        {trend && (
          <span className={`flex items-center text-xs font-medium ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
            {trend === 'up' ? <ArrowUpRight size={14} className="mr-0.5" /> : <ArrowDownRight size={14} className="mr-0.5" />}
            {trendValue}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
    </div>
  );
}

export default function Overview() {
  const [tasks, setTasks] = useState(mockTasks);

  const toggleTaskStatus = (id) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        const next = t.status === 'pending' ? 'in-progress' : t.status === 'in-progress' ? 'completed' : 'pending';
        return { ...t, status: next };
      }
      return t;
    }));
  };

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Today's Work Hours" 
          value="4h 30m" 
          icon={Clock} 
          trend="up" 
          trendValue="12%" 
          subtitle="Compared to yesterday" 
        />
        <StatCard 
          title="Difference vs Yesterday" 
          value="+45m" 
          icon={Activity} 
          trend="up" 
          trendValue="Positive" 
          subtitle="Productive streak" 
        />
        <StatCard 
          title="Weekly Average" 
          value="5h 15m" 
          icon={CalendarDays} 
          trend="down" 
          trendValue="3%" 
          subtitle="Per working day" 
        />
        <StatCard 
          title="Current Voice Session" 
          value="1h 12m" 
          icon={Headphones} 
          subtitle="2 members active" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-5 flex flex-col h-96">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="font-medium text-text-main">Weekly Work Hours</h3>
            <span className="text-xs px-2 py-1 bg-background text-text-muted rounded border border-border">Demo Data</span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262730" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#14151a', borderColor: '#262730', borderRadius: '8px', color: '#f3f4f6' }}
                  itemStyle={{ color: '#8b5cf6' }}
                />
                <Area type="monotone" dataKey="hours" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorHours)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col h-96">
          <div className="mb-4">
            <h3 className="font-medium text-text-main">Team Overview</h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4">
            {mockTeam.map((member) => (
              <div key={member.name} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-border overflow-hidden">
                    <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                  </div>
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-background ${
                    member.status === 'online' ? 'bg-emerald-500' : 
                    member.status === 'in-call' ? 'bg-primary' : 'bg-gray-500'
                  }`}></span>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-main">{member.name}</p>
                  <p className="text-xs text-text-muted">{member.role}</p>
                </div>
                <div className="ml-auto text-xs font-medium text-text-muted capitalize">
                  {member.status.replace('-', ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="font-medium text-text-main">Recent Tasks</h3>
            <button className="text-xs text-primary hover:text-primary-hover font-medium">View All</button>
          </div>
          <div className="flex flex-col gap-2">
            {tasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/30 hover:bg-background/80 transition-colors">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleTaskStatus(task.id)} className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    task.status === 'completed' ? 'bg-primary border-primary text-white' : 
                    task.status === 'in-progress' ? 'border-primary text-primary' : 'border-text-muted'
                  }`}>
                    {task.status === 'completed' && <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    {task.status === 'in-progress' && <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>}
                  </button>
                  <span className={`text-sm ${task.status === 'completed' ? 'text-text-muted line-through' : 'text-text-main'}`}>
                    {task.title}
                  </span>
                </div>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                  task.priority === 'high' ? 'bg-rose-500/10 text-rose-500' :
                  task.priority === 'medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                }`}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="mb-4">
            <h3 className="font-medium text-text-main">Recent Activity</h3>
          </div>
          <div className="relative pl-4 border-l border-border ml-2 flex flex-col gap-6">
            {mockActivity.map((activity, index) => (
              <div key={activity.id} className="relative">
                <div className="absolute -left-[21px] w-2 h-2 rounded-full bg-border ring-4 ring-surface top-1.5"></div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-text-main">
                    <span className="font-medium">{activity.user}</span> {activity.action} <span className="font-medium text-primary">{activity.target}</span>
                  </p>
                  <span className="text-xs text-text-muted">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
