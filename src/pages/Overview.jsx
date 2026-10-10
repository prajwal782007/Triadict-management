import { Clock, Activity, CalendarDays, Headphones, User, TrendingUp, TrendingDown, Minus, Users, PieChart as PieChartIcon } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ComposedChart } from 'recharts';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getStartOfDayUTC, getOverlapDurationMs, formatDuration, formatTime, getKolkataDate } from '../lib/dateUtils';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1'];

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
  const [dateRange, setDateRange] = useState('7d');

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
      const loadedSessions = sessionsRes.data || [];
      
      // Ensure we have a series for ALL team members who have recorded sessions,
      // even if their profile is missing from the DB or hidden by RLS.
      const uniqueDiscordIds = [...new Set(loadedSessions.map(s => s.discord_user_id).filter(Boolean))];
      
      const actualTeamMembers = [...loadedProfiles];
      
      uniqueDiscordIds.forEach(dId => {
        if (!actualTeamMembers.find(p => p.discord_user_id === dId)) {
          actualTeamMembers.push({
            id: `discord-${dId}`, // Stable string ID to serve as React key and dataKey
            discord_user_id: dId,
            display_name: `Discord User ${dId.substring(0, 4)}`,
            full_name: `Discord User ${dId.substring(0, 4)}`, // Sensible fallback display name
            username: `User_${dId.substring(0, 4)}`
          });
        }
      });
      
      setProfiles(actualTeamMembers);
      setSessions(loadedSessions);
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
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
      for (let i = -adjustedDay; i <= 0; i++) days.push(getStartOfDayUTC(nowMs, i));
    } else if (rangeStr === 'month') {
      const dayOfMonth = kolkataNow.getDate();
      for (let i = -(dayOfMonth - 1); i <= 0; i++) days.push(getStartOfDayUTC(nowMs, i));
    }
    return days;
  };

  if (loading) return <div className="p-4 text-text-muted">Loading analytics...</div>;

  const currentDays = getDaysArray(dateRange);
  const rangeStartMs = currentDays[0].getTime();
  const rangeEndMs = currentDays[currentDays.length - 1].getTime() + 24 * 3600 * 1000;

  // Process data for charts
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

    profiles.forEach(p => {
      dayObj[`${p.id}_hours`] = 0;
      dayObj[`${p.id}_ms`] = 0;
      dayObj[`${p.id}_sessions`] = 0;
    });

    const countedSessions = new Set();

    sessions.forEach(s => {
      const overlap = getOverlapDurationMs(s.joined_at, s.left_at, dayStart, dayEnd, nowMs);
      if (overlap > 0) {
        dayObj.totalMs += overlap;
        
        if (!countedSessions.has(s.id)) {
          dayObj.sessionCount++;
          countedSessions.add(s.id);
        }
        
        const profile = profiles.find(p => p.discord_user_id === s.discord_user_id);
        if (profile) {
           dayObj[`${profile.id}_ms`] += overlap;
           dayObj[`${profile.id}_hours`] = Number((dayObj[`${profile.id}_ms`] / 3600000).toFixed(2));
           dayObj[`${profile.id}_sessions`]++;
        }
      }
    });
    dayObj.totalHours = Number((dayObj.totalMs / 3600000).toFixed(2));
    return dayObj;
  });

  // Handle click to calendar
  const handleBarClick = (data, pId) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const clickedDate = data.activePayload[0].payload.dateStr;
      const targetUser = pId || selectedUserId;
      navigate('/my-work', { state: { selectedDate: clickedDate, selectedUserId: targetUser } });
    }
  };

  const renderTeamAnalytics = () => {
    let totalTeamMs = 0;
    let maxDayMs = 0;
    let maxDayStr = 'No active days';
    let totalSessions = 0;
    
    const memberTotals = {};
    profiles.forEach(p => memberTotals[p.id] = { ms: 0, sessions: 0 });

    chartData.forEach(day => {
      totalTeamMs += day.totalMs;
      totalSessions += day.sessionCount;
      if (day.totalMs > maxDayMs) {
        maxDayMs = day.totalMs;
        maxDayStr = day.displayDate;
      }
      profiles.forEach(p => {
        memberTotals[p.id].ms += day[`${p.id}_ms`];
        memberTotals[p.id].sessions += day[`${p.id}_sessions`];
      });
    });

    const avgDailyTeamMs = totalTeamMs / Math.max(1, chartData.length);
    
    let activeMembersCount = 0;
    let mostActiveMemberId = null;
    let mostActiveMemberMs = 0;

    profiles.forEach(p => {
      if (memberTotals[p.id].ms > 0) activeMembersCount++;
      if (memberTotals[p.id].ms > mostActiveMemberMs) {
        mostActiveMemberMs = memberTotals[p.id].ms;
        mostActiveMemberId = p.id;
      }
    });

    const mostActiveMemberName = mostActiveMemberId 
      ? (profiles.find(p => p.id === mostActiveMemberId)?.display_name || profiles.find(p => p.id === mostActiveMemberId)?.full_name || profiles.find(p => p.id === mostActiveMemberId)?.username) 
      : 'None';

    const pieData = profiles
      .filter(p => memberTotals[p.id].ms > 0)
      .map(p => ({
        name: p.display_name || p.full_name || p.username || 'Unknown User',
        value: memberTotals[p.id].ms,
        id: p.id
      }))
      .sort((a, b) => b.value - a.value);

    const CustomTooltipGrouped = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-surface border border-border p-3 rounded-lg shadow-xl z-50">
            <p className="text-text-main font-medium mb-2">{data.displayDate}</p>
            <div className="space-y-1 text-sm">
              {payload.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }}></div>
                  <span className="text-text-muted">{entry.name}:</span>
                  <span className="text-text-main font-medium">{formatDuration(entry.value * 3600000)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }
      return null;
    };

    const CustomTooltipStacked = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-surface border border-border p-3 rounded-lg shadow-xl z-50">
            <p className="text-text-main font-medium mb-2">{data.displayDate}</p>
            <p className="text-primary font-medium mb-2 text-sm border-b border-border pb-2">
              Team Total: {formatDuration(data.totalMs)}
            </p>
            <div className="space-y-1 text-sm">
              {payload.map((entry, idx) => {
                if (entry.value > 0) {
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }}></div>
                      <span className="text-text-muted">{entry.name}:</span>
                      <span className="text-text-main font-medium">{formatDuration(entry.value * 3600000)}</span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        );
      }
      return null;
    };

    return (
      <div className="flex flex-col gap-8">
        <div id="diagnostics-panel" className="bg-surface border border-border p-4 rounded-xl text-xs font-mono max-h-96 overflow-auto mb-4">
          <h3 className="font-bold mb-2">Development Diagnostics</h3>
          <p>Total profiles found: {profiles.length}</p>
          <p>Profiles with linked Discord IDs: {profiles.filter(p => p.discord_user_id).length}</p>
          <p>Total voice sessions returned: {sessions.length}</p>
          <p>Unmatched sessions: {sessions.filter(s => !profiles.find(p => p.discord_user_id === s.discord_user_id)).length}</p>
          
          <div className="mt-4">
            <h4 className="font-bold">Calculated Hours & Sessions per Member:</h4>
            {profiles.map(p => (
              <p key={p.id}>{p.display_name || p.full_name || p.username}: {memberTotals[p.id]?.sessions || 0} sessions, {formatDuration(memberTotals[p.id]?.ms || 0)}</p>
            ))}
          </div>
          
          <div className="mt-4">
            <h4 className="font-bold">Chart Series (Dataset Keys):</h4>
            {profiles.map(p => (
              <p key={p.id}>Label: "{p.display_name || p.full_name || p.username}", Key: "{p.id}_hours"</p>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 shrink-0">
          <StatCard title="Total Team Hours" value={formatDuration(totalTeamMs)} icon={Clock} subtitle="Tracked voice time" />
          <StatCard title="Avg Daily Team Hours" value={formatDuration(avgDailyTeamMs)} icon={Activity} subtitle={`Across ${chartData.length} days`} />
          <StatCard title="Most Active Day" value={maxDayMs > 0 ? formatDuration(maxDayMs) : '0m'} icon={CalendarDays} subtitle={maxDayStr} />
          <StatCard title="Most Active Member" value={mostActiveMemberName} icon={User} subtitle={mostActiveMemberMs > 0 ? formatDuration(mostActiveMemberMs) : 'No activity'} subtitleColor="text-primary" />
          <StatCard title="Total Sessions" value={totalSessions.toString()} icon={Headphones} subtitle="Distinct voice sessions" />
          <StatCard title="Active Members" value={`${activeMembersCount} / ${profiles.length}`} icon={Users} subtitle="Members with recorded time" />
        </div>

        {/* GRAPH 1: Daily Team Comparison */}
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col min-h-[450px]">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h3 className="font-medium text-text-main text-lg">Daily Work Hours by Team Member</h3>
              <p className="text-sm text-text-muted mt-1">Side-by-side comparison of daily tracked time. Click a bar to view daily history.</p>
            </div>
          </div>
          {totalTeamMs === 0 ? (
            <div className="flex-1 flex items-center justify-center text-text-muted border border-dashed border-border rounded-lg bg-background/50">No work sessions recorded in this period.</div>
          ) : (
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262730" />
                  <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(val) => `${val}h`} />
                  <RechartsTooltip content={<CustomTooltipGrouped />} cursor={{ fill: '#262730', opacity: 0.4 }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  {profiles.map((p, idx) => (
                    <Bar key={p.id} dataKey={`${p.id}_hours`} name={p.full_name || p.username || 'Unknown User'} fill={COLORS[idx % COLORS.length]} radius={[2, 2, 0, 0]} onClick={(data) => handleBarClick(data, p.id)} cursor="pointer" />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* GRAPH 3: Total Team Hours (Stacked) */}
          <div className="bg-surface border border-border rounded-xl p-5 flex flex-col min-h-[400px]">
            <div className="mb-6">
              <h3 className="font-medium text-text-main text-lg">Total Team Work Hours</h3>
              <p className="text-sm text-text-muted mt-1">Stacked daily contribution.</p>
            </div>
            {totalTeamMs === 0 ? (
              <div className="flex-1 flex items-center justify-center text-text-muted border border-dashed border-border rounded-lg bg-background/50">No data</div>
            ) : (
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262730" />
                    <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(val) => `${val}h`} />
                    <RechartsTooltip content={<CustomTooltipStacked />} cursor={{ fill: '#262730', opacity: 0.4 }} />
                    <Legend iconType="circle" />
                    {profiles.map((p, idx) => (
                      <Bar key={p.id} dataKey={`${p.id}_hours`} name={p.display_name || p.full_name || p.username || 'Unknown User'} stackId="a" fill={COLORS[idx % COLORS.length]} radius={[idx === profiles.length -1 ? 4 : 0, idx === profiles.length -1 ? 4 : 0, 0, 0]} onClick={(data) => handleBarClick(data, p.id)} cursor="pointer" />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* GRAPH 2: Individual Trends (Multi-line) */}
          <div className="bg-surface border border-border rounded-xl p-5 flex flex-col min-h-[400px]">
            <div className="mb-6">
              <h3 className="font-medium text-text-main text-lg">Individual Work Trends</h3>
              <p className="text-sm text-text-muted mt-1">Changes in daily participation.</p>
            </div>
            {totalTeamMs === 0 ? (
              <div className="flex-1 flex items-center justify-center text-text-muted border border-dashed border-border rounded-lg bg-background/50">No data</div>
            ) : (
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262730" />
                    <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(val) => `${val}h`} />
                    <RechartsTooltip content={<CustomTooltipGrouped />} />
                    <Legend iconType="circle" />
                    {profiles.map((p, idx) => (
                      <Line key={p.id} type="monotone" dataKey={`${p.id}_hours`} name={p.display_name || p.full_name || p.username || 'Unknown User'} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={{ r: 3, strokeWidth: 1 }} activeDot={{ r: 6 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* GRAPH 5: Team Participation Pie */}
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col items-center">
          <div className="mb-2 text-center">
            <h3 className="font-medium text-text-main text-lg">Team Participation Share</h3>
            <p className="text-sm text-text-muted mt-1">Share of total tracked voice time in selected period.</p>
          </div>
          {totalTeamMs === 0 ? (
             <div className="w-full h-64 flex items-center justify-center text-text-muted border border-dashed border-border rounded-lg bg-background/50 mt-4">No data</div>
          ) : (
            <div className="w-full h-80 max-w-md">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} dataKey="value" stroke="none">
                    {pieData.map((entry, index) => {
                      const profileIndex = profiles.findIndex(p => p.id === entry.id);
                      return <Cell key={`cell-${index}`} fill={COLORS[profileIndex % COLORS.length]} />;
                    })}
                  </Pie>
                  <RechartsTooltip formatter={(val) => formatDuration(val)} contentStyle={{ backgroundColor: '#14151a', borderColor: '#262730', borderRadius: '8px' }} itemStyle={{ color: '#f3f4f6' }} />
                  <Legend iconType="circle" verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderIndividualAnalytics = () => {
    const profile = profiles.find(p => p.id === selectedUserId);
    if (!profile) return null;

    let totalMs = 0;
    let maxDayMs = 0;
    let maxDayStr = 'No active days';
    let totalSessions = 0;
    let longestSessionMs = 0;
    let totalCompletedSessionMs = 0;
    let completedSessionsCount = 0;

    chartData.forEach(day => {
      const dayMs = day[`${profile.id}_ms`];
      totalMs += dayMs;
      totalSessions += day[`${profile.id}_sessions`];
      if (dayMs > maxDayMs) {
        maxDayMs = dayMs;
        maxDayStr = day.displayDate;
      }
    });

    const avgDailyMs = totalMs / Math.max(1, chartData.length);

    // Calculate session specific stats using raw sessions
    const userSessionsInPeriod = sessions.filter(s => {
      if (s.discord_user_id !== profile.discord_user_id) return false;
      const joinedTime = new Date(s.joined_at).getTime();
      const leftTime = s.left_at ? new Date(s.left_at).getTime() : nowMs;
      // Checks if session intersects with the period
      return joinedTime < rangeEndMs && leftTime >= rangeStartMs;
    });

    const chronologicalSessions = [...userSessionsInPeriod].sort((a, b) => new Date(b.joined_at) - new Date(a.joined_at));

    userSessionsInPeriod.forEach(s => {
      if (s.left_at) {
        const dur = new Date(s.left_at).getTime() - new Date(s.joined_at).getTime();
        totalCompletedSessionMs += dur;
        completedSessionsCount++;
        if (dur > longestSessionMs) longestSessionMs = dur;
      }
    });

    const avgSessionMs = completedSessionsCount > 0 ? totalCompletedSessionMs / completedSessionsCount : 0;

    chartData.forEach((day, idx) => {
      let sum = 0;
      let count = 0;
      for (let i = Math.max(0, idx - 2); i <= idx; i++) {
        sum += chartData[i][`${profile.id}_hours`];
        count++;
      }
      day.movingAverage = Number((sum / count).toFixed(2));
    });

    const CustomTooltipIndividual = ({ active, payload }) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-surface border border-border p-3 rounded-lg shadow-xl z-50">
            <p className="text-text-main font-medium mb-2">{data.displayDate}</p>
            <p className="text-primary font-medium">Total: {formatDuration(data[`${profile.id}_ms`])}</p>
            <p className="text-text-muted text-sm">{data[`${profile.id}_sessions`]} session{data[`${profile.id}_sessions`] !== 1 ? 's' : ''}</p>
          </div>
        );
      }
      return null;
    };

    return (
      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 shrink-0">
          <StatCard title="Total Tracked Hours" value={formatDuration(totalMs)} icon={Clock} />
          <StatCard title="Daily Average" value={formatDuration(avgDailyMs)} icon={Activity} />
          <StatCard title="Most Active Day" value={maxDayMs > 0 ? formatDuration(maxDayMs) : '0m'} icon={CalendarDays} subtitle={maxDayStr} />
          <StatCard title="Total Sessions" value={totalSessions.toString()} icon={Headphones} />
          <StatCard title="Longest Session" value={formatDuration(longestSessionMs)} icon={TrendingUp} subtitle="Completed sessions only" />
          <StatCard title="Average Session" value={formatDuration(avgSessionMs)} icon={Minus} subtitle="Completed sessions only" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-5 flex flex-col min-h-[450px]">
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h3 className="font-medium text-text-main text-lg">{profile.full_name || profile.username}'s Daily Work Hours</h3>
                <p className="text-sm text-text-muted mt-1">Tracked duration and 3-day trend line.</p>
              </div>
            </div>
            
            {totalMs === 0 ? (
              <div className="flex-1 flex items-center justify-center text-text-muted border border-dashed border-border rounded-lg bg-background/50">No work sessions recorded.</div>
            ) : (
              <div className="flex-1 min-h-0 cursor-pointer">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }} onClick={(data) => handleBarClick(data, profile.id)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262730" />
                    <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(val) => `${val}h`} />
                    <RechartsTooltip content={<CustomTooltipIndividual />} cursor={{ fill: '#262730', opacity: 0.4 }} />
                    <Bar dataKey={`${profile.id}_hours`} name="Work Hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="movingAverage" name="3-Day Trend" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 flex flex-col min-h-[450px]">
            <div className="mb-4">
              <h3 className="font-medium text-text-main">Recent Session History</h3>
              <p className="text-sm text-text-muted">In selected period</p>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
              {chronologicalSessions.length === 0 ? (
                <div className="text-text-muted text-sm text-center mt-8">No sessions found.</div>
              ) : (
                chronologicalSessions.map(session => {
                  const isActive = !session.left_at;
                  const durMs = isActive ? nowMs - new Date(session.joined_at).getTime() : new Date(session.left_at).getTime() - new Date(session.joined_at).getTime();
                  return (
                    <div key={session.id} className="flex flex-col p-3 rounded-lg border border-border bg-background relative overflow-hidden">
                      {isActive && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>}
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-text-main font-medium">
                          {new Date(session.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        {isActive ? (
                          <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">Active</span>
                        ) : (
                          <span className="text-xs font-medium text-text-main bg-surface px-2 py-0.5 rounded border border-border">{formatDuration(durMs)}</span>
                        )}
                      </div>
                      <span className="text-xs text-text-muted">
                        {formatTime(session.joined_at)} - {isActive ? 'Now' : formatTime(session.left_at)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 pb-6 h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface border border-border p-4 rounded-xl shrink-0">
        <div>
          <h2 className="text-lg font-medium text-text-main">Team Work Analytics</h2>
          <p className="text-sm text-text-muted">Comprehensive insights and daily trends</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-background border border-border rounded-md px-3 py-1.5 transition-colors focus-within:border-primary/50">
            <CalendarDays size={16} className="text-text-muted" />
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-sm text-text-main focus:outline-none cursor-pointer"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-background border border-border rounded-md px-3 py-1.5 transition-colors focus-within:border-primary/50">
            <User size={16} className="text-text-muted" />
            <select 
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="bg-transparent text-sm text-text-main focus:outline-none max-w-[180px] truncate cursor-pointer"
            >
              <option value="all">All Team Members</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.display_name || p.full_name || p.username || 'Unknown User'}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedUserId === 'all' ? renderTeamAnalytics() : renderIndividualAnalytics()}
    </div>
  );
}
