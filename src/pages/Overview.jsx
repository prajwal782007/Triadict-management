import { Clock, Activity, CalendarDays, Headphones, User, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ComposedChart } from 'recharts';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getStartOfDayUTC, getOverlapDurationMs, formatDuration, getKolkataDate } from '../lib/dateUtils';

function StatCard({ title, value, icon: Icon, subtitle, subtitleColor }) {
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
      {subtitle && (
        <p className={`text-xs ${subtitleColor || 'text-text-muted'} whitespace-pre-wrap flex items-center gap-1 mt-1`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default function Overview({ session: authSession }) {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(Date.now());
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [dateRange, setDateRange] = useState('7d'); // '7d', '30d', 'week', 'month'

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [profilesRes, sessionsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('voice_sessions').select('*').order('joined_at', { ascending: false })
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (sessionsRes.error) throw sessionsRes.error;
      
      const loadedProfiles = profilesRes.data || [];
      setProfiles(loadedProfiles);
      setSessions(sessionsRes.data || []);

      if (authSession?.user?.id && loadedProfiles.find(p => p.id === authSession.user.id)) {
        // Keeping 'all' as default for overview, but could default to user
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysArray = (rangeStr) => {
    const kolkataNow = getKolkataDate(nowMs);
    const days = [];
    
    if (rangeStr === '7d') {
      for (let i = -6; i <= 0; i++) days.push(getStartOfDayUTC(nowMs, i));
    } else if (rangeStr === '30d') {
      for (let i = -29; i <= 0; i++) days.push(getStartOfDayUTC(nowMs, i));
    } else if (rangeStr === 'week') {
      let dayOfWeek = kolkataNow.getDay();
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon = 0
      for (let i = -adjustedDay; i <= 0; i++) days.push(getStartOfDayUTC(nowMs, i));
    } else if (rangeStr === 'month') {
      const dayOfMonth = kolkataNow.getDate();
      for (let i = -(dayOfMonth - 1); i <= 0; i++) days.push(getStartOfDayUTC(nowMs, i));
    }
    return days;
  };

  if (loading) return <div className="p-4 text-text-muted">Loading dashboard...</div>;

  const currentDays = getDaysArray(dateRange);
  const numDays = currentDays.length;
  
  // Build chart data
  const chartData = currentDays.map(dayUTC => {
    const dayStart = dayUTC.getTime();
    const dayEnd = dayStart + 24 * 3600 * 1000;
    const dayStr = dayUTC.toISOString().split('T')[0];
    const formattedDate = dayUTC.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
    
    const dayObj = {
      dateStr: dayStr,
      displayDate: formattedDate,
      totalHours: 0,
      totalMs: 0,
      sessionCount: 0
    };

    profiles.forEach(p => dayObj[p.id] = 0);

    const filteredSessions = selectedUserId === 'all' 
      ? sessions 
      : sessions.filter(s => s.discord_user_id === profiles.find(p => p.id === selectedUserId)?.discord_user_id);

    // Keep track of unique sessions counted per day to avoid double counting session counts
    const countedSessions = new Set();

    filteredSessions.forEach(s => {
      const overlap = getOverlapDurationMs(s.joined_at, s.left_at, dayStart, dayEnd, nowMs);
      if (overlap > 0) {
        dayObj.totalMs += overlap;
        if (!countedSessions.has(s.id)) {
          dayObj.sessionCount++;
          countedSessions.add(s.id);
        }
        
        const profile = profiles.find(p => p.discord_user_id === s.discord_user_id);
        if (profile) {
           dayObj[profile.id] = Number((dayObj[profile.id] + (overlap / 3600000)).toFixed(2));
        }
      }
    });
    dayObj.totalHours = Number((dayObj.totalMs / 3600000).toFixed(2));
    
    return dayObj;
  });

  // Calculate 3-day moving average
  chartData.forEach((day, idx) => {
    let sum = 0;
    let count = 0;
    for (let i = Math.max(0, idx - 2); i <= idx; i++) {
      sum += chartData[i].totalHours;
      count++;
    }
    day.movingAverage = Number((sum / count).toFixed(2));
  });

  // Summaries
  let totalPeriodMs = 0;
  let maxDayMs = 0;
  let maxDayStr = null;
  let totalSessionsPeriod = 0;

  chartData.forEach(day => {
    totalPeriodMs += day.totalMs;
    totalSessionsPeriod += day.sessionCount;
    if (day.totalMs > maxDayMs) {
      maxDayMs = day.totalMs;
      maxDayStr = day.displayDate;
    }
  });

  const avgDailyMs = totalPeriodMs / Math.max(1, chartData.length);

  // Previous Period Calculation
  let prevPeriodMs = 0;
  const filteredSessions = selectedUserId === 'all' 
    ? sessions 
    : sessions.filter(s => s.discord_user_id === profiles.find(p => p.id === selectedUserId)?.discord_user_id);
    
  for (let i = 1; i <= numDays; i++) {
    const prevDayUTC = getStartOfDayUTC(nowMs, -numDays + 1 - i); // Offset backwards
    const dayStart = prevDayUTC.getTime();
    const dayEnd = dayStart + 24 * 3600 * 1000;
    
    filteredSessions.forEach(s => {
      prevPeriodMs += getOverlapDurationMs(s.joined_at, s.left_at, dayStart, dayEnd, nowMs);
    });
  }

  const diffMs = totalPeriodMs - prevPeriodMs;
  let diffText = 'Same as previous period';
  let diffColor = 'text-text-muted';
  let DiffIcon = Minus;

  if (diffMs > 60000) {
    diffText = `${formatDuration(diffMs)} more than previous period`;
    diffColor = 'text-emerald-500';
    DiffIcon = TrendingUp;
  } else if (diffMs < -60000) {
    diffText = `${formatDuration(Math.abs(diffMs)))}} less than previous period`;
    diffColor = 'text-rose-500';
    DiffIcon = TrendingDown;
  } else if (prevPeriodMs === 0 && totalPeriodMs === 0) {
    diffText = 'No recorded time in both periods';
    DiffIcon = Minus;
  } else if (prevPeriodMs === 0) {
    diffText = 'No recorded time in previous period';
    DiffIcon = TrendingUp;
    diffColor = 'text-emerald-500';
  }

  const handleBarClick = (data) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const clickedDate = data.activePayload[0].payload.dateStr;
      // Navigate to Calendar and set the selected date
      navigate('/my-work', { state: { selectedDate: clickedDate, selectedUserId } });
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface border border-border p-3 rounded-lg shadow-xl">
          <p className="text-text-main font-medium mb-2">{data.displayDate}</p>
          <div className="space-y-1 text-sm">
            <p className="text-primary font-medium">Total: {formatDuration(data.totalMs)}</p>
            <p className="text-text-muted">{data.sessionCount} session{data.sessionCount !== 1 ? 's' : ''}</p>
            
            {selectedUserId === 'all' && profiles.map(p => {
              const val = data[p.id];
              if (val > 0) {
                return <p key={p.id} className="text-xs text-text-muted">{p.full_name || p.username}: {formatDuration(val * 3600000)}</p>;
              }
              return null;
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1'];

  return (
    <div className="flex flex-col gap-6 pb-6 h-full overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface border border-border p-4 rounded-xl shrink-0">
        <div>
          <h2 className="text-lg font-medium text-text-main">Work Analytics</h2>
          <p className="text-sm text-text-muted">Interactive team insights and daily trends</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-background border border-border rounded-md px-2 py-1">
            <CalendarDays size={16} className="text-text-muted" />
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-sm text-text-main focus:outline-none"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-background border border-border rounded-md px-2 py-1">
            <User size={16} className="text-text-muted" />
            <select 
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="bg-transparent text-sm text-text-main focus:outline-none max-w-[150px] truncate"
            >
              <option value="all">All Team Members</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.full_name || p.username || 'Unknown User'}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 shrink-0">
        <StatCard 
          title="Total Tracked Time" 
          value={formatDuration(totalPeriodMs)} 
          icon={Clock} 
        />
        <StatCard 
          title="Daily Average" 
          value={formatDuration(avgDailyMs)} 
          icon={Activity} 
        />
        <StatCard 
          title="Most Active Day" 
          value={maxDayMs > 0 ? formatDuration(maxDayMs) : '0m'} 
          icon={CalendarDays} 
          subtitle={maxDayMs > 0 ? maxDayStr : 'No active days'}
        />
        <StatCard 
          title="Sessions Recorded" 
          value={totalSessionsPeriod.toString()} 
          icon={Headphones} 
        />
        <StatCard 
          title="Period Comparison" 
          value={formatDuration(Math.abs(diffMs))} 
          icon={DiffIcon} 
          subtitle={
            <span className="flex items-center gap-1">
              {diffText}
            </span>
          }
          subtitleColor={diffColor}
        />
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 flex flex-col min-h-[450px]">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h3 className="font-medium text-text-main text-lg">Work Hours Overview</h3>
            <p className="text-sm text-text-muted mt-1">
              Click any bar to view the detailed session history for that date.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-primary/20 border border-primary"></span>
              <span className="text-text-muted">Tracked Time</span>
            </div>
            {selectedUserId === 'all' ? (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-500 rounded"></span>
                <span className="text-text-muted">3-Day Trend (Total)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-primary rounded"></span>
                <span className="text-text-muted">3-Day Trend</span>
              </div>
            )}
          </div>
        </div>
        
        {sessions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-text-muted border border-dashed border-border rounded-lg bg-background/50">
            No work sessions recorded in the database.
          </div>
        ) : (
          <div className="flex-1 min-h-0 cursor-pointer">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }} onClick={handleBarClick}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262730" />
                <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(val) => `${val}h`} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#262730', opacity: 0.4 }} />
                
                {selectedUserId === 'all' ? (
                  profiles.map((p, idx) => (
                    <Bar key={p.id} dataKey={p.id} name={p.full_name || p.username} stackId="a" fill={COLORS[idx % COLORS.length]} radius={[idx === profiles.length -1 ? 4 : 0, idx === profiles.length -1 ? 4 : 0, 0, 0]} />
                  ))
                ) : (
                  <Bar dataKey="totalHours" name="Work Hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                )}
                
                <Line type="monotone" dataKey="movingAverage" name="3-Day Trend" stroke={selectedUserId === 'all' ? '#10b981' : '#8b5cf6'} strokeWidth={2} dot={false} strokeDasharray="5 5" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
