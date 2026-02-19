'use client';

import type { ElementType } from 'react';
import { Activity, Radio, Zap, Fish, Pause } from 'lucide-react';

function LiveIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
      </span>
      LIVE
    </span>
  );
}

function StatItem({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: ElementType;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon className={`h-3.5 w-3.5 text-gray-500 ${className ?? ''}`} />
      <span className="text-gray-500">{label}:</span>
      <span className={`font-mono font-semibold ${className ?? 'text-gray-200'}`}>{value}</span>
    </div>
  );
}

export function StatsBar({
  eventsPerMin,
  activeRunes,
  volumeBtc,
  whaleAlerts,
  isPaused,
}: {
  eventsPerMin: number;
  activeRunes: number;
  volumeBtc: number;
  whaleAlerts: number;
  isPaused: boolean;
}) {
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-4 rounded-lg border border-gray-700 bg-gray-900/95 px-4 py-2.5 backdrop-blur-sm">
      {isPaused ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-yellow-400">
          <Pause className="h-3 w-3" /> PAUSED
        </span>
      ) : (
        <LiveIndicator />
      )}
      <div className="h-4 w-px bg-gray-700" />
      <StatItem icon={Activity} label="Events/min" value={eventsPerMin.toString()} />
      <StatItem icon={Radio} label="Active Runes" value={activeRunes.toString()} />
      <StatItem icon={Zap} label="Vol (1h)" value={`${volumeBtc.toFixed(2)} BTC`} />
      <StatItem
        icon={Fish}
        label="Whale Alerts"
        value={whaleAlerts.toString()}
        className={whaleAlerts > 0 ? 'text-orange-400' : undefined}
      />
    </div>
  );
}
