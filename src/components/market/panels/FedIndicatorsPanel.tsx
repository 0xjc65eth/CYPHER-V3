'use client';

import React from 'react';
import { Landmark, Clock, ChevronRight } from 'lucide-react';

interface FOMCMeeting {
  date: string;
  type: string;
}

interface FedDecision {
  date: string;
  action: string;
  rate: number | string;
}

export interface FedData {
  currentRate: number | string;
  nextMeeting: {
    date: string;
    type: string;
    daysUntil: number;
  };
  yieldCurveInverted: boolean;
  yieldSpread2s10s: number;
  recentDecisions: FedDecision[];
  fomcSchedule: FOMCMeeting[];
}

interface FedIndicatorsPanelProps {
  data: FedData | null;
  loading: boolean;
  error?: string | null;
}

function actionColor(action: string): string {
  const a = action.toLowerCase();
  if (a.includes('cut') || a.includes('lower') || a.includes('ease')) return 'text-[#00ff88]';
  if (a.includes('hike') || a.includes('raise') || a.includes('tighten')) return 'text-[#ff3366]';
  return 'text-[#e4e4e7]/60';
}

function isPast(dateStr: string): boolean {
  return new Date(dateStr).getTime() < Date.now();
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function SkeletonContent() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-10 w-24 bg-[#2a2a3e]/50 rounded mx-auto" />
      <div className="h-6 w-full bg-[#2a2a3e]/40 rounded" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-5 bg-[#2a2a3e]/30 rounded" />
        ))}
      </div>
      <div className="h-8 bg-[#2a2a3e]/30 rounded" />
    </div>
  );
}

export function FedIndicatorsPanel({ data, loading, error }: FedIndicatorsPanelProps) {
  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Landmark className="w-3.5 h-3.5 text-[#F7931A]" />
        <span className="text-[11px] font-bold text-[#e4e4e7] font-mono tracking-wider uppercase">
          Fed &amp; FOMC
        </span>
      </div>

      {loading ? (
        <SkeletonContent />
      ) : error ? (
        <div className="py-6 text-center text-[10px] text-[#ff3366] font-mono">{error}</div>
      ) : !data ? (
        <div className="py-6 text-center text-[10px] text-[#e4e4e7]/30 font-mono">
          No data available
        </div>
      ) : (
        <div className="space-y-4">
          {/* Current Rate */}
          <div className="text-center py-2 bg-[#0a0a0f] rounded border border-[#2a2a3e]/50">
            <div className="text-[9px] text-[#e4e4e7]/40 font-mono uppercase mb-1">
              Current Fed Funds Rate
            </div>
            <div className="text-2xl font-bold text-[#F7931A] font-mono">
              {typeof data.currentRate === 'number'
                ? `${data.currentRate.toFixed(2)}%`
                : `${data.currentRate}%`}
            </div>
          </div>

          {/* Next Meeting */}
          <div className="bg-[#0a0a0f] rounded border border-[#2a2a3e]/50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[9px] text-[#e4e4e7]/40 font-mono uppercase mb-0.5">
                  Next Meeting
                </div>
                <div
                  className={`text-xs font-bold font-mono text-[#e4e4e7] ${
                    data.nextMeeting.daysUntil <= 7 ? 'animate-pulse' : ''
                  }`}
                >
                  {formatShortDate(data.nextMeeting.date)}
                </div>
                <div className="text-[9px] text-[#e4e4e7]/30 font-mono">
                  {data.nextMeeting.type}
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-[#F7931A]/10 px-2.5 py-1.5 rounded">
                <Clock className="w-3 h-3 text-[#F7931A]" />
                <span className="text-xs font-bold text-[#F7931A] font-mono">
                  {data.nextMeeting.daysUntil}d
                </span>
              </div>
            </div>
          </div>

          {/* Recent Decisions */}
          <div>
            <div className="text-[9px] text-[#e4e4e7]/40 font-mono uppercase mb-1.5">
              Recent Decisions
            </div>
            <div className="space-y-1">
              {(data.recentDecisions || []).slice(0, 4).map((decision, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-[#0a0a0f] rounded px-2.5 py-1.5 border border-[#2a2a3e]/30"
                >
                  <span className="text-[10px] font-mono text-[#e4e4e7]/40">
                    {formatShortDate(decision.date)}
                  </span>
                  <span className={`text-[10px] font-mono font-semibold ${actionColor(decision.action)}`}>
                    {decision.action}
                  </span>
                  <span className="text-[10px] font-mono text-[#e4e4e7]/60">
                    {typeof decision.rate === 'number'
                      ? `${decision.rate.toFixed(2)}%`
                      : `${decision.rate}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* FOMC 2026 Schedule Timeline */}
          {data.fomcSchedule && data.fomcSchedule.length > 0 && (
            <div>
              <div className="text-[9px] text-[#e4e4e7]/40 font-mono uppercase mb-2">
                FOMC 2026 Schedule
              </div>
              <div className="relative">
                {/* Horizontal line */}
                <div className="absolute top-[7px] left-2 right-2 h-[1px] bg-[#2a2a3e]" />

                {/* Meeting dots */}
                <div className="flex items-start justify-between px-1 relative">
                  {data.fomcSchedule.map((meeting, i) => {
                    const past = isPast(meeting.date);
                    const isSEP = meeting.type?.toUpperCase().includes('SEP') ||
                      meeting.type?.toUpperCase().includes('PROJECTION');
                    // Find if this is the next upcoming meeting
                    const isNext =
                      !past &&
                      (i === 0 || isPast(data.fomcSchedule[i - 1]?.date));

                    return (
                      <div key={i} className="flex flex-col items-center min-w-0" title={`${meeting.date} - ${meeting.type}`}>
                        <div
                          className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                            isNext
                              ? 'border-[#F7931A] bg-[#F7931A] animate-pulse shadow-[0_0_6px_rgba(247,147,26,0.5)]'
                              : past
                              ? 'border-[#2a2a3e] bg-[#2a2a3e]/50'
                              : 'border-[#e4e4e7]/20 bg-[#0a0a0f]'
                          }`}
                        >
                          {isSEP && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-1 h-1 rounded-full bg-[#F7931A]" />
                            </div>
                          )}
                        </div>
                        <span
                          className={`text-[7px] font-mono mt-1 ${
                            isNext
                              ? 'text-[#F7931A] font-bold'
                              : past
                              ? 'text-[#e4e4e7]/15'
                              : 'text-[#e4e4e7]/30'
                          }`}
                        >
                          {formatShortDate(meeting.date)}
                        </span>
                        {isSEP && (
                          <span className="text-[6px] font-mono text-[#F7931A]/60">SEP</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
