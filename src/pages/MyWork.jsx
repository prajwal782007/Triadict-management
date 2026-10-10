import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User } from 'lucide-react';
import { getStartOfDayUTC, getOverlapDurationMs, formatDuration, formatTime, getKolkataDate } from '../lib/dateUtils';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MyWork({ session: authSession }) {
  const location = useLocation();
  const initialDateStr = location.state?.selectedDate || null;
  const initialUserId = location.state?.selectedUserId || '';

  const [profiles, setProfiles] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(initialUserId);
  
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (initialDateStr) {
       const [y, m] = initialDateStr.split('-');
       return new Date(parseInt(y), parseInt(m) - 1, 1);
    }
    const kolkataNow = getKolkataDate(Date.now());
    return new Date(kolkataNow.getFullYear(), kolkataNow.getMonth(), 1);
  });
  
  const [selectedDateStr, setSelectedDateStr] = useState(initialDateStr);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [profilesRes, sessionsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('voice_sessions').select('*').order('joined_at', { ascending: true })
      ]);
      
      const loadedProfiles = profilesRes.data || [];
      setProfiles(loadedProfiles);
      setSessions(sessionsRes.data || []);
      
      if (!initialUserId) {
        if (authSession?.user?.id) {
          const p = loadedProfiles.find(p => p.id === authSession.user.id);
          if (p) setSelectedUserId(p.id);
        } else if (loadedProfiles.length > 0) {
          setSelectedUserId(loadedProfiles[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const goToday = () => {
    const kolkataNow = getKolkataDate(Date.now());
    setCurrentMonth(new Date(kolkataNow.getFullYear(), kolkataNow.getMonth(), 1));
    setSelectedDateStr(null);
  };

  const selectedProfile = profiles.find(p => p.id === selectedUserId);
  const userSessions = selectedProfile ? sessions.filter(s => s.discord_user_id === selectedProfile.discord_user_id) : [];

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  // Pre-calculate daily totals for the selected user
  const dailyTotals = {};
  
  userSessions.forEach(session => {
    // A session can span multiple days. We iterate through the days it spans.
    const startMs = new Date(session.joined_at).getTime();
    const endMs = session.left_at ? new Date(session.left_at).getTime() : nowMs;
    
    // Start date in Kolkata
    const startDate = getKolkataDate(startMs);
    const endDate = getKolkataDate(endMs);
    
    let currentDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const finalDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    while (currentDay.getTime() <= finalDay.getTime()) {
      const dayStr = currentDay.toISOString().split('T')[0];
      const periodStartUTC = getStartOfDayUTC(currentDay.getTime(), 0).getTime();
      const periodEndUTC = getStartOfDayUTC(currentDay.getTime(), 1).getTime();
      
      const overlap = getOverlapDurationMs(session.joined_at, session.left_at, periodStartUTC, periodEndUTC, nowMs);
      
      if (overlap > 0) {
        if (!dailyTotals[dayStr]) dailyTotals[dayStr] = { durationMs: 0, sessions: [] };
        dailyTotals[dayStr].durationMs += overlap;
        
        // Don't add the same session twice to the array
        if (!dailyTotals[dayStr].sessions.find(s => s.id === session.id)) {
           dailyTotals[dayStr].sessions.push({ ...session, dayOverlap: overlap });
        }
      }
      currentDay.setDate(currentDay.getDate() + 1);
    }
  });

  const calendarDays = generateCalendarDays();
  const kolkataNow = getKolkataDate(Date.now());
  const todayStr = new Date(kolkataNow.getFullYear(), kolkataNow.getMonth(), kolkataNow.getDate()).toISOString().split('T')[0];

  const renderSessionDetails = () => {
    if (!selectedDateStr) return null;
    
    const dateObj = new Date(selectedDateStr);
    const formattedDate = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    const dayData = dailyTotals[selectedDateStr];

    return (
      <div className="bg-surface border border-border rounded-xl p-5 mt-6">
        <h3 className="text-xl font-semibold text-text-main mb-4">{formattedDate}</h3>
        
        {!dayData || dayData.sessions.length === 0 ? (
          <div className="text-text-muted py-8 text-center bg-background/50 rounded-lg border border-border border-dashed">
            No recorded work sessions for this date
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4 text-sm">
              <div className="px-3 py-1.5 bg-primary/10 text-primary rounded-md font-medium">
                Daily total: {formatDuration(dayData.durationMs)}
              </div>
              <div className="text-text-muted">
                {dayData.sessions.length} session{dayData.sessions.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            <div className="flex flex-col gap-4">
              {dayData.sessions.map((session, idx) => {
                const isActive = !session.left_at;
                const startTime = formatTime(session.joined_at);
                const endTime = isActive ? 'In progress' : formatTime(session.left_at);
                
                return (
                  <div key={session.id} className="p-4 rounded-lg border border-border bg-background relative overflow-hidden">
                    {isActive && <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>}
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-text-main">Session {idx + 1}</div>
                      {isActive ? (
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">Active</span>
                      ) : (
                        <span className="text-xs font-medium text-text-muted bg-surface px-2 py-0.5 rounded border border-border">Completed</span>
                      )}
                    </div>
                    <div className="text-sm text-text-muted mb-2">
                      {startTime} &ndash; {endTime}
                    </div>
                    <div className="text-sm font-medium text-text-main">
                      Duration: {formatDuration(session.dayOverlap)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="p-4 text-text-muted">Loading calendar...</div>;

  return (
    <div className="flex flex-col gap-6 h-full pb-6 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface border border-border p-4 rounded-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-background rounded-md text-primary">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h2 className="text-lg font-medium text-text-main">Work Calendar</h2>
            <p className="text-sm text-text-muted">Track your daily voice sessions</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <User size={18} className="text-text-muted" />
          <select 
            value={selectedUserId}
            onChange={(e) => {
              setSelectedUserId(e.target.value);
              setSelectedDateStr(null);
            }}
            className="bg-background border border-border rounded-md px-3 py-1.5 text-sm text-text-main focus:outline-none focus:border-primary/50"
          >
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.display_name || p.full_name || p.username || 'Unknown User'}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 flex flex-col shrink-0">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-text-main w-48">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={goToday} className="px-3 py-1.5 text-sm text-text-muted hover:text-text-main hover:bg-background rounded-md border border-border transition-colors mr-2">
              Today
            </button>
            <button onClick={prevMonth} className="p-1.5 text-text-muted hover:text-text-main hover:bg-background rounded-md border border-border transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button onClick={nextMonth} className="p-1.5 text-text-muted hover:text-text-main hover:bg-background rounded-md border border-border transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-3">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              {day}
            </div>
          ))}
          
          {calendarDays.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} className="min-h-[110px] rounded-xl bg-transparent"></div>;
            }
            
            const dateStr = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDateStr;
            const dayData = dailyTotals[dateStr];
            
            return (
              <div 
                key={dateStr}
                onClick={() => setSelectedDateStr(dateStr)}
                className={`min-h-[110px] p-3 flex flex-col cursor-pointer transition-all duration-200 border rounded-xl shadow-sm relative overflow-hidden
                  ${isSelected ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-surface bg-surface z-10 shadow-md scale-[1.02]' : 'border-border bg-surface hover:border-primary/50 hover:shadow-md hover:-translate-y-1'}
                `}
              >
                {/* 3D top edge highlight */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50"></div>
                
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <span className={`text-sm font-semibold w-8 h-8 flex items-center justify-center rounded-full shadow-sm
                    ${isToday ? 'bg-primary text-white shadow-primary/40' : 'bg-background text-text-main border border-border'}
                  `}>
                    {date.getDate()}
                  </span>
                </div>
                
                {dayData && dayData.durationMs > 0 && (
                  <div className="mt-auto relative z-10">
                    <div className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-1.5 rounded-lg truncate text-center shadow-inner">
                      {formatDuration(dayData.durationMs)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {renderSessionDetails()}
    </div>
  );
}
