'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useFearGreedIndex } from '@/hooks/useFearGreedIndex';

const LABELS = ['Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed'];
const LABEL_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

function valueToAngle(value: number): number {
  // 0 = -90deg (left), 100 = 90deg (right) mapped to SVG arc
  return -90 + (value / 100) * 180;
}

export function FearGreedGauge() {
  const { index, label, loading } = useFearGreedIndex();

  const needleAngle = valueToAngle(index);

  // Arc parameters
  const cx = 100;
  const cy = 95;
  const r = 70;

  // Build arc path (semicircle from left to right)
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <div className="bg-[#12121a] border border-[#2a2a3e] rounded-lg p-4">
      <h4 className="text-xs font-bold text-[#e4e4e7] font-mono mb-2 tracking-wider">FEAR & GREED INDEX</h4>
      <div className="flex flex-col items-center">
        <svg width="200" height="120" viewBox="0 0 200 120">
          <defs>
            <linearGradient id="fgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#84cc16" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>

          {/* Background arc track */}
          <path
            d={arcPath}
            fill="none"
            stroke="#1f2937"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Colored arc */}
          <path
            d={arcPath}
            fill="none"
            stroke="url(#fgGradient)"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Tick labels */}
          {[0, 25, 50, 75, 100].map((val, i) => {
            const angle = ((val / 100) * 180 - 180) * (Math.PI / 180);
            const lx = cx + (r + 14) * Math.cos(angle);
            const ly = cy + (r + 14) * Math.sin(angle);
            return (
              <text
                key={val}
                x={lx}
                y={ly}
                textAnchor="middle"
                fill="#9ca3af"
                fontSize="7"
                fontFamily="monospace"
              >
                {val}
              </text>
            );
          })}

          {/* Needle */}
          <motion.line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - r + 16}
            stroke="#f97316"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ originX: `${cx}px`, originY: `${cy}px` }}
            initial={{ rotate: -90 }}
            animate={{ rotate: loading ? -90 : needleAngle }}
            transition={{ type: 'spring', stiffness: 60, damping: 15 }}
          />

          {/* Center dot */}
          <circle cx={cx} cy={cy} r="4" fill="#f97316" />

          {/* Center value */}
          <text
            x={cx}
            y={cy + 20}
            textAnchor="middle"
            fill="#f97316"
            fontSize="20"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {loading ? '--' : index}
          </text>
        </svg>

        {/* Label */}
        <div
          className="text-xs font-mono font-bold mt-1"
          style={{
            color:
              index < 25 ? '#ef4444' :
              index < 45 ? '#f97316' :
              index < 55 ? '#eab308' :
              index < 75 ? '#84cc16' :
              '#22c55e',
          }}
        >
          {loading ? 'LOADING...' : label.toUpperCase()}
        </div>
      </div>
    </div>
  );
}
