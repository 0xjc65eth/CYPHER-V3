'use client';

import React from 'react';
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

export function EconomicCalendar({ events, loading }: EconomicCalendarProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-[#1a1a2e]/40 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  const upcomingEvents: EconomicEvent[] = events || [
    {
      date: '2026-02-14',
      time: '08:30 EST',
      event: 'U.S. CPI (Consumer Price Index)',
      importance: 'high',
      forecast: '3.1%',
      previous: '3.2%',
      impact: 'High impact on Fed rate expectations and crypto volatility',
      countdown: '18h 45m'
    },
    {
      date: '2026-02-19',
      time: '14:00 EST',
      event: 'FOMC Meeting Minutes',
      importance: 'high',
      forecast: '-',
      previous: '-',
      impact: 'Reveals Fed members\' economic outlook and rate path',
      countdown: '5d 22h'
    },
    {
      date: '2026-02-21',
      time: '08:30 EST',
      event: 'Initial Jobless Claims',
      importance: 'medium',
      forecast: '215K',
      previous: '220K',
      impact: 'Labor market strength indicator',
      countdown: '7d 18h'
    },
    {
      date: '2026-02-26',
      time: '10:00 EST',
      event: 'U.S. GDP (Q4 Preliminary)',
      importance: 'high',
      forecast: '2.8%',
      previous: '2.6%',
      impact: 'Economic growth measurement affects risk appetite',
      countdown: '12d 20h'
    },
    {
      date: '2026-03-12',
      time: '08:30 EST',
      event: 'U.S. PPI (Producer Price Index)',
      importance: 'medium',
      forecast: '2.4%',
      previous: '2.5%',
      impact: 'Wholesale inflation - leading CPI indicator',
      countdown: '26d 18h'
    },
    {
      date: '2026-03-19-20',
      time: '14:00 EST',
      event: 'FOMC Rate Decision',
      importance: 'high',
      forecast: '5.25-5.50%',
      previous: '5.25-5.50%',
      impact: 'Critical for crypto - rate cuts bullish, hikes bearish',
      countdown: '33d 22h'
    }
  ];

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
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {event.countdown}
                      </span>
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
              {event.forecast && event.previous && (
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
