import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Activity, FileSpreadsheet, FileJson, Award, Users } from 'lucide-react';

// Pure monochromatic theme tokens
const MONO_SHADES = ['#FFFFFF', '#D4D4D8', '#A1A1AA', '#71717A', '#52525B', '#3F3F46', '#27272A'];

// Custom Monochromatic Glass Tooltip
const MonoCustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(10, 10, 12, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        padding: '0.65rem 0.9rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)',
        fontSize: '0.8rem',
        color: '#FFFFFF'
      }}>
        <div style={{ color: '#A1A1AA', fontWeight: '600', marginBottom: '0.35rem', fontFamily: 'monospace' }}>
          {label}
        </div>
        {payload.map((entry, idx) => (
          <div key={`item-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginTop: '0.2rem' }}>
            <span style={{ color: '#D4D4D8', textTransform: 'capitalize' }}>{entry.name || 'Count'}:</span>
            <span style={{ fontWeight: '700', color: '#FFFFFF' }}>{entry.value} {unit}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminAnalytics({
  events = [],
  participants = [],
  registrations = [],
  arrivalCheckins = [],
  eventAttendance = []
}) {
  const [activeBarMetric, setActiveBarMetric] = useState('events'); // 'events', 'registrations', 'checkins'

  // 1. Comprehensive Event Rankings (Ranked by Highest Participants Count)
  const eventRankings = useMemo(() => {
    return events.map(ev => {
      const count = registrations.filter(r => 
        r.event_id === ev.id || 
        r.event_code === ev.event_code || 
        r.events?.event_code === ev.event_code || 
        r.events?.id === ev.id
      ).length;
      
      const cleanName = (ev.name || ev.label || ev.event_code || 'Event')
        .replace(/\(.*?\)/g, '')
        .trim();

      return {
        id: ev.id,
        name: ev.name || ev.label || ev.event_code,
        shortName: cleanName.length > 15 ? cleanName.substring(0, 14) + '…' : cleanName,
        code: ev.event_code,
        category: ev.category || 'TECHNICAL',
        type: ev.registration_type || 'individual',
        participants: count,
        capacity: ev.capacity || 60
      };
    }).sort((a, b) => b.participants - a.participants);
  }, [events, registrations]);

  // Top event with the highest participant count
  const topEvent = useMemo(() => {
    return eventRankings.length > 0 ? eventRankings[0] : null;
  }, [eventRankings]);

  // 2. Time-series Daily Breakdown (computed or populated with recent dates)
  const dailyBreakdown = useMemo(() => {
    const daysMap = {};
    const today = new Date();
    // Pre-populate last 10 days
    for (let i = 9; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      daysMap[key] = { date: key, label, registrations: 0, checkins: 0 };
    }

    // Tally real registrations
    registrations.forEach(r => {
      const dStr = r.registered_at ? r.registered_at.split('T')[0] : (r.created_at ? r.created_at.split('T')[0] : null);
      if (dStr && daysMap[dStr]) {
        daysMap[dStr].registrations += 1;
      }
    });

    // Tally arrivals
    arrivalCheckins.forEach(a => {
      const dStr = a.checked_in_at ? a.checked_in_at.split('T')[0] : null;
      if (dStr && daysMap[dStr]) {
        daysMap[dStr].checkins += 1;
      }
    });

    return Object.values(daysMap);
  }, [registrations, arrivalCheckins]);

  // Dynamic Bar Chart dataset depending on active toggle
  const currentBarData = useMemo(() => {
    if (activeBarMetric === 'events') {
      return eventRankings.map(ev => ({
        label: ev.shortName,
        value: ev.participants,
        name: ev.name
      }));
    }
    return dailyBreakdown.map(d => ({
      label: d.label,
      value: activeBarMetric === 'registrations' ? d.registrations : d.checkins,
      name: d.date
    }));
  }, [activeBarMetric, eventRankings, dailyBreakdown]);

  // 3. Line Chart: Velocity / Trend (cumulative growth)
  const lineChartData = useMemo(() => {
    let running = 0;
    return dailyBreakdown.map(item => {
      running += item.registrations;
      return {
        date: item.label,
        total: running,
        velocity: item.registrations
      };
    });
  }, [dailyBreakdown]);

  // 4. Category & Solo vs Team Ratio (Pie Chart)
  const pieData = useMemo(() => {
    const counts = {};
    events.forEach(ev => {
      const typeKey = ev.registration_type === 'team' ? 'Team Event' : 'Solo Event';
      counts[typeKey] = (counts[typeKey] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [events]);

  // 5. Radar Chart: Visualizing Which Event Has the Highest Participants
  const radarData = useMemo(() => {
    if (!eventRankings || eventRankings.length === 0) return [];
    const maxVal = Math.max(...eventRankings.map(e => e.participants), 5);
    return eventRankings.slice(0, 8).map(ev => ({
      subject: ev.shortName,
      name: ev.name,
      participants: ev.participants,
      fullMark: maxVal + 1
    }));
  }, [eventRankings]);

  // Export Analytics Summary CSV with full Event Participant Leaderboard
  const handleExportAnalyticsCSV = () => {
    const headers = ['Event_Name', 'Event_Code', 'Category', 'Registration_Type', 'Participants_Registered', 'Venue_Capacity'];
    const rows = eventRankings.map(ev => `"${ev.name}","${ev.code}","${ev.category}","${ev.type}",${ev.participants},${ev.capacity}`);
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `srishti_2.7_event_participants_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Complete Analytics JSON
  const handleExportAnalyticsJSON = () => {
    const dataReport = {
      festival: 'SRISHTI 2.7 National Tech-Cultural Fest',
      generated_at: new Date().toISOString(),
      summary: {
        total_events: events.length,
        total_participants: participants.length,
        total_registrations: registrations.length,
        total_arrivals: arrivalCheckins.length,
        total_attendance: eventAttendance.length
      },
      top_performing_event: topEvent ? {
        name: topEvent.name,
        code: topEvent.code,
        participants: topEvent.participants
      } : null,
      event_participant_leaderboard: eventRankings,
      daily_trend: dailyBreakdown
    };
    const blob = new Blob([JSON.stringify(dataReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `srishti_2.7_analytics_report_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalMetric = useMemo(() => ({
    registrations: registrations.length || dailyBreakdown.reduce((acc, curr) => acc + curr.registrations, 0),
    checkins: arrivalCheckins.length || dailyBreakdown.reduce((acc, curr) => acc + curr.checkins, 0),
    events: events.length
  }), [registrations, arrivalCheckins, events, dailyBreakdown]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
      {/* Analytics Action Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '1.25rem 1.5rem',
        background: '#09090B',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Activity size={18} color="#FFFFFF" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              Intelligence &amp; Real-Time Analytics
            </h3>
          </div>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#71717A' }}>
            Live traffic, participant rankings per competition, and festival velocity metrics.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExportAnalyticsCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.95rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
          >
            <FileSpreadsheet size={15} />
            <span>Download CSV Data</span>
          </button>

          <button
            type="button"
            onClick={handleExportAnalyticsJSON}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.95rem',
              background: '#FFFFFF',
              border: '1px solid #FFFFFF',
              borderRadius: '8px',
              color: '#000000',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.filter = 'brightness(0.9)'; }}
            onMouseOut={(e) => { e.currentTarget.style.filter = 'none'; }}
          >
            <FileJson size={15} />
            <span>Export Report (JSON)</span>
          </button>
        </div>
      </div>

      {/* 2x2 Grid of Monochromatic Charts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* CHART 1: Interactive Bar Chart (Supports By Event / Highest Participants) */}
        <div style={{
          background: '#09090B',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Card Header with Interactive Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '1.25rem 1.5rem',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#FFFFFF' }}>
                Activity Volume — Interactive
              </h4>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#71717A' }}>
                {activeBarMetric === 'events' ? 'Showing participants enrolled per competition' : 'Showing delegate inflow volume over recent days'}
              </p>
            </div>

            <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '0.2rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              {[
                { key: 'events', label: 'By Event', total: totalMetric.events },
                { key: 'registrations', label: 'Registrations', total: totalMetric.registrations },
                { key: 'checkins', label: 'Gate Arrivals', total: totalMetric.checkins }
              ].map(btn => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => setActiveBarMetric(btn.key)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: activeBarMetric === btn.key ? '#FFFFFF' : 'transparent',
                    color: activeBarMetric === btn.key ? '#000000' : '#A1A1AA',
                    fontSize: '0.75rem',
                    fontWeight: activeBarMetric === btn.key ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {btn.label}: {btn.total.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Chart Canvas */}
          <div style={{ padding: '1.5rem 1.25rem 1rem 0.5rem', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentBarData} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(255, 255, 255, 0.06)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                  tick={{ fill: '#71717A', fontSize: 11 }}
                  interval={0}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#71717A', fontSize: 11 }}
                  width={35}
                />
                <Tooltip content={<MonoCustomTooltip unit={activeBarMetric === 'events' ? 'participants' : 'delegates'} />} />
                <Bar
                  dataKey="value"
                  fill="#FFFFFF"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Line Chart (Cumulative Velocity) */}
        <div style={{
          background: '#09090B',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#FFFFFF' }}>
              Cumulative Registration Velocity
            </h4>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#71717A' }}>
              Day-over-day growth trajectory curve
            </p>
          </div>

          <div style={{ height: '220px', margin: '0 -0.5rem 0.75rem -0.5rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(255, 255, 255, 0.06)" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                  tick={{ fill: '#71717A', fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#71717A', fontSize: 11 }}
                  width={35}
                />
                <Tooltip content={<MonoCustomTooltip unit="total" />} />
                <Line
                  dataKey="total"
                  type="natural"
                  stroke="#FFFFFF"
                  strokeWidth={2.5}
                  dot={{ fill: '#FFFFFF', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#FFFFFF', stroke: '#000000', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '0.85rem',
            marginTop: 'auto',
            fontSize: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#FFFFFF', fontWeight: '600' }}>
              <TrendingUp size={14} color="#FFFFFF" />
              <span>
                {registrations.length === 0 
                  ? '0 live registrations recorded' 
                  : `${registrations.length} live registrations recorded`}
              </span>
            </div>
            <span style={{ color: '#71717A' }}>Official SRISHTI 2.7 Trajectory</span>
          </div>
        </div>

        {/* CHART 3: Pie Chart (Solo vs Team Breakdown) */}
        <div style={{
          background: '#09090B',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#FFFFFF' }}>
              Event Participation Distribution
            </h4>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#71717A' }}>
              Breakdown of competitions by Solo vs Team delegation
            </p>
          </div>

          <div style={{ height: '220px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<MonoCustomTooltip unit="events" />} />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={42}
                  stroke="rgba(0, 0, 0, 0.8)"
                  strokeWidth={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={MONO_SHADES[index % MONO_SHADES.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '0.85rem',
            fontSize: '0.75rem'
          }}>
            {pieData.map((entry, idx) => (
              <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: MONO_SHADES[idx % MONO_SHADES.length] }} />
                <span style={{ color: '#D4D4D8' }}>{entry.name}: <strong style={{ color: '#FFFFFF' }}>{entry.value}</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* CHART 4: Radar Chart (Event Participation Leaderboard — Shows Which Event Has Highest Participants) */}
        <div style={{
          background: '#09090B',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#FFFFFF' }}>
                Event Participation Leaderboard
              </h4>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#71717A' }}>
                Showing participant volume per competition to identify highest turnout
              </p>
            </div>
            {topEvent && topEvent.participants > 0 && (
              <span style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <Award size={12} />
                <span>Top: {topEvent.shortName} ({topEvent.participants})</span>
              </span>
            )}
          </div>

          <div style={{ height: '220px', margin: '0.5rem 0' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255, 255, 255, 0.1)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#A1A1AA', fontSize: 10, fontWeight: 500 }}
                />
                <Tooltip content={<MonoCustomTooltip unit="participants" />} />
                <Radar
                  name="Participants"
                  dataKey="participants"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  fill="#FFFFFF"
                  fillOpacity={0.3}
                  dot={{ r: 4, fill: '#FFFFFF', stroke: '#000000', strokeWidth: 1.5 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '0.85rem',
            fontSize: '0.75rem',
            color: '#71717A',
            marginTop: 'auto'
          }}>
            <span style={{ color: '#FFFFFF', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <TrendingUp size={13} color="#FFFFFF" />
              <span>
                {topEvent && topEvent.participants > 0
                  ? `Highest Turnout: ${topEvent.name} (${topEvent.participants} registered)`
                  : 'No event registrations recorded yet'}
              </span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Users size={12} />
              <span>Total: {registrations.length} registrations</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
