'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, Bell, Clock, TrendingUp } from 'lucide-react';

interface EconomicEvent {
  date: string;
  time: string;
  event: string;
  country: string;
  actual?: string;
  forecast?: string;
  previous?: string;
  impact: 'high' | 'medium' | 'low';
  category: string;
}

interface EconomicCalendarProProps {
  refreshTrigger?: number;
}

/** Generate upcoming events dynamically based on current date */
function generateDynamicEvents(): EconomicEvent[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const events: EconomicEvent[] = [];

  // FOMC schedule 2026
  const fomcDates = [
    '2026-01-28', '2026-03-18', '2026-05-06', '2026-06-17',
    '2026-07-29', '2026-09-16', '2026-11-04', '2026-12-16',
  ];
  for (const dateStr of fomcDates) {
    const d = new Date(dateStr);
    if (d >= now && d.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000) {
      events.push({
        date: dateStr,
        time: '14:00',
        event: 'FOMC Rate Decision',
        country: 'USD',
        impact: 'high',
        category: 'fed',
      });
    }
  }

  // Generate recurring events for the next 2 weeks
  for (let m = month; m <= month + 1; m++) {
    const actualMonth = m % 12;
    const actualYear = year + Math.floor(m / 12);

    // CPI (~13th of each month)
    const cpiDate = new Date(actualYear, actualMonth, 13);
    if (cpiDate >= now && cpiDate.getTime() - now.getTime() < 21 * 24 * 60 * 60 * 1000) {
      events.push({
        date: cpiDate.toISOString().split('T')[0],
        time: '08:30',
        event: 'CPI m/m',
        country: 'USD',
        impact: 'high',
        category: 'inflation',
      });
    }

    // PPI (~11th)
    const ppiDate = new Date(actualYear, actualMonth, 11);
    if (ppiDate >= now && ppiDate.getTime() - now.getTime() < 21 * 24 * 60 * 60 * 1000) {
      events.push({
        date: ppiDate.toISOString().split('T')[0],
        time: '08:30',
        event: 'PPI m/m',
        country: 'USD',
        impact: 'medium',
        category: 'inflation',
      });
    }

    // Retail Sales (~15th)
    const retailDate = new Date(actualYear, actualMonth, 15);
    if (retailDate >= now && retailDate.getTime() - now.getTime() < 21 * 24 * 60 * 60 * 1000) {
      events.push({
        date: retailDate.toISOString().split('T')[0],
        time: '08:30',
        event: 'Core Retail Sales m/m',
        country: 'USD',
        impact: 'medium',
        category: 'gdp',
      });
    }
  }

  // Jobless claims - every Thursday for next 2 weeks
  for (let i = 0; i < 2; i++) {
    const d = new Date(now);
    const daysUntilThursday = (4 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilThursday + (i * 7));
    events.push({
      date: d.toISOString().split('T')[0],
      time: '08:30',
      event: 'Unemployment Claims',
      country: 'USD',
      impact: 'medium',
      category: 'employment',
    });
  }

  // Sort by date
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return events;
}

