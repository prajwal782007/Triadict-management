import { Clock, Activity, CalendarDays, Headphones, User } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getStartOfDayUTC, getOverlapDurationMs, formatDuration, getKolkataDate } from '../lib/dateUtils';

function StatCard({ title, value, icon: Icon, subtitle, subValue }) {
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
        {subValue && <span className="text-sm font-medium text-text-muted">{subValue}</span>}
      </div>
      {subtitle && <p className="text-xs text-text-muted whitespace-pre-wrap">{subtitle}</p>}
    </div>
  );
}

export default function Overview({ session: authSession }) {
  const [profiles, setProfiles] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(Date.now());
  const [selectedUserId, setSelectedUserId] = useState('all');

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
        supabase.from('voice_sessions').select('*').order('joined_at', { ascending: false })
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (sessionsRes.error) throw sessionsRes.error;
      
      const loadedProfiles = profilesRes.data || [];
      setProfiles(loadedProfiles);
      setSessions(sessionsRes.data || []);

      // Default to logged-in user if available
      if (authSession?.user?.id) {
        const p = loadedProfiles.find(p => p.id === authSession.user.id);
        if (p) setSelectedUserId(p.id);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const todayStart = getStartOfDayUTC(nowMs, 0).getTime();
  const todayEnd = getStartOfDayUTC(nowMs, 1).getTime();
  const yesterdayStart = getStartOfDayUTC(nowMs, -1).getTime();
  const yesterdayEnd = todayStart;

  if (loading) {
    return <div className="p-4 text-text-muted">Loading dashboard...</div>;
  }

  const renderTeamStats = () => {
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
        name: p.full_name || p.username || 'Unknown',
        todayMs,
        isWorking
      };
    });

    const diffMs = totalTodayMs - totalYesterdayMs;
    const diffSign = diffMs >= 0 ? '+' : '-';
    const diffFormatted = formatDuration(Math.abs(diffMs));

    const kolkataNow = getKolkataDate(nowMs);
    let dayOfWeek = kolkataNow.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const chartData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, i) => {
      const dayStartUTC = getStartOfDayUTC(nowMs, -adjustedDay + i).getTime();
      const dayEndUTC = getStartOfDayUTC(nowMs, -adjustedDay + i + 1).getTime();
      let dailyMs = 0;
      sessions.forEach(s => {
        dailyMs += getOverlapDurationMs(s.joined_at, s.left_at, dayStartUTC, dayEndUTC, nowMs);
      });
      return { day: dayName, hours: Number((dailyMs / 3600000).toFixed(1)) };
    });

    return (
      <div className="flex flex-col gap-6">
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
  };

  const renderMemberStats = () => {
    const profile = profiles.find(p => p.id === selectedUserId);
    if (!profile) return null;

    const userSessions = sessions.filter(s => s.discord_user_id === profile.discord_user_id);
    
    // Sort chronological for session-to-session comparison logic
    const chronologicalSessions = [...userSessions].sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at));

    // Calculate today's total
    let totalTodayMs = 0;
    let sessionsTodayCount = 0;
    let activeSessionMs = 0;

    userSessions.forEach(s => {
      const msToday = getOverlapDurationMs(s.joined_at, s.left_at, todayStart, todayEnd, nowMs);
      if (msToday > 0) {
        totalTodayMs += msToday;
        sessionsTodayCount++;
      }
      if (!s.left_at) {
        activeSessionMs = nowMs - new Date(s.joined_at).getTime();
      }
    });

    // Session-to-session comparison
    const hasAnySessions = chronologicalSessions.length > 0;
    const latestSession = hasAnySessions ? chronologicalSessions[chronologicalSessions.length - 1] : null;
    const prevSession = chronologicalSessions.length > 1 ? chronologicalSessions[chronologicalSessions.length - 2] : null;

    let comparisonSubtitle = 'No sessions recorded yet';
    let recentDurationFormatted = '0m';
    
    if (latestSession) {
      const getDuration = (s) => s.left_at ? new Date(s.left_at).getTime() - new Date(s.joined_at).getTime() : nowMs - new Date(s.joined_at).getTime();
      const latestDurMs = getDuration(latestSession);
      recentDurationFormatted = formatDuration(latestDurMs);

      const latestStartedToday = new Date(latestSession.joined_at).getTime() >= todayStart && new Date(latestSession.joined_at).getTime() < todayEnd;

      if (!prevSession) {
        comparisonSubtitle = 'First recorded session';
      } else {
        const prevDurMs = getDuration(prevSession);
        
        if (chronologicalSessions.length === 1 && latestStartedToday) {
          comparisonSubtitle = 'First session today'; // Technically caught by !prevSession, but handling requirement
        } else {
          // Compare
          const diff = latestDurMs - prevDurMs;
          if (diff > 60000) { // > 1 min
            comparisonSubtitle = `${formatDuration(diff)} longer than the previous session`;
          } else if (diff < -60000) {
            comparisonSubtitle = `${formatDuration(Math.abs(diff))} shorter than the previous session`;
          } else {
            comparisonSubtitle = `Same duration as the previous session`;
          }
        }
      }
    }

    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Today's Work Time" 
            value={totalTodayMs > 0 ? formatDuration(totalTodayMs) : '0m'} 
            icon={Clock} 
            subtitle={totalTodayMs === 0 ? 'No sessions recorded today' : `${sessionsTodayCount} session${sessionsTodayCount !== 1 ? 's' : ''} today`}
          />
          <StatCard 
            title="Current Active Session" 
            value={activeSessionMs > 0 ? formatDuration(activeSessionMs) : 'Offline'} 
            icon={Headphones} 
          />
          <StatCard 
            title="Latest Session Duration" 
            value={recentDurationFormatted} 
            icon={Activity} 
            subtitle={comparisonSubtitle}
          />
          <StatCard 
            title="Total Recorded Sessions" 
            value={chronologicalSessions.length.toString()} 
            icon={CalendarDays} 
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface border border-border p-4 rounded-xl">
        <div>
          <h2 className="text-lg font-medium text-text-main">Dashboard Overview</h2>
          <p className="text-sm text-text-muted">Monitor work sessions and team activity</p>
        </div>
        
        <div className="flex items-center gap-2">
          <User size={18} className="text-text-muted" />
          <select 
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="bg-background border border-border rounded-md px-3 py-1.5 text-sm text-text-main focus:outline-none focus:border-primary/50"
          >
            <option value="all">All Team</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.full_name || p.username || 'Unknown User'}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedUserId === 'all' ? renderTeamStats() : renderMemberStats()}
    </div>
  );
}
