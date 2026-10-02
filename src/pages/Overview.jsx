import { Clock, Activity, CalendarDays, Headphones } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function getStartOfDayUTC(offsetDays = 0) {
  const now = new Date();
  const str = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const kolkataNow = new Date(str);
  return new Date(Date.UTC(kolkataNow.getFullYear(), kolkataNow.getMonth(), kolkataNow.getDate() + offsetDays, -5, -30, 0, 0));
}

function getOverlapDurationMs(joinedAt, leftAt, periodStartUTC, periodEndUTC, nowMs) {
  const start = Math.max(new Date(joinedAt).getTime(), periodStartUTC);
  const end = Math.min(leftAt ? new Date(leftAt).getTime() : nowMs, periodEndUTC);
  return Math.max(0, end - start);
}

function formatDuration(ms) {
  if (ms <= 0) return '0m';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function StatCard({ title, value, icon: Icon, subtitle }) {
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
      </div>
      {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
    </div>
  );
}

export default function Overview() {
  const [profiles, setProfiles] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [profilesRes, sessionsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('voice_sessions').select('*')
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (sessionsRes.error) throw sessionsRes.error;
      
      setProfiles(profilesRes.data || []);
      setSessions(sessionsRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const todayStart = getStartOfDayUTC(0).getTime();
  const todayEnd = getStartOfDayUTC(1).getTime();
  const yesterdayStart = getStartOfDayUTC(-1).getTime();
  const yesterdayEnd = todayStart;

  let totalTodayMs = 0;
  let totalYesterdayMs = 0;
  let activeMembersCount = 0;
  let longestActiveSessionMs = 0;

  const memberStats = profiles.map(p => {
    const userSessions = sessions.filter(s => s.discord_user_id === p.discord_user_id);
    let todayMs = 0;
    let isWorking = false;

    userSessions.forEach(s => {
      todayMs += getOverlapDurationMs(s.joined_at, s.left_at, todayStart, todayEnd, nowMs);
      totalYesterdayMs += getOverlapDurationMs(s.joined_at, s.left_at, yesterdayStart, yesterdayEnd, nowMs);
      
      if (!s.left_at) {
        isWorking = true;
        const currentActiveMs = nowMs - new Date(s.joined_at).getTime();
        if (currentActiveMs > longestActiveSessionMs) {
          longestActiveSessionMs = currentActiveMs;
        }
      }
    });

    totalTodayMs += todayMs;
    if (isWorking) activeMembersCount++;

    return {
      id: p.id,
      name: p.display_name,
      todayMs,
      isWorking
    };
  });

  const kolkataNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  let dayOfWeek = kolkataNow.getDay();
  const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const chartData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, i) => {
    const dayStartUTC = getStartOfDayUTC(-adjustedDay + i).getTime();
    const dayEndUTC = getStartOfDayUTC(-adjustedDay + i + 1).getTime();
    let dailyMs = 0;
    sessions.forEach(s => {
      dailyMs += getOverlapDurationMs(s.joined_at, s.left_at, dayStartUTC, dayEndUTC, nowMs);
    });
    return { day: dayName, hours: Number((dailyMs / 3600000).toFixed(1)) };
  });

  const diffMs = totalTodayMs - totalYesterdayMs;
  const diffSign = diffMs >= 0 ? '+' : '-';
  const diffFormatted = formatDuration(Math.abs(diffMs));

  if (loading) {
    return <div className="p-4 text-text-muted">Loading dashboard...</div>;
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Today's Work Time" 
          value={formatDuration(totalTodayMs)} 
          icon={Clock} 
        />
        <StatCard 
          title="Difference vs Yesterday" 
          value={`${diffSign}${diffFormatted}`} 
          icon={Activity} 
        />
        <StatCard 
          title="Current Active Session" 
          value={activeMembersCount > 0 ? formatDuration(longestActiveSessionMs) : '0m'} 
          icon={Headphones} 
          subtitle={`${activeMembersCount} member${activeMembersCount !== 1 ? 's' : ''} working`}
        />
        <StatCard 
          title="Total Team Members" 
          value={profiles.length.toString()} 
          icon={CalendarDays} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-5 flex flex-col h-96">
          <div className="mb-4">
            <h3 className="font-medium text-text-main">Weekly Work Hours</h3>
          </div>
          {sessions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-text-muted">No work sessions recorded yet.</div>
          ) : (
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
          )}
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col h-96">
          <div className="mb-4">
            <h3 className="font-medium text-text-main">Team Overview</h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4">
            {profiles.length === 0 ? (
              <div className="text-text-muted text-sm text-center mt-4">No team members registered yet.</div>
            ) : (
              memberStats.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-border overflow-hidden flex items-center justify-center text-text-muted text-lg font-medium uppercase">
                      {member.name ? member.name.charAt(0) : '?'}
                    </div>
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-background ${
                      member.isWorking ? 'bg-emerald-500' : 'bg-gray-500'
                    }`}></span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-main">{member.name}</p>
                    <p className="text-xs text-text-muted">{formatDuration(member.todayMs)} today</p>
                  </div>
                  <div className="text-xs font-medium text-text-muted capitalize">
                    {member.isWorking ? 'Working' : 'Offline'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