export function EconomicCalendarPro({ refreshTrigger = 0 }: EconomicCalendarProProps) {
  const [selectedImpact, setSelectedImpact] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'fed' | 'employment' | 'inflation' | 'gdp'>('all');
  const [events, setEvents] = useState<EconomicEvent[]>([]);

  useEffect(() => {
    setEvents(generateDynamicEvents());
  }, [refreshTrigger]);

  const filteredEvents = events.filter(event => {
    if (selectedImpact !== 'all' && event.impact !== selectedImpact) return false;
    if (selectedCategory !== 'all' && event.category !== selectedCategory) return false;
    return true;
  });

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-[#ff3366]';
      case 'medium': return 'text-[#ffcc00]';
      case 'low': return 'text-[#00ff88]';
      default: return 'text-[#e4e4e7]/60';
    }
  };

  const getImpactBg = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-[#ff3366]/20 border-[#ff3366]/40';
      case 'medium': return 'bg-[#ffcc00]/20 border-[#ffcc00]/40';
      case 'low': return 'bg-[#00ff88]/20 border-[#00ff88]/40';
      default: return 'bg-[#1a1a2e]/30 border-[#2a2a3e]';
    }
  };

  const groupedByDate = filteredEvents.reduce((acc, event) => {
    if (!acc[event.date]) acc[event.date] = [];
    acc[event.date].push(event);
    return acc;
  }, {} as Record<string, EconomicEvent[]>);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold text-[#e4e4e7]/60 tracking-widest uppercase font-mono">
            Economic Calendar
          </h3>
          <Calendar className="w-4 h-4 text-[#F7931A]" />
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Impact Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#e4e4e7]/40 font-mono">IMPACT:</span>
            <div className="flex gap-1">
              {(['all', 'high', 'medium', 'low'] as const).map((impact) => (
                <button
                  key={impact}
                  onClick={() => setSelectedImpact(impact)}
                  className={`px-2 py-1 text-[10px] font-mono rounded transition-all ${
                    selectedImpact === impact
                      ? 'bg-[#F7931A] text-black font-bold'
                      : 'bg-[#1a1a2e] text-[#e4e4e7]/60 hover:text-[#e4e4e7]'
                  }`}
                >
                  {impact.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#e4e4e7]/40 font-mono">CATEGORY:</span>
            <div className="flex gap-1">
              {(['all', 'fed', 'employment', 'inflation', 'gdp'] as const).map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-2 py-1 text-[10px] font-mono rounded transition-all ${
                    selectedCategory === category
                      ? 'bg-[#F7931A] text-black font-bold'
                      : 'bg-[#1a1a2e] text-[#e4e4e7]/60 hover:text-[#e4e4e7]'
                  }`}
                >
                  {category.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Events by Date */}
      {Object.entries(groupedByDate).length === 0 ? (
        <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-[#e4e4e7]/40" />
          <div className="text-sm text-[#e4e4e7]/60">No events match your filters</div>
        </div>
      ) : (
        Object.entries(groupedByDate).map(([date, dateEvents]) => (
          <div key={date} className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-lg overflow-hidden">
            {/* Date Header */}
            <div className="bg-[#1a1a2e]/30 px-4 py-2 border-b border-[#1a1a2e]">
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3 text-[#F7931A]" />
                <span className="text-xs font-bold text-[#e4e4e7] font-mono">
                  {formatDate(date)}
                </span>
                <span className="text-[10px] text-[#e4e4e7]/40">
                  ({dateEvents.length} event{dateEvents.length !== 1 ? 's' : ''})
                </span>
              </div>
            </div>

            {/* Events */}
            <div className="divide-y divide-[#1a1a2e]/30">
              {dateEvents.map((event, i) => (
                <div key={i} className={`p-4 border-l-2 ${getImpactBg(event.impact)}`}>
                  <div className="flex items-start justify-between gap-4">
                    {/* Event Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-[#e4e4e7]/40" />
                          <span className="text-xs text-[#e4e4e7]/60 font-mono">
                            {event.time}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-[#e4e4e7]/40 font-mono">
                          {event.country}
                        </span>
                        <span className={`text-[10px] font-bold ${getImpactColor(event.impact)} uppercase`}>
                          {event.impact}
                        </span>
                      </div>

                      <div className="text-sm font-bold text-[#e4e4e7] mb-1">
                        {event.event}
                      </div>

                      {/* Data */}
                      {(event.forecast || event.previous || event.actual) && (
                        <div className="flex items-center gap-4 text-xs mt-2">
                          {event.actual && (
                            <div>
                              <span className="text-[#e4e4e7]/40">Actual: </span>
                              <span className="text-[#F7931A] font-mono font-bold">
                                {event.actual}
                              </span>
                            </div>
                          )}
                          {event.forecast && (
                            <div>
                              <span className="text-[#e4e4e7]/40">Forecast: </span>
                              <span className="text-[#e4e4e7]/80 font-mono">
                                {event.forecast}
                              </span>
                            </div>
                          )}
                          {event.previous && (
                            <div>
                              <span className="text-[#e4e4e7]/40">Previous: </span>
                              <span className="text-[#e4e4e7]/60 font-mono">
                                {event.previous}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Impact Badge */}
                    <div className="flex-shrink-0">
                      {event.impact === 'high' && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-[#ff3366]/20 rounded">
                          <Bell className="w-3 h-3 text-[#ff3366]" />
                          <span className="text-[9px] text-[#ff3366] font-bold uppercase">
                            High Impact
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Info Box */}
      <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-lg p-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-[#F7931A] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-[#e4e4e7]/60 leading-relaxed">
            <div className="font-bold text-[#e4e4e7] mb-1">Impact on Bitcoin Markets</div>
            <span className="text-[#ff3366]">High impact</span> events (CPI, FOMC, Fed speeches) typically cause significant volatility.
            <span className="text-[#ffcc00]"> Medium impact</span> events can move markets moderately.
            <span className="text-[#00ff88]"> Low impact</span> events usually have minimal effect.
          </div>
        </div>
      </div>
    </div>
  );
}
