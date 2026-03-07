'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, TrendingUp, Clock } from 'lucide-react';

interface EconomicEvent {
  date: string;
  time: string;
  event: string;
  importance: 'high' | 'medium' | 'low';
  forecast?: string;
  previous?: string;
  impact: string;
  countdown?: string;
}

interface EconomicCalendarProps {
  events?: EconomicEvent[];
  loading?: boolean;
}

/** Generate upcoming economic events dynamically from FOMC schedule */
function generateUpcomingEvents(fomcSchedule?: { date: string; type: string }[]): EconomicEvent[] {
  const now = new Date();
  const events: EconomicEvent[] = [];

  // FOMC meetings from API or fallback
  const schedule = fomcSchedule || [
    { date: '2026-01-28', type: 'Meeting' },
    { date: '2026-03-18', type: 'Meeting + SEP' },
    { date: '2026-05-06', type: 'Meeting' },
    { date: '2026-06-17', type: 'Meeting + SEP' },
    { date: '2026-07-29', type: 'Meeting' },
    { date: '2026-09-16', type: 'Meeting + SEP' },
    { date: '2026-11-04', type: 'Meeting' },
    { date: '2026-12-16', type: 'Meeting + SEP' },
  ];

  // Add upcoming FOMC meetings
  for (const meeting of schedule) {
    const meetingDate = new Date(meeting.date);
    if (meetingDate >= now) {
      const daysUntil = Math.ceil((meetingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const hoursUntil = Math.ceil((meetingDate.getTime() - now.getTime()) / (1000 * 60 * 60));
      events.push({
        date: meeting.date,
        time: '14:00 EST',
        event: meeting.type.includes('SEP') ? 'FOMC Rate Decision + Summary of Economic Projections' : 'FOMC Rate Decision',
        importance: 'high',
        forecast: '-',
        previous: '-',
        impact: 'Critical for crypto - rate cuts bullish, hikes bearish',
        countdown: daysUntil > 1 ? `${daysUntil}d` : `${hoursUntil}h`,
      });
    }
  }

  // Generate recurring economic events relative to current month
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  // CPI - typically released around 12th-14th of each month
  for (let m = month; m <= month + 2; m++) {
    const cpiDate = new Date(year, m, 13);
    if (cpiDate >= now) {
      const daysUntil = Math.ceil((cpiDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      events.push({
        date: cpiDate.toISOString().split('T')[0],
        time: '08:30 EST',
        event: 'U.S. CPI (Consumer Price Index)',
        importance: 'high',
        impact: 'High impact on Fed rate expectations and crypto volatility',
        countdown: `${daysUntil}d`,
      });
    }
  }

  // PPI - typically 1-2 days before CPI
  for (let m = month; m <= month + 2; m++) {
    const ppiDate = new Date(year, m, 11);
    if (ppiDate >= now) {
      const daysUntil = Math.ceil((ppiDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      events.push({
        date: ppiDate.toISOString().split('T')[0],
        time: '08:30 EST',
        event: 'U.S. PPI (Producer Price Index)',
        importance: 'medium',
        impact: 'Wholesale inflation - leading CPI indicator',
        countdown: `${daysUntil}d`,
      });
    }
  }

  // Jobless claims - every Thursday
  for (let i = 0; i < 4; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + ((4 - d.getDay() + 7) % 7) + (i * 7)); // next Thursday + i weeks
    if (d > now) {
      const daysUntil = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      events.push({
        date: d.toISOString().split('T')[0],
        time: '08:30 EST',
        event: 'Initial Jobless Claims',
        importance: 'medium',
        impact: 'Labor market strength indicator',
        countdown: `${daysUntil}d`,
      });
      break; // Only show next one
    }
  }

  // Sort by date and take first 6
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return events.slice(0, 6);
}

export function EconomicCalendar({ events, loading }: EconomicCalendarProps) {
  const [fomcSchedule, setFomcSchedule] = useState<{ date: string; type: string }[] | undefined>();

  useEffect(() => {
    fetch('/api/market/fed-indicators')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.fomcSchedule) setFomcSchedule(data.fomcSchedule);
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-[#1a1a2e]/40 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  const upcomingEvents: EconomicEvent[] = events || generateUpcomingEvents(fomcSchedule);

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high':
        return { bg: '#FF4757', text: '#FF4757' };
      case 'medium':
        return { bg: '#F7931A', text: '#F7931A' };
      case 'low':
        return { bg: '#3B82F6', text: '#3B82F6' };
      default:
        return { bg: '#e4e4e7', text: '#e4e4e7' };
    }
  };

  return (
    <div className="space-y-2">
      <div className="bg-gradient-to-r from-[#8B5CF6]/10 to-[#8B5CF6]/5 border border-[#8B5CF6]/20 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-3.5 h-3.5 text-[#8B5CF6]" />
          <span className="text-[10px] font-mono text-[#8B5CF6] uppercase">Economic Calendar</span>
        </div>
        <div className="text-[8px] text-[#e4e4e7]/60 leading-relaxed">
          Key macroeconomic events that historically impact crypto markets. High-importance events often trigger significant volatility.
        </div>
      </div>

      <div className="space-y-1.5">
        {upcomingEvents.map((event, idx) => {
          const colors = getImportanceColor(event.importance);
          const isNext = idx === 0;

          return (
            <div
              key={idx}
              className={`bg-[#0d0d14] border rounded-lg p-2.5 hover:border-[#F7931A]/30 transition-all ${
                isNext ? 'border-[#F7931A]/40 shadow-lg shadow-[#F7931A]/5' : 'border-[#1a1a2e]'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-2 flex-1">
                  <div
                    className="w-1 h-12 rounded-full mt-0.5"
                    style={{ backgroundColor: colors.bg }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold text-[#e4e4e7]">{event.event}</span>
                      {isNext && (
                        <span className="text-[7px] px-1.5 py-0.5 bg-[#F7931A]/20 text-[#F7931A] rounded uppercase font-bold">
                          Next
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[8px] text-[#e4e4e7]/50">
                      <span>{event.date}</span>
                      <span>•</span>
                      <span>{event.time}</span>
                      {event.countdown && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {event.countdown}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div
                  className="text-[7px] font-bold px-1.5 py-0.5 rounded uppercase"
                  style={{
                    backgroundColor: `${colors.bg}20`,
                    color: colors.text
                  }}
                >
                  {event.importance}
                </div>
              </div>

              {/* Forecast vs Previous */}
              {event.forecast && event.previous && event.forecast !== '-' && (
                <div className="grid grid-cols-2 gap-2 mb-2 pl-3">
                  <div>
                    <div className="text-[8px] text-[#e4e4e7]/40">Forecast</div>
                    <div className="text-[11px] font-bold text-[#3B82F6]">{event.forecast}</div>
                  </div>
                  <div>
                    <div className="text-[8px] text-[#e4e4e7]/40">Previous</div>
                    <div className="text-[11px] font-bold text-[#e4e4e7]/60">{event.previous}</div>
                  </div>
                </div>
              )}

              {/* Impact Description */}
              <div className="bg-[#1a1a2e]/30 rounded p-2 pl-3">
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-3 h-3 text-[#F7931A] mt-0.5 flex-shrink-0" />
                  <div className="text-[8px] text-[#e4e4e7]/70 leading-relaxed">
                    {event.impact}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Historical Context */}
      <div className="bg-gradient-to-r from-[#F7931A]/10 to-[#F7931A]/5 border border-[#F7931A]/20 rounded-lg p-3 mt-3">
        <div className="text-[9px] text-[#F7931A] font-mono uppercase mb-2 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          Historical Impact Patterns
        </div>
        <div className="space-y-1.5 text-[10px] text-[#e4e4e7]/70 leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="text-[#00D4AA] mt-0.5">▸</span>
            <span><strong>CPI below forecast:</strong> Historically bullish for BTC (+3-8% avg 24h)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#FF4757] mt-0.5">▸</span>
            <span><strong>Hawkish FOMC:</strong> Typically triggers sell-off (-5-12% avg 48h)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#F7931A] mt-0.5">▸</span>
            <span><strong>GDP beats:</strong> Mixed impact - risk-on positive but may delay rate cuts</span>
          </div>
        </div>
      </div>
    </div>
  );
}
